package chat

import (
	"testing"
	"time"
)

type captureTransport struct{ events []Event }

func (c *captureTransport) Send(e Event) bool { c.events = append(c.events, e); return true }

func testHub() (*Hub, *captureTransport, *captureTransport, *captureTransport, string, string, string) {
	h := NewHub(Config{HeartbeatInterval: 100 * time.Millisecond, HeartbeatTimeout: 50 * time.Millisecond, RoomCapacity: 2, MessageSizeLimit: 20, HistorySize: 2, OutboundQueueLimit: 256})
	a, b, c := &captureTransport{}, &captureTransport{}, &captureTransport{}
	now := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	ac := h.Connect(a, "alice", now).ClientID
	bc := h.Connect(b, "bob", now).ClientID
	cc := h.Connect(c, "carol", now).ClientID
	return h, a, b, c, ac, bc, cc
}

func TestConnectJoinHistoryAndBroadcast(t *testing.T) {
	h, alice, bob, carol, a, b, _ := testHub()
	if alice.events[0]["type"] != "connected" {
		t.Fatalf("expected connected event")
	}
	h.Handle(a, Event{"type": "join", "requestId": "j1", "roomId": "general"}, time.Now())
	h.Handle(a, Event{"type": "message", "roomId": "general", "body": "one"}, time.Now())
	h.Handle(a, Event{"type": "message", "requestId": "m2", "roomId": "general", "body": "two"}, time.Now())
	h.Handle(a, Event{"type": "message", "roomId": "general", "body": "three"}, time.Now())
	h.Handle(b, Event{"type": "join", "requestId": "j2", "roomId": "general"}, time.Now())
	h.Handle(a, Event{"type": "message", "roomId": "general", "body": "live"}, time.Now())

	joined := lastOfType(t, bob.events, "joined")
	if joined["memberCount"].(int) != 2 {
		t.Fatalf("member count = %v", joined["memberCount"])
	}
	history := joined["history"].([]Message)
	if len(history) != 2 || history[0].Body != "two" || history[1].Body != "three" {
		t.Fatalf("history not bounded: %#v", history)
	}
	if lastOfType(t, bob.events, "message") == nil {
		t.Fatalf("bob did not get room replay/broadcast")
	}
	if hasType(carol.events, "message") {
		t.Fatalf("carol should not receive room message")
	}
}

func TestPrivateTypingErrorsLeaveAndHeartbeat(t *testing.T) {
	h, alice, bob, _, a, b, c := testHub()
	h.Handle(a, Event{"type": "join", "roomId": "general"}, time.Now())
	h.Handle(b, Event{"type": "join", "roomId": "general"}, time.Now())
	h.Handle(a, Event{"type": "private_message", "requestId": "p1", "toClientId": b, "body": "secret"}, time.Now())
	if !hasType(alice.events, "private_message_ack") || !hasType(bob.events, "private_message") {
		t.Fatalf("private message events missing")
	}
	h.Handle(a, Event{"type": "typing", "roomId": "general", "isTyping": true}, time.Now())
	if !hasType(bob.events, "typing") || hasTypingFrom(alice.events, a) {
		t.Fatalf("typing fanout wrong")
	}
	h.Handle(c, Event{"type": "message", "requestId": "bad", "roomId": "general", "body": "nope"}, time.Now())
	h.Handle(a, Event{"type": "leave", "requestId": "l1", "roomId": "general"}, time.Now())
	stale := h.DisconnectStale(time.Now().Add(time.Second))
	if len(stale) == 0 {
		t.Fatalf("expected stale clients")
	}
	metrics := h.Metrics()
	if metrics.HeartbeatTimeouts == 0 || metrics.RejectedEvents == 0 || metrics.ActiveRooms != 0 {
		t.Fatalf("unexpected metrics: %#v", metrics)
	}
}

func TestValidationCapacityHeartbeatAndMetricsBranches(t *testing.T) {
	h, alice, bob, carol, a, b, c := testHub()
	h.Handle("missing", Event{"type": "join", "roomId": "x"}, time.Now())
	h.Handle(a, Event{"requestId": "missing-type"}, time.Now())
	h.Handle(a, Event{"type": "join", "requestId": "bad-join"}, time.Now())
	h.Handle(a, Event{"type": "join", "roomId": "tiny"}, time.Now())
	h.Handle(a, Event{"type": "join", "roomId": "tiny"}, time.Now())
	h.Handle(b, Event{"type": "join", "roomId": "tiny"}, time.Now())
	h.Handle(c, Event{"type": "join", "requestId": "full", "roomId": "tiny"}, time.Now())
	h.Handle(a, Event{"type": "leave", "requestId": "not-in", "roomId": "other"}, time.Now())
	h.Handle(a, Event{"type": "message", "requestId": "bad-message", "roomId": "tiny"}, time.Now())
	h.Handle(a, Event{"type": "message", "requestId": "too-large", "roomId": "tiny", "body": "012345678901234567890"}, time.Now())
	h.Handle(a, Event{"type": "private_message", "requestId": "bad-private", "toClientId": ""}, time.Now())
	h.Handle(a, Event{"type": "private_message", "requestId": "offline", "toClientId": "client-404", "body": "x"}, time.Now())
	h.Handle(a, Event{"type": "typing", "roomId": "tiny"}, time.Now())
	h.Handle(c, Event{"type": "typing", "roomId": "tiny", "isTyping": true}, time.Now())
	h.Handle(a, Event{"type": "history", "requestId": "bad-history"}, time.Now())
	h.Handle(c, Event{"type": "history", "requestId": "not-member-history", "roomId": "tiny"}, time.Now())
	h.Handle(a, Event{"type": "history", "requestId": "limited-history", "roomId": "tiny", "limit": float64(0)}, time.Now())
	h.Handle(a, Event{"type": "pong"}, time.Now())
	h.Handle(a, Event{"type": "unknown"}, time.Now())
	if got := h.SendHeartbeat(time.Now()); len(got) != 3 {
		t.Fatalf("expected 3 heartbeat ids, got %d", len(got))
	}
	if !hasType(alice.events, "ping") || !hasType(bob.events, "ping") || !hasType(carol.events, "error") {
		t.Fatalf("expected heartbeat and validation events")
	}
	if metrics := h.Metrics(); metrics.RejectedEvents < 10 || metrics.ActiveRooms != 1 || metrics.RoomMemberships != 2 {
		t.Fatalf("unexpected metrics: %#v", metrics)
	}
}

func TestDefaultsDisconnectAndDroppedDelivery(t *testing.T) {
	h := NewHub(Config{})
	transport := &captureTransport{}
	client := h.Connect(transport, "abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnop", time.Now())
	if client.DisplayName == "" || len(client.DisplayName) != 64 {
		t.Fatalf("display name was not sanitized: %#v", client.DisplayName)
	}
	h.Handle(client.ClientID, Event{"type": "join", "roomId": "general"}, time.Now())
	h.Disconnect(client.ClientID, time.Now())
	h.Disconnect(client.ClientID, time.Now())
	if metrics := h.Metrics(); metrics.ActiveConnections != 0 || metrics.ActiveRooms != 0 {
		t.Fatalf("disconnect did not clean state: %#v", metrics)
	}

	dropHub := NewHub(Config{HeartbeatInterval: time.Millisecond, HeartbeatTimeout: time.Millisecond, RoomCapacity: 1, MessageSizeLimit: 1, HistorySize: 1, OutboundQueueLimit: 0})
	dropHub.Connect(&captureTransport{}, "drop", time.Now())
	if metrics := dropHub.Metrics(); metrics.DroppedSlowConsumers == 0 || metrics.MessagesDelivered != 0 {
		t.Fatalf("expected dropped slow consumer metric: %#v", metrics)
	}
}

func lastOfType(t *testing.T, events []Event, typ string) Event {
	t.Helper()
	for i := len(events) - 1; i >= 0; i-- {
		if events[i]["type"] == typ {
			return events[i]
		}
	}
	return nil
}
func hasType(events []Event, typ string) bool {
	for _, e := range events {
		if e["type"] == typ {
			return true
		}
	}
	return false
}
func hasTypingFrom(events []Event, clientID string) bool {
	for _, e := range events {
		if e["type"] == "typing" && e["clientId"] == clientID {
			return true
		}
	}
	return false
}
