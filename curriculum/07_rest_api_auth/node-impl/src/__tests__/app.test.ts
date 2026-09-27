import { describe, expect, it } from 'vitest';
import jwt from 'jsonwebtoken';
import { buildApp, defaultConfig } from '../app';

const strong = 'CorrectHorse1Battery';

interface PublicUser { id: string; email: string; display_name: string; roles: string[]; status: string }
interface Success<T> { data: T; request_id: string }
interface Failure { error: { code: string; message: string; details: Array<{ field: string; reason: string }> }; request_id: string }
interface LoginData { access_token: string; refresh_token: string; token_type: string; expires_in_seconds: number; refresh_expires_in_seconds: number; user: PublicUser }
interface RefreshData { access_token: string; refresh_token: string }
const bodyOf = <T>(response: { json: () => unknown }): T => response.json() as T;
const testApp = () => buildApp({ config: { passwordIterations: 100 } });

async function registered() {
  const built = testApp();
  const register = await built.app.inject({ method: 'POST', url: '/v1/auth/register', payload: { email: 'Ada@Example.com', password: strong, display_name: 'Ada' } });
  const user = bodyOf<Success<{ user: PublicUser }>>(register).data.user;
  const login = await built.app.inject({ method: 'POST', url: '/v1/auth/login', payload: { email: 'ada@example.com', password: strong } });
  return { ...built, user, tokens: bodyOf<Success<LoginData>>(login).data };
}

describe('REST API auth Node implementation', () => {
  it('registers normalized users without exposing password material and audits it', async () => {
    const { app, store } = testApp();
    const res = await app.inject({ method: 'POST', url: '/v1/auth/register', headers: { 'x-request-id': 'req_test' }, payload: { email: 'Learner@Example.com', password: strong, display_name: 'Learner' } });
    expect(res.statusCode).toBe(201);
    const body = bodyOf<Success<{ user: PublicUser }>>(res);
    expect(body).toMatchObject({ data: { user: { email: 'learner@example.com', roles: ['user'], status: 'active' } }, request_id: 'req_test' });
    expect(JSON.stringify(body)).not.toContain(strong);
    expect([...store.users.values()][0].passwordHash).not.toBe(strong);
    expect(store.audits.map((entry) => entry.action)).toContain('user_registered');
  });

  it('rejects invalid and duplicate registration with structured errors', async () => {
    const { app } = testApp();
    const invalid = await app.inject({ method: 'POST', url: '/v1/auth/register', payload: { email: 'bad', password: 'weak', extra: true } });
    expect(invalid.statusCode).toBe(400);
    expect(bodyOf<Failure>(invalid).error.code).toBe('VALIDATION_FAILED');
    await app.inject({ method: 'POST', url: '/v1/auth/register', payload: { email: 'a@example.com', password: strong } });
    const duplicate = await app.inject({ method: 'POST', url: '/v1/auth/register', payload: { email: 'A@example.com', password: strong } });
    expect(duplicate.statusCode).toBe(409);
    expect(bodyOf<Failure>(duplicate).error.code).toBe('EMAIL_ALREADY_REGISTERED');
  });

  it('logs in, issues verifiable JWT claims, and hides credential failure cause', async () => {
    const { app, store } = await registered();
    const ok = await app.inject({ method: 'POST', url: '/v1/auth/login', payload: { email: 'ada@example.com', password: strong } });
    expect(ok.statusCode).toBe(200);
    const body = bodyOf<Success<LoginData>>(ok).data;
    const decoded = jwt.verify(body.access_token, defaultConfig.jwtSecret, { issuer: defaultConfig.issuer, audience: defaultConfig.audience, clockTimestamp: Date.parse('2026-06-17T00:00:00.000Z') / 1000 }) as jwt.JwtPayload;
    expect(decoded.sub).toBeDefined();
    expect(decoded.roles).toEqual(['user']);
    expect(decoded.jti).toContain('jti_');
    const bad = await app.inject({ method: 'POST', url: '/v1/auth/login', payload: { email: 'none@example.com', password: 'WrongPassword1' } });
    expect(bad.statusCode).toBe(401);
    expect(bodyOf<Failure>(bad).error.code).toBe('INVALID_CREDENTIALS');
    expect(store.audits.map((entry) => entry.action)).toContain('login_failed');
  });

  it('enforces authentication, admin RBAC, and ownership update policy', async () => {
    const { app, store, user, tokens } = await registered();
    const missing = await app.inject({ method: 'GET', url: '/v1/users' });
    expect(missing.statusCode).toBe(401);
    const malformed = await app.inject({ method: 'GET', url: '/v1/users', headers: { authorization: 'Bearer not-a-jwt' } });
    expect(malformed.statusCode).toBe(401);
    const denied = await app.inject({ method: 'GET', url: '/v1/users', headers: { authorization: `Bearer ${tokens.access_token}` } });
    expect(denied.statusCode).toBe(403);
    const self = await app.inject({ method: 'PUT', url: `/v1/users/${user.id}`, headers: { authorization: `Bearer ${tokens.access_token}` }, payload: { display_name: 'Ada L.' } });
    expect(self.statusCode).toBe(200);
    const forbidden = await app.inject({ method: 'PUT', url: `/v1/users/${user.id}`, headers: { authorization: `Bearer ${tokens.access_token}` }, payload: { roles: ['admin'] } });
    expect(forbidden.statusCode).toBe(403);
    const stored = store.users.get(user.id);
    if (!stored) throw new Error('missing user');
    stored.roles = ['admin'];
    const adminLogin = await app.inject({ method: 'POST', url: '/v1/auth/login', payload: { email: 'ada@example.com', password: strong } });
    const adminTokens = bodyOf<Success<LoginData>>(adminLogin).data;
    const listed = await app.inject({ method: 'GET', url: '/v1/users?limit=10', headers: { authorization: `Bearer ${adminTokens.access_token}` } });
    expect(listed.statusCode).toBe(200);
    expect(bodyOf<Success<{ users: PublicUser[] }>>(listed).data.users).toHaveLength(1);
    const invalidLimit = await app.inject({ method: 'GET', url: '/v1/users?limit=101', headers: { authorization: `Bearer ${adminTokens.access_token}` } });
    expect(invalidLimit.statusCode).toBe(400);
  });

  it('rotates refresh tokens and detects replay', async () => {
    const { app, store, tokens } = await registered();
    const refreshed = await app.inject({ method: 'POST', url: '/v1/auth/refresh', payload: { refresh_token: tokens.refresh_token } });
    expect(refreshed.statusCode).toBe(200);
    expect(bodyOf<Success<RefreshData>>(refreshed).data.refresh_token).not.toBe(tokens.refresh_token);
    const replay = await app.inject({ method: 'POST', url: '/v1/auth/refresh', payload: { refresh_token: tokens.refresh_token } });
    expect(replay.statusCode).toBe(401);
    expect(bodyOf<Failure>(replay).error.code).toBe('REFRESH_TOKEN_REPLAYED');
    expect(store.audits.map((entry) => entry.action)).toContain('refresh_replayed');
  });

  it('serves health and structured unsupported version errors', async () => {
    const { app } = testApp();
    const health = await app.inject({ method: 'GET', url: '/healthz' });
    expect(bodyOf<Success<{ status: string }>>(health).data.status).toBe('ok');
    const unsupported = await app.inject({ method: 'GET', url: '/v2/users' });
    expect(unsupported.statusCode).toBe(404);
    expect(bodyOf<Failure>(unsupported).error.code).toBe('UNSUPPORTED_API_VERSION');
  });
});
