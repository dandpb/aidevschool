import { EventEmitter } from 'node:events';
import { DEFAULT_CONFIG } from './config.js';
import type { ChatConfig, ClientSnapshot, ClientTransport, MessageRecord, MetricsSnapshot, ServerEvent } from './types.js';

interface ClientState {
  clientId: string;
  displayName?: string;
  connectedAt: Date;
  lastSeenAt: Date;
  rooms: Set<string>;
  transport: ClientTransport;
  outboundQueueDepth: number;
}

interface RoomState {
  roomId: string;
  members: Set<string>;
  history: MessageRecord[];
  createdAt: Date;
  lastActiveAt: Date;
  sequence: number;
}

interface IdGenerator {
  nextClientId(): string;
  nextMessageId(): string;
  nextHeartbeatId(): string;
}

class CounterIdGenerator implements IdGenerator {
  private client = 0;
  private message = 0;
  private heartbeat = 0;

  nextClientId(): string {
    this.client += 1;
    return `client-${this.client}`;
  }

  nextMessageId(): string {
    this.message += 1;
    return `msg-${this.message}`;
  }

  nextHeartbeatId(): string {
    this.heartbeat += 1;
    return `hb-${this.heartbeat}`;
  }
}

export class ChatHub extends EventEmitter {
  private readonly config: ChatConfig;
  private readonly ids: IdGenerator;
  private readonly clients = new Map<string, ClientState>();
  private readonly rooms = new Map<string, RoomState>();
  private metrics: Omit<MetricsSnapshot, 'activeConnections' | 'activeRooms' | 'roomMemberships'> = {
    messagesReceived: 0,
    messagesDelivered: 0,
    heartbeatTimeouts: 0,
    rejectedEvents: 0,
    droppedSlowConsumers: 0
  };

  constructor(config: Partial<ChatConfig> = {}, ids: IdGenerator = new CounterIdGenerator()) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.ids = ids;
  }

  connect(transport: ClientTransport, displayName?: string, now = new Date()): ClientSnapshot {
    const clientId = this.ids.nextClientId();
    const client: ClientState = {
      clientId,
      displayName: displayName?.slice(0, 64),
      connectedAt: now,
      lastSeenAt: now,
      rooms: new Set<string>(),
      transport,
      outboundQueueDepth: 0
    };
    this.clients.set(clientId, client);
    this.deliver(client, {
      type: 'connected',
      clientId,
      heartbeatIntervalMs: this.config.heartbeatIntervalMs,
      heartbeatTimeoutMs: this.config.heartbeatTimeoutMs
    });
    this.emit('client_connected', { clientId });
    return this.snapshotClient(client);
  }

  handle(clientId: string, event: unknown, now = new Date()): void {
    const client = this.clients.get(clientId);
    if (!client) return;
    client.lastSeenAt = now;

    if (!this.isObject(event) || typeof event.type !== 'string') {
      this.reject(client, undefined, 'invalid_message_format', 'event must be an object with a type');
      return;
    }

    const requestId = typeof event.requestId === 'string' ? event.requestId : undefined;
    switch (event.type) {
      case 'join':
        this.join(client, event, requestId, now);
        return;
      case 'leave':
        this.leave(client, event, requestId, now);
        return;
      case 'message':
        this.roomMessage(client, event, requestId, now);
        return;
      case 'private_message':
        this.privateMessage(client, event, requestId, now);
        return;
      case 'typing':
        this.typing(client, event, now);
        return;
      case 'history':
        this.history(client, event, requestId);
        return;
      case 'pong':
        if (typeof event.heartbeatId !== 'string') {
          this.reject(client, requestId, 'invalid_message_format', 'pong requires heartbeatId');
        }
        return;
      default:
        this.reject(client, requestId, 'invalid_message_format', `unknown event type: ${event.type}`);
    }
  }

  disconnect(clientId: string, now = new Date()): void {
    const client = this.clients.get(clientId);
    if (!client) return;
    const rooms = [...client.rooms];
    for (const roomId of rooms) {
      this.removeFromRoom(client, roomId, now, false);
    }
    this.clients.delete(clientId);
    this.emit('client_disconnected', { clientId });
  }

  sendHeartbeat(now = new Date()): string[] {
    const heartbeatIds: string[] = [];
    for (const client of this.clients.values()) {
      const heartbeatId = this.ids.nextHeartbeatId();
      heartbeatIds.push(heartbeatId);
      this.deliver(client, { type: 'ping', heartbeatId, sentAt: now.toISOString() });
    }
    return heartbeatIds;
  }

  disconnectStale(now = new Date()): string[] {
    const cutoffMs = this.config.heartbeatIntervalMs + this.config.heartbeatTimeoutMs;
    const stale: string[] = [];
    for (const client of this.clients.values()) {
      if (now.getTime() - client.lastSeenAt.getTime() > cutoffMs) {
        stale.push(client.clientId);
      }
    }
    for (const clientId of stale) {
      this.metrics.heartbeatTimeouts += 1;
      this.disconnect(clientId, now);
    }
    return stale;
  }

  getMetrics(): MetricsSnapshot {
    return {
      activeConnections: this.clients.size,
      activeRooms: this.rooms.size,
      roomMemberships: [...this.rooms.values()].reduce((sum, room) => sum + room.members.size, 0),
      ...this.metrics
    };
  }

  listClients(): ClientSnapshot[] {
    return [...this.clients.values()].map((client) => this.snapshotClient(client));
  }

  private join(client: ClientState, event: Record<string, unknown>, requestId: string | undefined, now: Date): void {
    if (!('roomId' in event) || !this.validRoomId(event.roomId)) {
      this.reject(client, requestId, 'invalid_message_format', 'join requires a valid roomId');
      return;
    }
    const room = this.room(event.roomId, now);
    if (!room.members.has(client.clientId) && room.members.size >= this.config.roomCapacity) {
      this.reject(client, requestId, 'room_full', 'room is full');
      return;
    }
    room.members.add(client.clientId);
    client.rooms.add(room.roomId);
    room.lastActiveAt = now;
    this.deliver(client, { type: 'joined', requestId, roomId: room.roomId, memberCount: room.members.size, history: [...room.history] });
    this.broadcast(room.roomId, { type: 'presence', roomId: room.roomId, clientId: client.clientId, status: 'online', at: now.toISOString() }, undefined);
  }

  private leave(client: ClientState, event: Record<string, unknown>, requestId: string | undefined, now: Date): void {
    if (!('roomId' in event) || !this.validRoomId(event.roomId)) {
      this.reject(client, requestId, 'invalid_message_format', 'leave requires a valid roomId');
      return;
    }
    if (!client.rooms.has(event.roomId)) {
      this.reject(client, requestId, 'not_in_room', 'client is not in room');
      return;
    }
    this.removeFromRoom(client, event.roomId, now, true);
    this.deliver(client, { type: 'left', requestId, roomId: event.roomId });
  }

  private roomMessage(client: ClientState, event: Record<string, unknown>, requestId: string | undefined, now: Date): void {
    if (!('roomId' in event) || !this.validRoomId(event.roomId) || !('body' in event) || typeof event.body !== 'string' || event.body.length === 0) {
      this.reject(client, requestId, 'invalid_message_format', 'message requires roomId and body');
      return;
    }
    if (event.body.length > this.config.messageSizeLimit) {
      this.reject(client, requestId, 'message_too_large', 'message body exceeds limit');
      return;
    }
    const room = this.rooms.get(event.roomId);
    if (!room || !room.members.has(client.clientId)) {
      this.reject(client, requestId, 'not_in_room', 'client is not in room');
      return;
    }
    this.metrics.messagesReceived += 1;
    room.sequence += 1;
    room.lastActiveAt = now;
    const message: MessageRecord = {
      messageId: this.ids.nextMessageId(),
      kind: 'room',
      fromClientId: client.clientId,
      roomId: room.roomId,
      body: event.body,
      sentAt: now.toISOString(),
      sequence: room.sequence
    };
    room.history.push(message);
    if (room.history.length > this.config.historySize) room.history.splice(0, room.history.length - this.config.historySize);
    this.deliver(client, { type: 'message_ack', requestId, messageId: message.messageId, roomId: room.roomId, acceptedAt: message.sentAt });
    this.broadcast(room.roomId, { type: 'message', message }, undefined);
  }

  private privateMessage(client: ClientState, event: Record<string, unknown>, requestId: string | undefined, now: Date): void {
    if (!('toClientId' in event) || typeof event.toClientId !== 'string' || !('body' in event) || typeof event.body !== 'string' || event.body.length === 0) {
      this.reject(client, requestId, 'invalid_message_format', 'private_message requires toClientId and body');
      return;
    }
    if (event.body.length > this.config.messageSizeLimit) {
      this.reject(client, requestId, 'message_too_large', 'message body exceeds limit');
      return;
    }
    const recipient = this.clients.get(event.toClientId);
    if (!recipient) {
      this.reject(client, requestId, 'recipient_offline', 'recipient is offline');
      return;
    }
    this.metrics.messagesReceived += 1;
    const sentAt = now.toISOString();
    const message: MessageRecord = {
      messageId: this.ids.nextMessageId(),
      kind: 'private',
      fromClientId: client.clientId,
      toClientId: recipient.clientId,
      body: event.body,
      sentAt
    };
    this.deliver(client, { type: 'private_message_ack', requestId, messageId: message.messageId, toClientId: recipient.clientId, acceptedAt: sentAt });
    this.deliver(recipient, { type: 'private_message', message });
  }

  private typing(client: ClientState, event: Record<string, unknown>, now: Date): void {
    if (!('roomId' in event) || !this.validRoomId(event.roomId) || !('isTyping' in event) || typeof event.isTyping !== 'boolean') {
      this.reject(client, undefined, 'invalid_message_format', 'typing requires roomId and isTyping');
      return;
    }
    const room = this.rooms.get(event.roomId);
    if (!room || !room.members.has(client.clientId)) {
      this.reject(client, undefined, 'not_in_room', 'client is not in room');
      return;
    }
    this.broadcast(room.roomId, { type: 'typing', roomId: room.roomId, clientId: client.clientId, isTyping: event.isTyping, at: now.toISOString() }, client.clientId);
  }

  private history(client: ClientState, event: Record<string, unknown>, requestId: string | undefined): void {
    if (!('roomId' in event) || !this.validRoomId(event.roomId)) {
      this.reject(client, requestId, 'invalid_message_format', 'history requires roomId');
      return;
    }
    const room = this.rooms.get(event.roomId);
    if (!room || !room.members.has(client.clientId)) {
      this.reject(client, requestId, 'not_in_room', 'client is not in room');
      return;
    }
    const limit = 'limit' in event && typeof event.limit === 'number' ? Math.max(0, Math.min(event.limit, this.config.historySize)) : this.config.historySize;
    const messages = limit === 0 ? [] : room.history.slice(-limit);
    this.deliver(client, { type: 'history', requestId, roomId: room.roomId, messages });
  }

  private removeFromRoom(client: ClientState, roomId: string, now: Date, emitLeftPresence: boolean): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    room.members.delete(client.clientId);
    client.rooms.delete(roomId);
    room.lastActiveAt = now;
    if (emitLeftPresence || !this.clients.has(client.clientId)) {
      this.broadcast(roomId, { type: 'presence', roomId, clientId: client.clientId, status: 'offline', at: now.toISOString() }, client.clientId);
    }
    if (room.members.size === 0) {
      this.rooms.delete(roomId);
    }
  }

  private room(roomId: string, now: Date): RoomState {
    const existing = this.rooms.get(roomId);
    if (existing) return existing;
    const created: RoomState = { roomId, members: new Set<string>(), history: [], createdAt: now, lastActiveAt: now, sequence: 0 };
    this.rooms.set(roomId, created);
    return created;
  }

  private broadcast(roomId: string, event: ServerEvent, excludeClientId: string | undefined): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    for (const memberId of room.members) {
      if (memberId === excludeClientId) continue;
      const member = this.clients.get(memberId);
      if (member) this.deliver(member, event);
    }
  }

  private deliver(client: ClientState, event: ServerEvent): void {
    if (client.outboundQueueDepth >= this.config.outboundQueueLimit) {
      this.metrics.droppedSlowConsumers += 1;
      this.disconnect(client.clientId);
      return;
    }
    client.outboundQueueDepth += 1;
    const delivered = client.transport.send(event);
    client.outboundQueueDepth -= 1;
    if (delivered) this.metrics.messagesDelivered += 1;
  }

  private reject(client: ClientState, requestId: string | undefined, code: string, message: string): void {
    this.metrics.rejectedEvents += 1;
    this.deliver(client, { type: 'error', requestId, code, message, fatal: false });
  }

  private snapshotClient(client: ClientState): ClientSnapshot {
    return {
      clientId: client.clientId,
      displayName: client.displayName,
      connectedAt: client.connectedAt.toISOString(),
      lastSeenAt: client.lastSeenAt.toISOString(),
      rooms: [...client.rooms].sort(),
      status: 'online',
      outboundQueueDepth: client.outboundQueueDepth
    };
  }

  private validRoomId(roomId: unknown): roomId is string {
    return typeof roomId === 'string' && roomId.length > 0 && roomId.length <= 80;
  }

  private isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
