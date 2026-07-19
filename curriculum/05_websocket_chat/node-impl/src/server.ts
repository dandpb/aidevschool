import http from 'node:http';
import { createLogger } from './logger';
import { WebSocketServer, type WebSocket } from 'ws';
import { ChatHub } from './chatHub.js';
import type { ServerConfig } from './config.js';
import type { ClientTransport, ServerEvent } from './types.js';

class WebSocketTransport implements ClientTransport {
  constructor(private readonly socket: WebSocket) {}

  send(event: ServerEvent): boolean {
    if (this.socket.readyState !== this.socket.OPEN) return false;
    this.socket.send(JSON.stringify(event));
    return true;
  }
}

export function buildServer(config: ServerConfig, logger = createLogger(config.logLevel )) {
  const hub = new ChatHub(config);
  const server = http.createServer((request, response) => {
    if (request.url === '/healthz') {
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ status: 'ok' }));
      return;
    }
    if (request.url === '/metrics') {
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify(hub.getMetrics()));
      return;
    }
    response.writeHead(404, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ error: 'not_found' }));
  });
  const wss = new WebSocketServer({ server, path: '/ws', maxPayload: config.messageSizeLimit * 2 });

  wss.on('connection', (socket, request) => {
    const url = new URL(request.url ?? '/ws', `http://${request.headers.host ?? 'localhost'}`);
    const client = hub.connect(new WebSocketTransport(socket), url.searchParams.get('name') ?? undefined);
    logger.info({ clientId: client.clientId }, 'client connected');

    socket.on('message', (data) => {
      try {
        const raw = typeof data === 'string'
          ? data
          : data instanceof Buffer
            ? data.toString('utf8')
            : Array.isArray(data)
              ? Buffer.concat(data).toString('utf8')
              : Buffer.from(new Uint8Array(data)).toString('utf8');
        hub.handle(client.clientId, JSON.parse(raw));
      } catch {
        hub.handle(client.clientId, { type: undefined });
      }
    });
    socket.on('close', () => {
      hub.disconnect(client.clientId);
      logger.info({ clientId: client.clientId }, 'client disconnected');
    });
  });

  const heartbeat = setInterval(() => {
    hub.sendHeartbeat();
    for (const clientId of hub.disconnectStale()) {
      logger.warn({ clientId }, 'client heartbeat timeout');
    }
  }, config.heartbeatIntervalMs);
  heartbeat.unref();

  return { server, wss, hub, close: () => new Promise<void>((resolve) => {
    clearInterval(heartbeat);
    wss.close(() => server.close(() => resolve()));
  }) };
}
