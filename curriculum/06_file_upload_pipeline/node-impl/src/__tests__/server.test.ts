import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { loadConfig } from '../config';
import { progressOf, UploadRegistry } from '../registry';
import { buildApp, sanitizeFilename, guessMime, UploadService } from '../server';

async function app(maxUploadBytes = 1024 * 1024) {
  return buildApp({ ...loadConfig({}), storageDir: path.join(os.tmpdir(), `node-upload-test-${crypto.randomUUID()}`), maxUploadBytes });
}

describe('file upload pipeline', () => {
  it('streams a multipart upload, computes checksum, stores metadata, lists status and deletes', async () => {
    const server = await app();
    const data = Buffer.from('hello node stream');
    const checksum = `sha256:${crypto.createHash('sha256').update(data).digest('hex')}`;
    const upload = await request(server).post('/upload').field('expectedChecksum', checksum).field('owner', 'learner').attach('file', data, { filename: 'note.txt', contentType: 'text/plain' }).expect(201);
    expect(upload.body.status).toBe('completed');
    expect(upload.body.checksum).toBe(checksum);
    expect(upload.body.metadata.clientMetadata.owner).toBe('learner');
    const id = upload.body.id;
    await request(server).get('/healthz').expect(200);
    await request(server).get('/files?status=completed&limit=1').expect(200).expect((res) => expect(res.body.items[0].id).toBe(id));
    await request(server).get(`/files/${id}`).expect(200).expect((res) => expect(res.body.size).toBe(data.length));
    await request(server).get(`/files/${id}/status`).expect(200).expect((res) => expect(res.body.progressPercent).toBe(100));
    await request(server).delete(`/files/${id}`).expect(202).expect((res) => expect(res.body.status).toBe('cancelled'));
  });

  it('rejects invalid type, oversize files, checksum mismatch, malformed requests and missing records', async () => {
    const server = await app(5);
    await request(server).post('/upload').attach('file', Buffer.from('x'), { filename: 'bad.exe', contentType: 'application/x-msdownload' }).expect(415);
    await request(server).post('/upload').attach('file', Buffer.from('123456'), { filename: 'big.txt', contentType: 'text/plain' }).expect(413);
    await request(server).post('/upload').field('expectedChecksum', 'sha256:bad').attach('file', Buffer.from('123'), { filename: 'ok.txt', contentType: 'text/plain' }).expect(409);
    await request(server).post('/upload').send('bad').expect(400);
    await request(server).get('/files/nope').expect(404);
    await request(server).delete('/files/nope').expect(404);
  });

  it('keeps helper logic bounded and cancellable', async () => {
    expect(sanitizeFilename('../../x.txt')).toBe('x.txt');
    expect(guessMime('.png')).toBe('image/png');
    const registry = new UploadRegistry();
    const controller = new AbortController();
    registry.setCancel('a', controller);
    expect(registry.cancel('a')).toBe(true);
    expect(controller.signal.aborted).toBe(true);
    const service = new UploadService({ ...loadConfig({}), storageDir: path.join(os.tmpdir(), `node-upload-test-${crypto.randomUUID()}`), maxUploadBytes: 10 });
    await service.ensureStorage();
    const upload = service.createInitialUpload('cancelled');
    const stream = Readable.from([Buffer.from('abc')]);
    await expect(service.processFile(upload, stream, { filename: 'x.txt', encoding: '7bit', mimeType: 'text/plain' }, undefined, controller.signal)).rejects.toMatchObject({ statusCode: 202 });
    expect(progressOf({ ...upload, status: 'completed', size: 3 })).toMatchObject({ progressPercent: 100, receivedBytes: 3 });
  });
});
