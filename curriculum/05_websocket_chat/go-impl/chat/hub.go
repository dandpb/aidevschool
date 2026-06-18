package chat

import (
	"fmt"
	"sort"
	"sync"
	"time"
)

type clientState struct {
	clientID    string
	name        string
	connectedAt time.Time
	lastSeenAt  time.Time
	rooms       map[string]struct{}
	transport   Transport
	queueDepth  int
}

type roomState struct {
	roomID       string
	members      map[string]struct{}
	history      []Message
	createdAt    time.Time
	lastActiveAt time.Time
	sequence     int64
}

type Hub struct {
	mu           sync.Mutex
	config       Config
	clients      map[string]*clientState
	rooms        map[string]*roomState
	clientSeq    int64
	messageSeq   int64
	heartbeatSeq int64
	metrics      Metrics
}

func NewHub(config Config) *Hub {
	if config.HeartbeatInterval == 0 {
		config = DefaultConfig()
	}
	return &Hub{config: config, clients: map[string]*clientState{}, rooms: map[string]*roomState{}}
}

func (h *Hub) Connect(transport Transport, name string, now time.Time) ClientSnapshot {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.clientSeq++
	if len(name) > 64 {
		name = name[:64]
	}
	clientID := fmt.Sprintf("client-%d", h.clientSeq)
	c := &clientState{clientID: clientID, name: name, connectedAt: now, lastSeenAt: now, rooms: map[string]struct{}{}, transport: transport}
	h.clients[clientID] = c
	h.deliverLocked(c, Event{"type": "connected", "clientId": clientID, "heartbeatIntervalMs": h.config.HeartbeatInterval.Milliseconds(), "heartbeatTimeoutMs": h.config.HeartbeatTimeout.Milliseconds()})
	return h.snapshotLocked(c)
}

func (h *Hub) Handle(clientID string, event Event, now time.Time) {
	h.mu.Lock()
	defer h.mu.Unlock()
	c := h.clients[clientID]
	if c == nil {
		return
	}
	c.lastSeenAt = now
	typeValue, ok := event["type"].(string)
	reqID, _ := event["requestId"].(string)
	if !ok {
		h.rejectLocked(c, reqID, "invalid_message_format", "event must include type")
		return
	}
	switch typeValue {
	case "join":
		h.joinLocked(c, event, reqID, now)
	case "leave":
		h.leaveLocked(c, event, reqID, now)
	case "message":
		h.roomMessageLocked(c, event, reqID, now)
	case "private_message":
		h.privateMessageLocked(c, event, reqID, now)
	case "typing":
		h.typingLocked(c, event, now)
	case "history":
		h.historyLocked(c, event, reqID)
	case "pong":
		if _, ok := event["heartbeatId"].(string); !ok {
			h.rejectLocked(c, reqID, "invalid_message_format", "pong requires heartbeatId")
		}
	default:
		h.rejectLocked(c, reqID, "invalid_message_format", "unknown event type")
	}
}

func (h *Hub) Disconnect(clientID string, now time.Time) {
	h.mu.Lock()
	defer h.mu.Unlock()
	c := h.clients[clientID]
	if c == nil {
		return
	}
	rooms := make([]string, 0, len(c.rooms))
	for roomID := range c.rooms {
		rooms = append(rooms, roomID)
	}
	for _, roomID := range rooms {
		h.removeFromRoomLocked(c, roomID, now, true)
	}
	delete(h.clients, clientID)
}

func (h *Hub) SendHeartbeat(now time.Time) []string {
	h.mu.Lock()
	defer h.mu.Unlock()
	ids := []string{}
	for _, c := range h.clients {
		h.heartbeatSeq++
		heartbeatID := fmt.Sprintf("hb-%d", h.heartbeatSeq)
		ids = append(ids, heartbeatID)
		h.deliverLocked(c, Event{"type": "ping", "heartbeatId": heartbeatID, "sentAt": now.Format(time.RFC3339Nano)})
	}
	return ids
}

func (h *Hub) DisconnectStale(now time.Time) []string {
	h.mu.Lock()
	defer h.mu.Unlock()
	cutoff := h.config.HeartbeatInterval + h.config.HeartbeatTimeout
	stale := []string{}
	for _, c := range h.clients {
		if now.Sub(c.lastSeenAt) > cutoff {
			stale = append(stale, c.clientID)
		}
	}
	for _, id := range stale {
		h.metrics.HeartbeatTimeouts++
		if c := h.clients[id]; c != nil {
			rooms := make([]string, 0, len(c.rooms))
			for r := range c.rooms {
				rooms = append(rooms, r)
			}
			for _, r := range rooms {
				h.removeFromRoomLocked(c, r, now, true)
			}
			delete(h.clients, id)
		}
	}
	return stale
}

func (h *Hub) Metrics() Metrics {
	h.mu.Lock()
	defer h.mu.Unlock()
	m := h.metrics
	m.ActiveConnections = len(h.clients)
	m.ActiveRooms = len(h.rooms)
	for _, room := range h.rooms {
		m.RoomMemberships += len(room.members)
	}
	return m
}

func (h *Hub) joinLocked(c *clientState, e Event, reqID string, now time.Time) {
	roomID, ok := e["roomId"].(string)
	if !ok || !validRoomID(roomID) {
		h.rejectLocked(c, reqID, "invalid_message_format", "join requires roomId")
		return
	}
	room := h.roomLocked(roomID, now)
	if _, exists := room.members[c.clientID]; !exists && len(room.members) >= h.config.RoomCapacity {
		h.rejectLocked(c, reqID, "room_full", "room is full")
		return
	}
	room.members[c.clientID] = struct{}{}
	c.rooms[roomID] = struct{}{}
	room.lastActiveAt = now
	h.deliverLocked(c, Event{"type": "joined", "requestId": reqID, "roomId": roomID, "memberCount": len(room.members), "history": append([]Message(nil), room.history...)})
	h.broadcastLocked(roomID, Event{"type": "presence", "roomId": roomID, "clientId": c.clientID, "status": "online", "at": now.Format(time.RFC3339Nano)}, "")
}

func (h *Hub) leaveLocked(c *clientState, e Event, reqID string, now time.Time) {
	roomID, ok := e["roomId"].(string)
	if !ok || !validRoomID(roomID) {
		h.rejectLocked(c, reqID, "invalid_message_format", "leave requires roomId")
		return
	}
	if _, ok := c.rooms[roomID]; !ok {
		h.rejectLocked(c, reqID, "not_in_room", "client is not in room")
		return
	}
	h.removeFromRoomLocked(c, roomID, now, true)
	h.deliverLocked(c, Event{"type": "left", "requestId": reqID, "roomId": roomID})
}

func (h *Hub) roomMessageLocked(c *clientState, e Event, reqID string, now time.Time) {
	roomID, ok1 := e["roomId"].(string)
	body, ok2 := e["body"].(string)
	if !ok1 || !ok2 || !validRoomID(roomID) || body == "" {
		h.rejectLocked(c, reqID, "invalid_message_format", "message requires roomId and body")
		return
	}
	if len(body) > h.config.MessageSizeLimit {
		h.rejectLocked(c, reqID, "message_too_large", "message body exceeds limit")
		return
	}
	room := h.rooms[roomID]
	if room == nil {
		h.rejectLocked(c, reqID, "not_in_room", "client is not in room")
		return
	}
	if _, ok := room.members[c.clientID]; !ok {
		h.rejectLocked(c, reqID, "not_in_room", "client is not in room")
		return
	}
	h.metrics.MessagesReceived++
	h.messageSeq++
	room.sequence++
	room.lastActiveAt = now
	msg := Message{MessageID: fmt.Sprintf("msg-%d", h.messageSeq), Kind: "room", FromClientID: c.clientID, RoomID: roomID, Body: body, SentAt: now.Format(time.RFC3339Nano), Sequence: room.sequence}
	room.history = append(room.history, msg)
	if len(room.history) > h.config.HistorySize {
		room.history = room.history[len(room.history)-h.config.HistorySize:]
	}
	h.deliverLocked(c, Event{"type": "message_ack", "requestId": reqID, "messageId": msg.MessageID, "roomId": roomID, "acceptedAt": msg.SentAt})
	h.broadcastLocked(roomID, Event{"type": "message", "message": msg}, "")
}

func (h *Hub) privateMessageLocked(c *clientState, e Event, reqID string, now time.Time) {
	to, ok1 := e["toClientId"].(string)
	body, ok2 := e["body"].(string)
	if !ok1 || !ok2 || to == "" || body == "" {
		h.rejectLocked(c, reqID, "invalid_message_format", "private_message requires toClientId and body")
		return
	}
	if len(body) > h.config.MessageSizeLimit {
		h.rejectLocked(c, reqID, "message_too_large", "message body exceeds limit")
		return
	}
	recipient := h.clients[to]
	if recipient == nil {
		h.rejectLocked(c, reqID, "recipient_offline", "recipient is offline")
		return
	}
	h.metrics.MessagesReceived++
	h.messageSeq++
	msg := Message{MessageID: fmt.Sprintf("msg-%d", h.messageSeq), Kind: "private", FromClientID: c.clientID, ToClientID: to, Body: body, SentAt: now.Format(time.RFC3339Nano)}
	h.deliverLocked(c, Event{"type": "private_message_ack", "requestId": reqID, "messageId": msg.MessageID, "toClientId": to, "acceptedAt": msg.SentAt})
	h.deliverLocked(recipient, Event{"type": "private_message", "message": msg})
}

func (h *Hub) typingLocked(c *clientState, e Event, now time.Time) {
	roomID, ok1 := e["roomId"].(string)
	isTyping, ok2 := e["isTyping"].(bool)
	if !ok1 || !ok2 || !validRoomID(roomID) {
		h.rejectLocked(c, "", "invalid_message_format", "typing requires roomId and isTyping")
		return
	}
	room := h.rooms[roomID]
	if room == nil {
		h.rejectLocked(c, "", "not_in_room", "client is not in room")
		return
	}
	if _, ok := room.members[c.clientID]; !ok {
		h.rejectLocked(c, "", "not_in_room", "client is not in room")
		return
	}
	h.broadcastLocked(roomID, Event{"type": "typing", "roomId": roomID, "clientId": c.clientID, "isTyping": isTyping, "at": now.Format(time.RFC3339Nano)}, c.clientID)
}

func (h *Hub) historyLocked(c *clientState, e Event, reqID string) {
	roomID, ok := e["roomId"].(string)
	if !ok || !validRoomID(roomID) {
		h.rejectLocked(c, reqID, "invalid_message_format", "history requires roomId")
		return
	}
	room := h.rooms[roomID]
	if room == nil {
		h.rejectLocked(c, reqID, "not_in_room", "client is not in room")
		return
	}
	if _, ok := room.members[c.clientID]; !ok {
		h.rejectLocked(c, reqID, "not_in_room", "client is not in room")
		return
	}
	limit := h.config.HistorySize
	if v, ok := e["limit"].(float64); ok && int(v) < limit {
		limit = int(v)
	}
	if limit < 0 {
		limit = 0
	}
	start := len(room.history) - limit
	if start < 0 {
		start = 0
	}
	h.deliverLocked(c, Event{"type": "history", "requestId": reqID, "roomId": roomID, "messages": append([]Message(nil), room.history[start:]...)})
}

func (h *Hub) removeFromRoomLocked(c *clientState, roomID string, now time.Time, emit bool) {
	room := h.rooms[roomID]
	if room == nil {
		return
	}
	delete(room.members, c.clientID)
	delete(c.rooms, roomID)
	room.lastActiveAt = now
	if emit {
		h.broadcastLocked(roomID, Event{"type": "presence", "roomId": roomID, "clientId": c.clientID, "status": "offline", "at": now.Format(time.RFC3339Nano)}, c.clientID)
	}
	if len(room.members) == 0 {
		delete(h.rooms, roomID)
	}
}

func (h *Hub) roomLocked(roomID string, now time.Time) *roomState {
	if r := h.rooms[roomID]; r != nil {
		return r
	}
	r := &roomState{roomID: roomID, members: map[string]struct{}{}, createdAt: now, lastActiveAt: now}
	h.rooms[roomID] = r
	return r
}

func (h *Hub) broadcastLocked(roomID string, event Event, exclude string) {
	if room := h.rooms[roomID]; room != nil {
		for id := range room.members {
			if id == exclude {
				continue
			}
			if c := h.clients[id]; c != nil {
				h.deliverLocked(c, event)
			}
		}
	}
}

func (h *Hub) deliverLocked(c *clientState, event Event) {
	if c.queueDepth >= h.config.OutboundQueueLimit {
		h.metrics.DroppedSlowConsumers++
		return
	}
	c.queueDepth++
	if c.transport.Send(event) {
		h.metrics.MessagesDelivered++
	}
	c.queueDepth--
}
func (h *Hub) rejectLocked(c *clientState, reqID, code, message string) {
	h.metrics.RejectedEvents++
	h.deliverLocked(c, Event{"type": "error", "requestId": reqID, "code": code, "message": message, "fatal": false})
}

func (h *Hub) snapshotLocked(c *clientState) ClientSnapshot {
	rooms := make([]string, 0, len(c.rooms))
	for r := range c.rooms {
		rooms = append(rooms, r)
	}
	sort.Strings(rooms)
	return ClientSnapshot{ClientID: c.clientID, DisplayName: c.name, ConnectedAt: c.connectedAt.Format(time.RFC3339Nano), LastSeenAt: c.lastSeenAt.Format(time.RFC3339Nano), Rooms: rooms, Presence: "online", OutboundQueueDepth: c.queueDepth}
}
func validRoomID(roomID string) bool { return roomID != "" && len(roomID) <= 80 }
