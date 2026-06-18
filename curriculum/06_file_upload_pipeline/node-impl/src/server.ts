import crypto from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { once } from 'node:events';
import express, { type Request, type Response, type NextFunction } from 'express';
import Busboy from 'busboy';
import pino, { type Logger } from 'pino';
import type { Config } from './config';
import { loadConfig } from './config';
import { progressOf, UploadRegistry } from './registry';
import type { Chunk, Upload, UploadError } from './types';

interface StreamFailure { statusCode: number; error: UploadError }
type UploadResult = { ok: true; upload: Upload } | { ok: false; error: unknown };
const streamFailure = (statusCode: number, code: string, message: string, retryable: boolean): StreamFailure => ({ statusCode, error: { code, message, retryable } });

export class UploadService {
  readonly registry = new UploadRegistry();
  constructor(readonly cfg: Config, readonly logger: Logger = pino({ enabled: false })) {}

  async ensureStorage(): Promise<void> {
    await fsp.mkdir(path.join(this.cfg.storageDir, 'tmp'), { recursive: true });
    await fsp.mkdir(path.join(this.cfg.storageDir, 'files'), { recursive: true });
  }

  createInitialUpload(id: string): Upload {
    const now = new Date().toISOString();
    return { id, filename: '', size: 0, chunks: [], status: 'receiving', checksum: null, metadata: { mimeType: '', extension: '', clientMetadata: {}, thumbnailStatus: 'pending' }, storagePath: '', error: null, createdAt: now, updatedAt: now };
  }

  async processFile(upload: Upload, file: NodeJS.ReadableStream, info: Busboy.FileInfo, expectedChecksum: string | undefined, signal: AbortSignal): Promise<Upload> {
    const filename = sanitizeFilename(info.filename || 'upload.bin');
    const extension = path.extname(filename).toLowerCase();
    const mimeType = info.mimeType || guessMime(extension);
    upload.filename = filename;
    upload.expectedChecksum = expectedChecksum;
    upload.metadata.extension = extension;
    upload.metadata.mimeType = mimeType;
    if (!this.cfg.allowedExtensions.has(extension) || !this.cfg.allowedMimeTypes.has(mimeType)) {
      file.resume();
      throw streamFailure(415, 'invalid_file_type', 'file type is not allowed', false);
    }
    const tmpPath = path.join(this.cfg.storageDir, 'tmp', `${upload.id}.part`);
    const finalPath = path.join(this.cfg.storageDir, 'files', `${upload.id}${extension}`);
    const writer = fs.createWriteStream(tmpPath, { flags: 'wx' });
    const hash = crypto.createHash('sha256');
    let offset = 0;
    let index = 0;
    let deferredFailure: StreamFailure | undefined;
    const cleanup = async (): Promise<void> => { writer.destroy(); await fsp.rm(tmpPath, { force: true }); };
    try {
      for await (const chunk of file) {
        if (signal.aborted) {
          throw streamFailure(202, 'network_interruption', 'upload cancelled', true);
        }
        const bytes = typeof chunk === 'string' ? Buffer.from(chunk) : Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array);
        upload.size += bytes.length;
        if (upload.size > this.cfg.maxUploadBytes) {
          deferredFailure = streamFailure(413, 'size_exceeded', 'maximum upload size exceeded', false);
          continue;
        }
        if (deferredFailure) continue;
        hash.update(bytes);
        if (!writer.write(bytes)) await once(writer, 'drain');
        const receivedAt = new Date().toISOString();
        const record: Chunk = { index, offset, size: bytes.length, receivedAt };
        upload.chunks.push(record);
        offset += bytes.length;
        index += 1;
        upload.updatedAt = receivedAt;
        this.registry.save(upload);
      }
      if (deferredFailure) throw deferredFailure;
      writer.end();
      await once(writer, 'finish');
      const checksum = `sha256:${hash.digest('hex')}`;
      upload.checksum = checksum;
      if (expectedChecksum && expectedChecksum !== checksum && expectedChecksum !== checksum.replace('sha256:', '')) {
        throw streamFailure(409, 'checksum_mismatch', 'computed checksum did not match expected checksum', false);
      }
      upload.status = 'processing';
      this.registry.save(upload);
      await fsp.rename(tmpPath, finalPath);
      upload.status = 'completed';
      upload.storagePath = finalPath;
      upload.metadata.thumbnailStatus = mimeType.startsWith('image/') ? 'documented: temp-file-backed thumbnail processor' : 'not_applicable';
      upload.completedAt = new Date().toISOString();
      upload.updatedAt = upload.completedAt;
      this.registry.save(upload);
      return upload;
    } catch (error) {
      await cleanup();
      throw error;
    }
  }
}

export async function buildApp(cfg: Config = loadConfig(), logger: Logger = pino({ enabled: false })): Promise<express.Express> {
  const service = new UploadService(cfg, logger);
  await service.ensureStorage();
  const app = express();
  app.set('uploadService', service);
  app.use((req, _res, next) => { logger.info({ method: req.method, path: req.path }, 'request'); next(); });
  app.get('/healthz', (_req, res) => res.json({ status: 'ok' }));
  app.post('/upload', (req, res, next) => { void handleUpload(service, req, res).catch(next); });
  app.get('/files', (req, res) => {
    const limit = typeof req.query.limit === 'string' ? Number.parseInt(req.query.limit, 10) : undefined;
    res.json(service.registry.list({ status: stringQuery(req.query.status), cursor: stringQuery(req.query.cursor), limit }));
  });
  app.get('/files/:id/status', (req, res) => {
    const upload = service.registry.get(req.params.id);
    if (!upload) return res.status(404).json({ error: { code: 'not_found', message: 'upload not found', retryable: false } });
    return res.json(progressOf(upload));
  });
  app.get('/files/:id', (req, res) => {
    const upload = service.registry.get(req.params.id);
    if (!upload) return res.status(404).json({ error: { code: 'not_found', message: 'upload not found', retryable: false } });
    return res.json(upload);
  });
  app.delete('/files/:id', async (req, res) => {
    const upload = service.registry.get(req.params.id);
    if (!upload) return res.status(404).json({ error: { code: 'not_found', message: 'upload not found', retryable: false } });
    service.registry.cancel(upload.id);
    if (upload.storagePath) await fsp.rm(upload.storagePath, { force: true });
    service.registry.save({ ...upload, status: 'cancelled', updatedAt: new Date().toISOString() });
    return res.status(202).json({ id: upload.id, status: 'cancelled' });
  });
  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const failure = isStreamFailure(error) ? error : streamFailure(500, 'internal_error', 'internal error', true);
    res.status(failure.statusCode).json({ error: failure.error });
  });
  return app;
}

async function handleUpload(service: UploadService, req: Request, res: Response): Promise<void> {
  const controller = new AbortController();
  const id = req.header('x-upload-id') ?? service.registry.nextId();
  service.registry.setCancel(id, controller);
  const upload = service.createInitialUpload(id);
  service.registry.save(upload);
  let busboy: Busboy.Busboy;
  try {
    busboy = Busboy({ headers: req.headers, limits: { fileSize: service.cfg.maxUploadBytes + 1 } });
  } catch (_error) {
    throw streamFailure(400, 'malformed_multipart', 'request must be multipart', false);
  }
  let expectedChecksum: string | undefined;
  let completed: Promise<UploadResult> | undefined;
  let failure: unknown;
  busboy.on('field', (name, value) => {
    if (name === 'expectedChecksum') expectedChecksum = value;
    else upload.metadata.clientMetadata = { ...(upload.metadata.clientMetadata ?? {}), [name]: value };
  });
  busboy.on('file', (_name, file, info) => { completed = service.processFile(upload, file, info, expectedChecksum, controller.signal).then((processed): UploadResult => ({ ok: true, upload: processed })).catch((error: unknown): UploadResult => ({ ok: false, error })); });
  busboy.on('error', (error: unknown) => { failure = streamFailure(400, 'malformed_multipart', error instanceof Error ? error.message : 'malformed multipart', false); });
  req.pipe(busboy);
  await once(busboy, 'close');
  if (failure) throw failure;
  if (!completed) throw streamFailure(400, 'malformed_multipart', 'missing file part', false);
  try {
    const result = await completed;
    if (!result.ok) throw result.error;
    res.status(201).json(result.upload);
  } catch (error) {
    const failed = isStreamFailure(error) ? error : streamFailure(500, 'internal_error', 'internal error', true);
    const status = failed.statusCode === 202 ? 'cancelled' : 'failed';
    service.registry.save({ ...upload, status, error: failed.error, updatedAt: new Date().toISOString() });
    res.status(failed.statusCode).json(failed.statusCode === 202 ? { id, status } : { error: failed.error });
  } finally {
    service.registry.clearCancel(id);
  }
}

function isStreamFailure(error: unknown): error is StreamFailure {
  return typeof error === 'object' && error !== null && 'statusCode' in error && 'error' in error;
}

function stringQuery(value: unknown): string | undefined { return typeof value === 'string' ? value : undefined; }
export function sanitizeFilename(filename: string): string { return path.basename(filename) || 'upload.bin'; }
export function guessMime(extension: string): string { return extension === '.txt' ? 'text/plain' : extension === '.png' ? 'image/png' : extension === '.jpg' || extension === '.jpeg' ? 'image/jpeg' : extension === '.gif' ? 'image/gif' : 'application/octet-stream'; }
