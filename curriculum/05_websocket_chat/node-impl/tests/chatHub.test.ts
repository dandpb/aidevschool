import { describe, expect, it } from 'vitest';
import { ChatHub } from '../src/chatHub.js';
import type { ClientTransport, ServerEvent } from '../src/types.js';

class CaptureTransport implements ClientTransport {
  readonly events: ServerEvent[] = [];
  send(event: ServerEvent): boolean {
    this.events.push(event);
    return true;
  }
}

function setupHub(config = {}) {
  const hub = new ChatHub({ heartbeatIntervalMs: 100, heartbeatTimeoutMs: 50, historySize: 2, roomCapacity: 2, ...config });
  const alice = new CaptureTransport();
  const bob = new CaptureTransport();
  const carol = new CaptureTransport();
  const a = hub.connect(alice, 'alice', new Date('2026-01-01T00:00:00Z')).clientId;
  const b = hub.connect(bob, 'bob', new Date('2026-01-01T00:00:00Z')).clientId;
  const c = hub.connect(carol, 'carol', new Date('2026-01-01T00:00:00Z')).clientId;
  return { hub, alice, bob, carol, a, b, c };
}

describe('ChatHub', () => {
  it('acknowledges connections with heartbeat policy', () => {
    const hub = new ChatHub({ heartbeatIntervalMs: 123, heartbeatTimeoutMs: 45 });
    const transport = new CaptureTransport();
    const client = hub.connect(transport, 'Ada');
    expect(client.displayName).toBe('Ada');
    expect(transport.events[0]).toMatchObject({ type: 'connected', clientId: client.clientId, heartbeatIntervalMs: 123, heartbeatTimeoutMs: 45 });
  });

  it('joins rooms idempotently and returns bounded history', () => {
    const { hub, alice, bob, a, b } = setupHub();
    hub.handle(a, { type: 'join', requestId: 'j1', roomId: 'general' });
    hub.handle(a, { type: 'message', roomId: 'general', body: 'one' });
    hub.handle(a, { type: 'message', roomId: 'general', body: 'two' });
    hub.handle(a, { type: 'message', roomId: 'general', body: 'three' });
    hub.handle(b, { type: 'join', requestId: 'j2', roomId: 'general' });
    hub.handle(b, { type: 'join', requestId: 'j3', roomId: 'general' });

    const joined = bob.events.filter((event) => event.type === 'joined');
    expect(joined).toHaveLength(2);
    expect(joined[0]).toMatchObject({ requestId: 'j2', memberCount: 2 });
    expect(joined[0].history.map((message) => message.body)).toEqual(['two', 'three']);
    expect(alice.events.some((event) => event.type === 'presence' && event.clientId === b && event.status === 'online')).toBe(true);
  });

  it('broadcasts room messages only to room members with ordered sequence and ack', () => {
    const { hub, alice, bob, carol, a, b } = setupHub();
    hub.handle(a, { type: 'join', roomId: 'general' });
    hub.handle(b, { type: 'join', roomId: 'general' });
    hub.handle(a, { type: 'message', requestId: 'm1', roomId: 'general', body: 'hello' }, new Date('2026-01-01T00:00:01Z'));

    expect(alice.events.some((event) => event.type === 'message_ack' && event.requestId === 'm1')).toBe(true);
    const bobMessage = bob.events.find((event) => event.type === 'message' && event.message.body === 'hello');
    expect(bobMessage).toMatchObject({ type: 'message', message: { sequence: 1, roomId: 'general', fromClientId: a } });
    expect(carol.events.some((event) => event.type === 'message')).toBe(false);
  });

  it('sends private messages only to sender ack and recipient event', () => {
    const { hub, alice, bob, carol, a, b } = setupHub();
    hub.handle(a, { type: 'private_message', requestId: 'p1', toClientId: b, body: 'secret' });
    expect(alice.events.some((event) => event.type === 'private_message_ack' && event.requestId === 'p1')).toBe(true);
    expect(bob.events.some((event) => event.type === 'private_message' && event.message.body === 'secret')).toBe(true);
    expect(carol.events.some((event) => event.type === 'private_message')).toBe(false);
  });

  it('broadcasts typing indicators to other members without storing history', () => {
    const { hub, alice, bob, a, b } = setupHub();
    hub.handle(a, { type: 'join', roomId: 'general' });
    hub.handle(b, { type: 'join', roomId: 'general' });
    hub.handle(a, { type: 'typing', roomId: 'general', isTyping: true });
    hub.handle(b, { type: 'history', requestId: 'h1', roomId: 'general' });

    expect(bob.events.some((event) => event.type === 'typing' && event.clientId === a && event.isTyping)).toBe(true);
    expect(alice.events.some((event) => event.type === 'typing' && event.clientId === a)).toBe(false);
    const history = bob.events.find((event) => event.type === 'history' && event.requestId === 'h1');
    expect(history).toMatchObject({ messages: [] });
  });

  it('rejects invalid events, non-members, offline recipients, and full rooms without closing clients', () => {
    const { hub, alice, a, b, c } = setupHub();
    hub.handle(a, { nope: true });
    hub.handle(a, { type: 'message', requestId: 'bad-room', roomId: 'general', body: 'x' });
    hub.disconnect(b);
    hub.handle(a, { type: 'private_message', requestId: 'offline', toClientId: b, body: 'x' });
    hub.handle(a, { type: 'join', roomId: 'tiny' });
    hub.handle(c, { type: 'join', roomId: 'tiny' });
    hub.handle(b, { type: 'join', requestId: 'full', roomId: 'tiny' });

    const errors = alice.events.filter((event) => event.type === 'error');
    expect(errors.map((event) => event.code)).toEqual(['invalid_message_format', 'not_in_room', 'recipient_offline']);
    expect(hub.getMetrics().rejectedEvents).toBeGreaterThanOrEqual(3);
  });

  it('covers validation branches for typing, history, oversized private messages, pong, and slow consumers', () => {
    const { hub, alice, bob, a, b } = setupHub({ messageSizeLimit: 3 });
    hub.handle(a, { type: 'typing', roomId: 'general' });
    hub.handle(a, { type: 'typing', roomId: 'general', isTyping: true });
    hub.handle(a, { type: 'history', requestId: 'bad-history' });
    hub.handle(a, { type: 'history', requestId: 'not-in-room', roomId: 'general' });
    hub.handle(a, { type: 'private_message', requestId: 'big-private', toClientId: b, body: 'large' });
    hub.handle(a, { type: 'pong' });
    hub.handle(a, { type: 'join', roomId: 'general' });
    hub.handle(a, { type: 'message', roomId: 'general', body: 'one' });
    hub.handle(a, { type: 'history', requestId: 'zero-history', roomId: 'general', limit: 0 });

    const errors = alice.events.filter((event) => event.type === 'error');
    expect(errors.map((event) => event.code)).toEqual([
      'invalid_message_format',
      'not_in_room',
      'invalid_message_format',
      'not_in_room',
      'message_too_large',
      'invalid_message_format'
    ]);
    const history = alice.events.find((event) => event.type === 'history' && event.requestId === 'zero-history');
    expect(history).toMatchObject({ messages: [] });
    expect(bob.events.some((event) => event.type === 'private_message')).toBe(false);

    const slowHub = new ChatHub({ outboundQueueLimit: 0 });
    slowHub.connect(new CaptureTransport(), 'slow');
    expect(slowHub.getMetrics().droppedSlowConsumers).toBe(1);
  });

  it('cleans memberships on leave, graceful disconnect, and heartbeat timeout', () => {
    const { hub, bob, a, b } = setupHub();
    hub.handle(a, { type: 'join', roomId: 'general' }, new Date('2026-01-01T00:00:00Z'));
    hub.handle(b, { type: 'join', roomId: 'general' }, new Date('2026-01-01T00:00:00Z'));
    hub.handle(a, { type: 'leave', requestId: 'l1', roomId: 'general' }, new Date('2026-01-01T00:00:01Z'));
    expect(bob.events.some((event) => event.type === 'presence' && event.clientId === a && event.status === 'offline')).toBe(true);

    const stale = hub.disconnectStale(new Date('2026-01-01T00:00:01.200Z'));
    expect(stale).toContain(b);
    expect(hub.getMetrics()).toMatchObject({ activeRooms: 0, heartbeatTimeouts: 3 });
  });
});
