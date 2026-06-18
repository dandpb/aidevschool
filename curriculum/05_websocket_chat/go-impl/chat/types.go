package chat

import "time"

type Config struct {
	HeartbeatInterval  time.Duration
	HeartbeatTimeout   time.Duration
	RoomCapacity       int
	MessageSizeLimit   int
	HistorySize        int
	OutboundQueueLimit int
}

func DefaultConfig() Config {
	return Config{HeartbeatInterval: 30 * time.Second, HeartbeatTimeout: 10 * time.Second, RoomCapacity: 100, MessageSizeLimit: 4096, HistorySize: 50, OutboundQueueLimit: 256}
}

type Message struct {
	MessageID    string `json:"messageId"`
	Kind         string `json:"kind"`
	FromClientID string `json:"fromClientId"`
	ToClientID   string `json:"toClientId,omitempty"`
	RoomID       string `json:"roomId,omitempty"`
	Body         string `json:"body"`
	SentAt       string `json:"sentAt"`
	Sequence     int64  `json:"sequence,omitempty"`
}

type Event map[string]any

type Transport interface {
	Send(Event) bool
}

type ClientSnapshot struct {
	ClientID           string   `json:"clientId"`
	DisplayName        string   `json:"displayName,omitempty"`
	ConnectedAt        string   `json:"connectedAt"`
	LastSeenAt         string   `json:"lastSeenAt"`
	Rooms              []string `json:"rooms"`
	Presence           string   `json:"presence"`
	OutboundQueueDepth int      `json:"outboundQueueDepth"`
}

type Metrics struct {
	ActiveConnections    int   `json:"activeConnections"`
	ActiveRooms          int   `json:"activeRooms"`
	RoomMemberships      int   `json:"roomMemberships"`
	MessagesReceived     int64 `json:"messagesReceived"`
	MessagesDelivered    int64 `json:"messagesDelivered"`
	HeartbeatTimeouts    int64 `json:"heartbeatTimeouts"`
	RejectedEvents       int64 `json:"rejectedEvents"`
	DroppedSlowConsumers int64 `json:"droppedSlowConsumers"`
}
