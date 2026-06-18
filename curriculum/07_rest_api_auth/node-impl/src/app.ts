import crypto from 'node:crypto';
import Fastify, { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import jwt, { JwtPayload } from 'jsonwebtoken';
import pino from 'pino';

type Role = 'user' | 'admin';
type UserStatus = 'active' | 'disabled';
type SessionStatus = 'active' | 'rotated' | 'revoked' | 'expired' | 'replayed';
type AuditAction = 'user_registered' | 'login_succeeded' | 'login_failed' | 'token_verify_failed' | 'authorization_forbidden' | 'token_refreshed' | 'refresh_replayed' | 'user_updated';
type Outcome = 'success' | 'failure' | 'denied';

interface Config {
  issuer: string;
  audience: string;
  accessTokenSeconds: number;
  refreshTokenSeconds: number;
  jwtSecret: string;
  passwordIterations: number;
}

interface Clock { now(): Date; }

interface User {
  id: string;
  email: string;
  passwordHash: string;
  displayName: string;
  roles: Role[];
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
}

interface Session {
  id: string;
  userId: string;
  refreshTokenHash: string;
  accessTokenJti: string;
  status: SessionStatus;
  parentSessionId: string | null;
  createdAt: Date;
  expiresAt: Date;
  rotatedAt: Date | null;
  revokedAt: Date | null;
  lastUsedAt: Date | null;
}

interface AuditEntry {
  id: string;
  action: AuditAction;
  actorUserId: string | null;
  targetUserId: string | null;
  sessionId: string | null;
  requestId: string;
  outcome: Outcome;
  metadata: Record<string, string>;
  createdAt: Date;
}

interface Principal { sub: string; email: string; roles: Role[]; jti: string; }

declare module 'fastify' {
  interface FastifyRequest {
    requestIdValue: string;
    principal?: Principal;
  }
}

class FixedClock implements Clock {
  constructor(private readonly value: Date = new Date('2026-06-17T00:00:00.000Z')) {}
  now(): Date { return new Date(this.value); }
}

const defaultConfig: Config = {
  issuer: 'ai-devschool-project-07',
  audience: 'project-07-learners',
  accessTokenSeconds: 900,
  refreshTokenSeconds: 604800,
  jwtSecret: 'dev-project-07-secret-change-me',
  passwordIterations: 12000
};

const publicUser = (user: User) => ({
  id: user.id,
  email: user.email,
  display_name: user.displayName,
  roles: user.roles,
  status: user.status,
  created_at: user.createdAt.toISOString(),
  updated_at: user.updatedAt.toISOString()
});

const id = (prefix: string): string => `${prefix}_${crypto.randomUUID()}`;
const normalizeEmail = (email: string): string => email.trim().toLowerCase();
const addSeconds = (date: Date, seconds: number): Date => new Date(date.getTime() + seconds * 1000);

class ApiError extends Error {
  constructor(readonly status: number, readonly code: string, message: string, readonly details: Array<{ field: string; reason: string }> = []) {
    super(message);
  }
}

class InMemoryStore {
  readonly users = new Map<string, User>();
  readonly sessions = new Map<string, Session>();
  readonly audits: AuditEntry[] = [];

  findUserByEmail(email: string): User | undefined {
    return Array.from(this.users.values()).find((user) => user.email === email);
  }

  findSessionByRefreshHash(hash: string): Session | undefined {
    return Array.from(this.sessions.values()).find((session) => session.refreshTokenHash === hash);
  }
}

class PasswordHasher {
  constructor(private readonly config: Config) {}

  hash(password: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const derived = crypto.pbkdf2Sync(password, salt, this.config.passwordIterations, 32, 'sha256').toString('hex');
    return `pbkdf2$${this.config.passwordIterations}$${salt}$${derived}`;
  }

  verify(password: string, stored: string): boolean {
    const [scheme, iterations, salt, expected] = stored.split('$');
    if (scheme !== 'pbkdf2' || !iterations || !salt || !expected) return false;
    const derived = crypto.pbkdf2Sync(password, salt, Number(iterations), 32, 'sha256');
    return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), derived);
  }
}

class TokenService {
  constructor(private readonly config: Config, private readonly clock: Clock) {}

  signAccessToken(user: User): { token: string; jti: string } {
    const jti = id('jti');
    const nowSeconds = Math.floor(this.clock.now().getTime() / 1000);
    const token = jwt.sign(
      { sub: user.id, email: user.email, roles: user.roles, iat: nowSeconds, jti },
      this.config.jwtSecret,
      { algorithm: 'HS256', issuer: this.config.issuer, audience: this.config.audience, expiresIn: this.config.accessTokenSeconds }
    );
    return { token, jti };
  }

  verifyAccessToken(token: string): Principal {
    const decoded = jwt.verify(token, this.config.jwtSecret, { issuer: this.config.issuer, audience: this.config.audience, clockTimestamp: Math.floor(this.clock.now().getTime() / 1000) }) as JwtPayload;
    if (typeof decoded.sub !== 'string' || typeof decoded.email !== 'string' || !Array.isArray(decoded.roles) || typeof decoded.jti !== 'string') {
      throw new Error('missing claims');
    }
    return { sub: decoded.sub, email: decoded.email, roles: decoded.roles as Role[], jti: decoded.jti };
  }

  createRefreshToken(): string { return crypto.randomBytes(32).toString('base64url'); }
  hashRefreshToken(token: string): string { return crypto.createHash('sha256').update(token).digest('hex'); }
}

class AuditLogger {
  constructor(private readonly store: InMemoryStore, private readonly clock: Clock) {}
  record(entry: Omit<AuditEntry, 'id' | 'createdAt'>): void {
    this.store.audits.push({ ...entry, id: id('aud'), createdAt: this.clock.now() });
  }
}

class AuthService {
  constructor(private readonly store: InMemoryStore, private readonly passwords: PasswordHasher, private readonly tokens: TokenService, private readonly audit: AuditLogger, private readonly clock: Clock, private readonly config: Config) {}

  register(input: Record<string, unknown>, requestId: string): User {
    const body = validateRegister(input);
    const email = normalizeEmail(body.email);
    if (this.store.findUserByEmail(email)) throw new ApiError(409, 'EMAIL_ALREADY_REGISTERED', 'Email is already registered.');
    const now = this.clock.now();
    const user: User = { id: id('usr'), email, passwordHash: this.passwords.hash(body.password), displayName: body.display_name ?? email, roles: ['user'], status: 'active', createdAt: now, updatedAt: now };
    this.store.users.set(user.id, user);
    this.audit.record({ action: 'user_registered', actorUserId: user.id, targetUserId: user.id, sessionId: null, requestId, outcome: 'success', metadata: { email } });
    return user;
  }

  login(input: Record<string, unknown>, requestId: string): { accessToken: string; refreshToken: string; user: User } {
    const body = validateLogin(input);
    const user = this.store.findUserByEmail(normalizeEmail(body.email));
    if (!user || user.status !== 'active' || !this.passwords.verify(body.password, user.passwordHash)) {
      this.audit.record({ action: 'login_failed', actorUserId: null, targetUserId: null, sessionId: null, requestId, outcome: 'failure', metadata: { reason: 'invalid_credentials' } });
      throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid credentials.');
    }
    const access = this.tokens.signAccessToken(user);
    const refreshToken = this.tokens.createRefreshToken();
    const session: Session = { id: id('ses'), userId: user.id, refreshTokenHash: this.tokens.hashRefreshToken(refreshToken), accessTokenJti: access.jti, status: 'active', parentSessionId: null, createdAt: this.clock.now(), expiresAt: addSeconds(this.clock.now(), this.config.refreshTokenSeconds), rotatedAt: null, revokedAt: null, lastUsedAt: this.clock.now() };
    this.store.sessions.set(session.id, session);
    this.audit.record({ action: 'login_succeeded', actorUserId: user.id, targetUserId: user.id, sessionId: session.id, requestId, outcome: 'success', metadata: {} });
    return { accessToken: access.token, refreshToken, user };
  }

  refresh(input: Record<string, unknown>, requestId: string): { accessToken: string; refreshToken: string } {
    const body = validateRefresh(input);
    const hash = this.tokens.hashRefreshToken(body.refresh_token);
    const session = this.store.findSessionByRefreshHash(hash);
    if (!session) throw new ApiError(401, 'INVALID_REFRESH_TOKEN', 'Invalid refresh token.');
    if (session.status !== 'active') {
      session.status = 'replayed';
      this.audit.record({ action: 'refresh_replayed', actorUserId: session.userId, targetUserId: session.userId, sessionId: session.id, requestId, outcome: 'denied', metadata: { previous_status: session.status } });
      throw new ApiError(401, 'REFRESH_TOKEN_REPLAYED', 'Refresh token was already used.');
    }
    if (session.expiresAt <= this.clock.now()) {
      session.status = 'expired';
      throw new ApiError(401, 'INVALID_REFRESH_TOKEN', 'Invalid refresh token.');
    }
    const user = this.store.users.get(session.userId);
    if (!user || user.status !== 'active') throw new ApiError(401, 'INVALID_REFRESH_TOKEN', 'Invalid refresh token.');
    const access = this.tokens.signAccessToken(user);
    const refreshToken = this.tokens.createRefreshToken();
    session.status = 'rotated';
    session.rotatedAt = this.clock.now();
    const next: Session = { id: id('ses'), userId: user.id, refreshTokenHash: this.tokens.hashRefreshToken(refreshToken), accessTokenJti: access.jti, status: 'active', parentSessionId: session.id, createdAt: this.clock.now(), expiresAt: addSeconds(this.clock.now(), this.config.refreshTokenSeconds), rotatedAt: null, revokedAt: null, lastUsedAt: this.clock.now() };
    this.store.sessions.set(next.id, next);
    this.audit.record({ action: 'token_refreshed', actorUserId: user.id, targetUserId: user.id, sessionId: next.id, requestId, outcome: 'success', metadata: { parent_session_id: session.id } });
    return { accessToken: access.token, refreshToken };
  }
}

class UserService {
  constructor(private readonly store: InMemoryStore, private readonly audit: AuditLogger, private readonly clock: Clock) {}
  list(limit: number): User[] { return Array.from(this.store.users.values()).slice(0, limit); }
  update(targetId: string, input: Record<string, unknown>, principal: Principal, requestId: string): User {
    const body = validateUpdate(input);
    const target = this.store.users.get(targetId);
    if (!target) throw new ApiError(404, 'USER_NOT_FOUND', 'User was not found.');
    const isAdmin = principal.roles.includes('admin');
    if (!isAdmin && (principal.sub !== targetId || body.roles !== undefined || body.status !== undefined)) {
      this.audit.record({ action: 'authorization_forbidden', actorUserId: principal.sub, targetUserId: targetId, sessionId: null, requestId, outcome: 'denied', metadata: { policy: 'user_update' } });
      throw new ApiError(403, 'FORBIDDEN', 'Forbidden.');
    }
    if (body.display_name !== undefined) target.displayName = body.display_name;
    if (isAdmin && body.roles !== undefined) target.roles = body.roles;
    if (isAdmin && body.status !== undefined) target.status = body.status;
    target.updatedAt = this.clock.now();
    this.audit.record({ action: 'user_updated', actorUserId: principal.sub, targetUserId: targetId, sessionId: null, requestId, outcome: 'success', metadata: {} });
    return target;
  }
}

const asObject = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ApiError(400, 'VALIDATION_FAILED', 'Request validation failed.');
  return value as Record<string, unknown>;
};
const assertKnown = (body: Record<string, unknown>, fields: string[]): void => {
  const unknown = Object.keys(body).filter((key) => !fields.includes(key));
  if (unknown.length > 0) throw new ApiError(400, 'VALIDATION_FAILED', 'Request validation failed.', unknown.map((field) => ({ field, reason: 'unknown field' })));
};
const isEmail = (value: string): boolean => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value);
const strongPassword = (value: string): boolean => value.length >= 12 && /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value);

function validateRegister(value: unknown): { email: string; password: string; display_name?: string } {
  const body = asObject(value); assertKnown(body, ['email', 'password', 'display_name']);
  const details: Array<{ field: string; reason: string }> = [];
  if (typeof body.email !== 'string' || !isEmail(body.email)) details.push({ field: 'email', reason: 'must be a valid email address' });
  if (typeof body.password !== 'string' || !strongPassword(body.password)) details.push({ field: 'password', reason: 'must be at least 12 chars with upper, lower, and digit' });
  if (body.display_name !== undefined && (typeof body.display_name !== 'string' || body.display_name.length < 1 || body.display_name.length > 100)) details.push({ field: 'display_name', reason: 'must be 1..100 characters' });
  if (details.length > 0) throw new ApiError(400, 'VALIDATION_FAILED', 'Request validation failed.', details);
  return { email: body.email as string, password: body.password as string, display_name: body.display_name as string | undefined };
}
function validateLogin(value: unknown): { email: string; password: string } {
  const body = asObject(value); assertKnown(body, ['email', 'password']);
  if (typeof body.email !== 'string' || typeof body.password !== 'string') throw new ApiError(400, 'VALIDATION_FAILED', 'Request validation failed.');
  return { email: body.email, password: body.password };
}
function validateRefresh(value: unknown): { refresh_token: string } {
  const body = asObject(value); assertKnown(body, ['refresh_token']);
  if (typeof body.refresh_token !== 'string' || body.refresh_token.length < 16) throw new ApiError(400, 'VALIDATION_FAILED', 'Request validation failed.');
  return { refresh_token: body.refresh_token };
}
function validateUpdate(value: unknown): { display_name?: string; roles?: Role[]; status?: UserStatus } {
  const body = asObject(value); assertKnown(body, ['display_name', 'roles', 'status']);
  const details: Array<{ field: string; reason: string }> = [];
  if (body.display_name !== undefined && (typeof body.display_name !== 'string' || body.display_name.length < 1 || body.display_name.length > 100)) details.push({ field: 'display_name', reason: 'must be 1..100 characters' });
  if (body.roles !== undefined && (!Array.isArray(body.roles) || body.roles.length === 0 || !body.roles.every((role) => role === 'user' || role === 'admin'))) details.push({ field: 'roles', reason: 'must contain user/admin roles' });
  if (body.status !== undefined && body.status !== 'active' && body.status !== 'disabled') details.push({ field: 'status', reason: 'must be active or disabled' });
  if (details.length > 0) throw new ApiError(400, 'VALIDATION_FAILED', 'Request validation failed.', details);
  return { display_name: body.display_name as string | undefined, roles: body.roles as Role[] | undefined, status: body.status as UserStatus | undefined };
}

const sendError = (reply: FastifyReply, request: FastifyRequest, error: ApiError): void => {
  void reply.status(error.status).send({ error: { code: error.code, message: error.message, details: error.details }, request_id: request.requestIdValue });
};

export function buildApp(options: { config?: Partial<Config>; clock?: Clock; store?: InMemoryStore } = {}): { app: FastifyInstance; store: InMemoryStore } {
  const config = { ...defaultConfig, ...options.config };
  const clock = options.clock ?? new FixedClock();
  const store = options.store ?? new InMemoryStore();
  const logger = pino({ level: 'silent' });
  const audit = new AuditLogger(store, clock);
  const tokenService = new TokenService(config, clock);
  const auth = new AuthService(store, new PasswordHasher(config), tokenService, audit, clock, config);
  const users = new UserService(store, audit, clock);
  const app: FastifyInstance = Fastify({ logger: false });

  app.addHook('onRequest', (request, reply, done) => {
    request.requestIdValue = request.headers['x-request-id']?.toString() ?? id('req');
    void reply.header('x-request-id', request.requestIdValue);
    logger.info({ request_id: request.requestIdValue, method: request.method, path: request.url }, 'request');
    done();
  });

  const authenticate = async (request: FastifyRequest): Promise<void> => {
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) throw new ApiError(401, 'UNAUTHENTICATED', 'Unauthenticated.');
    try { request.principal = tokenService.verifyAccessToken(header.slice('Bearer '.length)); }
    catch {
      audit.record({ action: 'token_verify_failed', actorUserId: null, targetUserId: null, sessionId: null, requestId: request.requestIdValue, outcome: 'failure', metadata: { reason: 'invalid_token' } });
      throw new ApiError(401, 'UNAUTHENTICATED', 'Unauthenticated.');
    }
    await Promise.resolve();
  };
  const requireAdmin = async (request: FastifyRequest): Promise<void> => {
    if (!request.principal?.roles.includes('admin')) {
      audit.record({ action: 'authorization_forbidden', actorUserId: request.principal?.sub ?? null, targetUserId: null, sessionId: null, requestId: request.requestIdValue, outcome: 'denied', metadata: { policy: 'admin_required' } });
      throw new ApiError(403, 'FORBIDDEN', 'Forbidden.');
    }
    await Promise.resolve();
  };

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ApiError) sendError(reply, request, error);
    else sendError(reply, request, new ApiError(500, 'INTERNAL_ERROR', 'Internal error.'));
  });
  app.get('/healthz', (request) => ({ data: { status: 'ok' }, request_id: request.requestIdValue }));
  app.post('/v1/auth/register', (request, reply) => reply.status(201).send({ data: { user: publicUser(auth.register(asObject(request.body), request.requestIdValue)) }, request_id: request.requestIdValue }));
  app.post('/v1/auth/login', (request) => {
    const result = auth.login(asObject(request.body), request.requestIdValue);
    return { data: { access_token: result.accessToken, token_type: 'Bearer', expires_in_seconds: config.accessTokenSeconds, refresh_token: result.refreshToken, refresh_expires_in_seconds: config.refreshTokenSeconds, user: publicUser(result.user) }, request_id: request.requestIdValue };
  });
  app.post('/v1/auth/refresh', (request) => {
    const result = auth.refresh(asObject(request.body), request.requestIdValue);
    return { data: { access_token: result.accessToken, token_type: 'Bearer', expires_in_seconds: config.accessTokenSeconds, refresh_token: result.refreshToken, refresh_expires_in_seconds: config.refreshTokenSeconds }, request_id: request.requestIdValue };
  });
  app.get('/v1/users', { preHandler: [authenticate, requireAdmin] }, (request) => {
    const limitRaw = (request.query as { limit?: string }).limit ?? '25';
    const limit = Number(limitRaw);
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new ApiError(400, 'VALIDATION_FAILED', 'Request validation failed.', [{ field: 'limit', reason: 'must be 1..100' }]);
    return { data: { users: users.list(limit).map(publicUser), next_cursor: null }, request_id: request.requestIdValue };
  });
  app.put('/v1/users/:id', { preHandler: [authenticate] }, (request) => {
    const params = request.params as { id: string };
    const principal = request.principal;
    if (!principal) throw new ApiError(401, 'UNAUTHENTICATED', 'Unauthenticated.');
    return { data: { user: publicUser(users.update(params.id, asObject(request.body), principal, request.requestIdValue)) }, request_id: request.requestIdValue };
  });
  app.all('/v2/*', () => { throw new ApiError(404, 'UNSUPPORTED_API_VERSION', 'Unsupported API version.'); });
  return { app, store };
}

export { InMemoryStore, FixedClock, defaultConfig };
