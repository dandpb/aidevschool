import type { Progress, Upload, UploadError, UploadStatus } from './types';

export class UploadRegistry {
  private readonly uploads = new Map<string, Upload>();
  private readonly cancels = new Map<string, AbortController>();
  private sequence = 0;

  nextId(): string {
    this.sequence += 1;
    return `upl_node_${this.sequence.toString().padStart(6, '0')}`;
  }

  save(upload: Upload): void {
    this.uploads.set(upload.id, structuredClone(upload));
  }

  get(id: string): Upload | undefined {
    const upload = this.uploads.get(id);
    return upload ? structuredClone(upload) : undefined;
  }

  list(filter: { status?: string; limit?: number; cursor?: string }): { items: Upload[]; nextCursor: string | null } {
    const ids = [...this.uploads.keys()].sort();
    const start = filter.cursor ? Math.max(0, ids.indexOf(filter.cursor) + 1) : 0;
    const limit = Math.min(Math.max(filter.limit ?? 100, 1), 100);
    const items: Upload[] = [];
    for (const id of ids.slice(start)) {
      const upload = this.uploads.get(id);
      if (!upload) continue;
      if (!filter.status || upload.status === filter.status) items.push(structuredClone(upload));
      if (items.length === limit) break;
    }
    return { items, nextCursor: start + items.length < ids.length && items.length > 0 ? items[items.length - 1].id : null };
  }

  setCancel(id: string, controller: AbortController): void { this.cancels.set(id, controller); }
  clearCancel(id: string): void { this.cancels.delete(id); }
  cancel(id: string): boolean { const controller = this.cancels.get(id); if (!controller) return false; controller.abort(); return true; }

  mark(upload: Upload, status: UploadStatus, error: UploadError | null = upload.error): Upload {
    const next = { ...upload, status, error, updatedAt: new Date().toISOString() };
    this.save(next);
    return next;
  }
}

export function progressOf(upload: Upload): Progress {
  return {
    id: upload.id,
    status: upload.status,
    receivedBytes: upload.size,
    totalBytes: null,
    progressPercent: upload.status === 'completed' ? 100 : null,
    error: upload.error,
  };
}
