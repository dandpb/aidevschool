import { buildApp } from './app';

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  process.stderr.write('JWT_SECRET is required and no default is provided. Generate one for local runs: export JWT_SECRET="$(openssl rand -hex 32)"\n');
  process.exit(1);
}

const { app } = buildApp({
  config: {
    jwtSecret,
    issuer: process.env.JWT_ISSUER ?? 'ai-devschool-project-07',
    audience: process.env.JWT_AUDIENCE ?? 'project-07-learners',
    accessTokenSeconds: Number(process.env.ACCESS_TOKEN_SECONDS ?? '900'),
    refreshTokenSeconds: Number(process.env.REFRESH_TOKEN_SECONDS ?? '604800')
  }
});

const shutdown = async (): Promise<void> => {
  await app.close();
  process.exit(0);
};
process.on('SIGTERM', () => { void shutdown(); });
process.on('SIGINT', () => { void shutdown(); });

void app.listen({ host: '0.0.0.0', port: Number(process.env.PORT ?? '8080') });
