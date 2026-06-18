export type PresenceStatus = 'online' | 'offline' | 'away';
export type MessageKind = 'room' | 'private';

export interface ChatConfig {
  heartbeatIntervalMs: number;
  heartbeatTimeoutMs: number;
  roomCapacity: number;
  messageSizeLimit: number;
  historySize: number;
  outboundQueueLimit: number;
}

export interface MessageRecord {
  messageId: string;
  kind: MessageKind;
  fromClientId: string;
  toClientId?: string;
  roomId?: string;
  body: string;
  sentAt: string;
  sequence?: number;
}

export interface ClientSnapshot {
  clientId: string;
  displayName?: string;
  connectedAt: string;
  lastSeenAt: string;
  rooms: string[];
  status: PresenceStatus;
  outboundQueueDepth: number;
}

export interface MetricsSnapshot {
  activeConnections: number;
  activeRooms: number;
  roomMemberships: number;
  messagesReceived: number;
  messagesDelivered: number;
  heartbeatTimeouts: number;
  rejectedEvents: number;
  droppedSlowConsumers: number;
}

export type ServerEvent =
  | { type: 'connected'; clientId: string; heartbeatIntervalMs: number; heartbeatTimeoutMs: number }
  | { type: 'joined'; requestId?: string; roomId: string; memberCount: number; history: MessageRecord[] }
  | { type: 'left'; requestId?: string; roomId: string }
  | { type: 'message'; message: MessageRecord }
  | { type: 'message_ack'; requestId?: string; messageId: string; roomId: string; acceptedAt: string }
  | { type: 'private_message'; message: MessageRecord }
  | { type: 'private_message_ack'; requestId?: string; messageId: string; toClientId: string; acceptedAt: string }
  | { type: 'presence'; roomId?: string; clientId: string; status: PresenceStatus; at: string }
  | { type: 'typing'; roomId: string; clientId: string; isTyping: boolean; at: string }
  | { type: 'history'; requestId?: string; roomId: string; messages: MessageRecord[] }
  | { type: 'ping'; heartbeatId: string; sentAt: string }
  | { type: 'error'; requestId?: string; code: string; message: string; fatal: boolean };

export interface ClientTransport {
  send(event: ServerEvent): boolean;
}

export type ClientEvent =
  | { type: 'join'; requestId?: string; roomId: string }
  | { type: 'leave'; requestId?: string; roomId: string }
  | { type: 'message'; requestId?: string; roomId: string; body: string }
  | { type: 'private_message'; requestId?: string; toClientId: string; body: string }
  | { type: 'typing'; roomId: string; isTyping: boolean }
  | { type: 'history'; requestId?: string; roomId: string; limit?: number; beforeMessageId?: string }
  | { type: 'pong'; heartbeatId: string };
