import crypto from 'node:crypto';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { loadConfig } from '../config';
import { buildApp } from '../server';

async function app(overrides: Record<string, unknown> = {}) {
  return buildApp({ ...loadConfig({}), storageDir: path.join(os.tmpdir(), `node-upload-edge-${crypto.randomUUID()}`), ...overrides });
}

const attach = (server: Awaited<ReturnType<typeof app>>, data: Buffer, filename = 'note.txt') =>
  request(server).post('/upload').attach('file', data, { filename, contentType: 'text/plain' });

const sha256 = (data: Buffer | string): string => `sha256:${crypto.createHash('sha256').update(data).digest('hex')}`;

describe('file upload pipeline edge cases', () => {
  it('rejects zero-byte uploads by default and accepts them only when explicitly allowed', async () => {
    const strict = await app();
    const rejected = await attach(strict, Buffer.alloc(0), 'empty.txt');
    expect(rejected.status).toBe(400);
    expect(rejected.body.error.code).toBe('invalid_file_type');

    const permissive = await app({ allowEmptyFiles: true });
    const accepted = await attach(permissive, Buffer.alloc(0), 'empty.txt');
    expect(accepted.status).toBe(201);
    expect(accepted.body.status).toBe('completed');
    expect(accepted.body.size).toBe(0);
    expect(accepted.body.checksum).toBe(sha256(Buffer.alloc(0)));
  });

  it('cleans partial artifacts after oversize rejection and checksum mismatch', async () => {
    const storageDir = path.join(os.tmpdir(), `node-upload-edge-${crypto.randomUUID()}`);
    const server = await buildApp({ ...loadConfig({}), storageDir, maxUploadBytes: 4 });

    const oversize = await attach(server, Buffer.from('12345'), 'big.txt');
    expect(oversize.status).toBe(413);
    expect(oversize.body.error.code).toBe('size_exceeded');

    const mismatch = await request(server).post('/upload').field('expectedChecksum', sha256('different-bytes')).attach('file', Buffer.from('1234'), { filename: 'ok.txt', contentType: 'text/plain' });
    expect(mismatch.status).toBe(409);

    expect(await fsp.readdir(path.join(storageDir, 'tmp'))).toEqual([]);
    expect(await fsp.readdir(path.join(storageDir, 'files'))).toEqual([]);
  });

  it('keeps concurrent identical uploads as separate records and artifacts', async () => {
    const server = await app();
    const data = Buffer.from('shared payload for concurrency');
    const [first, second] = await Promise.all([attach(server, data, 'same.txt'), attach(server, data, 'same.txt')]);
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(first.body.id).not.toBe(second.body.id);
    expect(first.body.checksum).toBe(sha256(data));
    expect(second.body.checksum).toBe(sha256(data));
    await expect(fsp.access(first.body.storagePath)).resolves.toBeUndefined();
    await expect(fsp.access(second.body.storagePath)).resolves.toBeUndefined();
  });

  it('contains traversal filenames inside the files directory', async () => {
    const server = await app();
    const res = await attach(server, Buffer.from('safe'), '../../../etc/passwd.txt');
    expect(res.status).toBe(201);
    expect(res.body.filename).toBe('passwd.txt');
    expect(path.dirname(res.body.storagePath)).not.toContain('..');
  });

  it('rejects invalid pagination and filter parameters', async () => {
    const server = await app();
    await attach(server, Buffer.from('x'));

    const badLimit = await request(server).get('/files?limit=abc');
    expect(badLimit.status).toBe(400);
    expect(badLimit.body.error.code).toBe('invalid_pagination');

    const zeroLimit = await request(server).get('/files?limit=0');
    expect(zeroLimit.status).toBe(400);
    expect(zeroLimit.body.error.code).toBe('invalid_pagination');

    const badStatus = await request(server).get('/files?status=bogus');
    expect(badStatus.status).toBe(400);
    expect(badStatus.body.error.code).toBe('invalid_filter');

    const ok = await request(server).get('/files?status=completed&limit=1');
    expect(ok.status).toBe(200);
    expect(ok.body.items).toHaveLength(1);
  });

  it('walks cursor pagination across pages', async () => {
    const server = await app();
    const ids: string[] = [];
    for (const payload of ['one', 'two', 'three']) {
      const res = await attach(server, Buffer.from(payload));
      expect(res.status).toBe(201);
      ids.push(res.body.id);
    }
    const firstPage = await request(server).get('/files?limit=2');
    expect(firstPage.status).toBe(200);
    expect(firstPage.body.items.map((item: { id: string }) => item.id)).toEqual(ids.slice(0, 2));
    expect(firstPage.body.nextCursor).toBe(ids[1]);

    const secondPage = await request(server).get(`/files?limit=2&cursor=${firstPage.body.nextCursor}`);
    expect(secondPage.status).toBe(200);
    expect(secondPage.body.items.map((item: { id: string }) => item.id)).toEqual([ids[2]]);
    expect(secondPage.body.nextCursor).toBeNull();
  });

  it('accepts chunked transfer uploads without Content-Length and verifies the checksum', async () => {
    const server = await app();
    const listener = http.createServer(server);
    try {
      await new Promise<void>((resolve, reject) => listener.once('error', reject).listen(0, '127.0.0.1', () => resolve()));
      const { port } = listener.address() as AddressInfo;
      const boundary = 'edgechunkboundary';
      const body = [
        `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="chunked.txt"\r\nContent-Type: text/plain\r\n\r\n`,
        'chunked payload data',
        `\r\n--${boundary}--\r\n`,
      ].join('');
      const res = await new Promise<{ status: number; body: string }>((resolve, reject) => {
        const req = http.request(
          { host: '127.0.0.1', port, method: 'POST', path: '/upload', headers: { 'content-type': `multipart/form-data; boundary=${boundary}`, 'transfer-encoding': 'chunked' } },
          (r) => {
            let out = '';
            r.on('data', (chunk: Buffer) => { out += chunk.toString('utf8'); });
            r.on('end', () => resolve({ status: r.statusCode ?? 0, body: out }));
          },
        );
        req.on('error', reject);
        req.write(body.slice(0, 24));
        req.write(body.slice(24));
        req.end();
      });
      expect(res.status).toBe(201);
      const parsed = JSON.parse(res.body) as { status: string; checksum: string; filename: string };
      expect(parsed.status).toBe('completed');
      expect(parsed.filename).toBe('chunked.txt');
      expect(parsed.checksum).toBe(sha256('chunked payload data'));
    } finally {
      listener.close();
      listener.closeAllConnections?.();
    }
  });
});
