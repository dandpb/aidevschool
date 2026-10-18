import { describe, expect, it } from 'vitest';
import jwt from 'jsonwebtoken';
import type { FastifyInstance } from 'fastify';
import { buildApp, defaultConfig } from '../app';

const strong = 'CorrectHorse1Battery';
const testJwtSecret = 'project-07-security-fixture-secret';

interface PublicUser { id: string; email: string; display_name: string; roles: string[]; status: string }
interface Success<T> { data: T; request_id: string }
interface Failure { error: { code: string; message: string; details: Array<{ field: string; reason: string }> }; request_id: string }
interface LoginData { access_token: string; refresh_token: string; user: PublicUser }
interface RefreshData { access_token: string; refresh_token: string }
const bodyOf = <T>(response: { json: () => unknown }): T => response.json() as T;
const errorCodeOf = (response: { json: () => unknown }): string => bodyOf<Failure>(response).error.code;

function mutableClock(startMs = Date.parse('2026-06-17T00:00:00.000Z')) {
  let current = startMs;
  return { now: (): Date => new Date(current), advance: (seconds: number): void => { current += seconds * 1000; } };
}

const testApp = (config: Record<string, unknown> = {}, clock?: { now(): Date }) =>
  buildApp({ config: { passwordIterations: 100, jwtSecret: testJwtSecret, ...config }, clock });

async function registerAndLogin(built: { app: FastifyInstance }, email = 'sec@example.com', password = strong): Promise<LoginData> {
  await built.app.inject({ method: 'POST', url: '/v1/auth/register', payload: { email, password } });
  const login = await built.app.inject({ method: 'POST', url: '/v1/auth/login', payload: { email, password } });
  return bodyOf<Success<LoginData>>(login).data;
}

const auth = (token: string): Record<string, string> => ({ authorization: `Bearer ${token}` });

describe('REST API auth security edges', () => {
  it('rejects access tokens signed with a foreign secret', async () => {
    const { app, store } = testApp();
    const forged = jwt.sign(
      { sub: 'usr_forged', email: 'forged@example.com', roles: ['admin'], jti: 'jti_forged' },
      'attacker-controlled-secret',
      { algorithm: 'HS256', issuer: defaultConfig.issuer, audience: defaultConfig.audience },
    );
    const res = await app.inject({ method: 'GET', url: '/v1/users', headers: auth(forged) });
    expect(res.statusCode).toBe(401);
    expect(errorCodeOf(res)).toBe('UNAUTHENTICATED');
    expect(store.audits.map((entry) => entry.action)).toContain('token_verify_failed');
  });

  it('rejects access tokens using a disallowed algorithm even with the right secret', async () => {
    const { app } = testApp();
    const tokens = await registerAndLogin({ app });
    const decoded = jwt.decode(tokens.access_token) as unknown as { sub: string; email: string; roles: string[]; jti: string };
    const hs512 = jwt.sign({ sub: decoded.sub, email: decoded.email, roles: decoded.roles, jti: decoded.jti }, testJwtSecret, { algorithm: 'HS512', issuer: defaultConfig.issuer, audience: defaultConfig.audience, expiresIn: 900 });
    const res = await app.inject({ method: 'PUT', url: `/v1/users/${tokens.user.id}`, headers: auth(hs512), payload: { display_name: 'Alg Confusion' } });
    expect(res.statusCode).toBe(401);
    expect(errorCodeOf(res)).toBe('UNAUTHENTICATED');
  });

  it('rejects expired access tokens once the clock passes the lifetime', async () => {
    const clock = mutableClock();
    const built = testApp({}, clock);
    const tokens = await registerAndLogin(built);
    const before = await built.app.inject({ method: 'PUT', url: `/v1/users/${tokens.user.id}`, headers: auth(tokens.access_token), payload: { display_name: 'Still Valid' } });
    expect(before.statusCode).toBe(200);

    clock.advance(defaultConfig.accessTokenSeconds + 1);
    const after = await built.app.inject({ method: 'PUT', url: `/v1/users/${tokens.user.id}`, headers: auth(tokens.access_token), payload: { display_name: 'Too Late' } });
    expect(after.statusCode).toBe(401);
    expect(errorCodeOf(after)).toBe('UNAUTHENTICATED');
  });

  it('expires refresh tokens past their lifetime', async () => {
    const clock = mutableClock();
    const built = testApp({ refreshTokenSeconds: 60 }, clock);
    const tokens = await registerAndLogin(built);
    clock.advance(61);
    const res = await built.app.inject({ method: 'POST', url: '/v1/auth/refresh', payload: { refresh_token: tokens.refresh_token } });
    expect(res.statusCode).toBe(401);
    expect(errorCodeOf(res)).toBe('INVALID_REFRESH_TOKEN');
  });

  it('blocks cross-user updates for non-admin principals and audits the denial', async () => {
    const { app, store } = testApp();
    const alice = await registerAndLogin({ app }, 'alice@example.com');
    const bob = await registerAndLogin({ app }, 'bob@example.com');
    const res = await app.inject({ method: 'PUT', url: `/v1/users/${bob.user.id}`, headers: auth(alice.access_token), payload: { display_name: 'Hijacked' } });
    expect(res.statusCode).toBe(403);
    expect(errorCodeOf(res)).toBe('FORBIDDEN');
    expect(store.audits.find((entry) => entry.action === 'authorization_forbidden')?.targetUserId).toBe(bob.user.id);
  });

  it('returns 404 USER_NOT_FOUND when updating an unknown id', async () => {
    const { app } = testApp();
    const tokens = await registerAndLogin({ app });
    const res = await app.inject({ method: 'PUT', url: '/v1/users/usr_does-not-exist', headers: auth(tokens.access_token), payload: { display_name: 'Ghost' } });
    expect(res.statusCode).toBe(404);
    expect(errorCodeOf(res)).toBe('USER_NOT_FOUND');
  });

  it('denies login and refresh for disabled users', async () => {
    const built = testApp();
    const tokens = await registerAndLogin(built, 'disabled@example.com');
    const stored = built.store.users.get(tokens.user.id);
    if (!stored) throw new Error('missing user');
    stored.status = 'disabled';

    const login = await built.app.inject({ method: 'POST', url: '/v1/auth/login', payload: { email: 'disabled@example.com', password: strong } });
    expect(login.statusCode).toBe(401);
    expect(errorCodeOf(login)).toBe('INVALID_CREDENTIALS');
    const refresh = await built.app.inject({ method: 'POST', url: '/v1/auth/refresh', payload: { refresh_token: tokens.refresh_token } });
    expect(refresh.statusCode).toBe(401);
    expect(errorCodeOf(refresh)).toBe('INVALID_REFRESH_TOKEN');
  });

  it('keeps rejecting replayed refresh tokens after further rotations', async () => {
    const { app } = testApp();
    const first = await registerAndLogin({ app });
    const secondRes = await app.inject({ method: 'POST', url: '/v1/auth/refresh', payload: { refresh_token: first.refresh_token } });
    expect(secondRes.statusCode).toBe(200);
    const second = bodyOf<Success<RefreshData>>(secondRes).data.refresh_token;
    const thirdRes = await app.inject({ method: 'POST', url: '/v1/auth/refresh', payload: { refresh_token: second } });
    expect(thirdRes.statusCode).toBe(200);

    const replayParent = await app.inject({ method: 'POST', url: '/v1/auth/refresh', payload: { refresh_token: first.refresh_token } });
    expect(replayParent.statusCode).toBe(401);
    expect(errorCodeOf(replayParent)).toBe('REFRESH_TOKEN_REPLAYED');
    const replayMiddle = await app.inject({ method: 'POST', url: '/v1/auth/refresh', payload: { refresh_token: second } });
    expect(replayMiddle.statusCode).toBe(401);
  });

  it('enforces password and email shape on registration with field-level details', async () => {
    const { app } = testApp();
    const shortPassword = await app.inject({ method: 'POST', url: '/v1/auth/register', payload: { email: 'short@example.com', password: 'Short1abcde' } });
    expect(shortPassword.statusCode).toBe(400);
    expect(bodyOf<Failure>(shortPassword).error.details).toContainEqual(expect.objectContaining({ field: 'password' }));

    const noDigit = await app.inject({ method: 'POST', url: '/v1/auth/register', payload: { email: 'nodigit@example.com', password: 'NoDigitsHereAtAll' } });
    expect(noDigit.statusCode).toBe(400);

    const badEmail = await app.inject({ method: 'POST', url: '/v1/auth/register', payload: { email: 'no-tld@example', password: strong } });
    expect(badEmail.statusCode).toBe(400);
    expect(bodyOf<Failure>(badEmail).error.details).toContainEqual(expect.objectContaining({ field: 'email' }));

    const unknownField = await app.inject({ method: 'POST', url: '/v1/auth/login', payload: { email: 'a@example.com', password: strong, extra: 'x' } });
    expect(unknownField.statusCode).toBe(400);
  });
});
