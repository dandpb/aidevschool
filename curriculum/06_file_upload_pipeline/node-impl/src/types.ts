export type UploadStatus = 'receiving' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface UploadError {
  code: string;
  message: string;
  retryable: boolean;
}

export interface Chunk {
  index: number;
  offset: number;
  size: number;
  receivedAt: string;
}

export interface UploadMetadata {
  mimeType: string;
  extension: string;
  width?: number;
  height?: number;
  clientMetadata?: Record<string, string>;
  thumbnailStatus: string;
}

export interface Upload {
  id: string;
  filename: string;
  size: number;
  chunks: Chunk[];
  status: UploadStatus;
  checksum: string | null;
  expectedChecksum?: string;
  metadata: UploadMetadata;
  storagePath: string;
  thumbnailPath?: string;
  error: UploadError | null;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface Progress {
  id: string;
  status: UploadStatus;
  receivedBytes: number;
  totalBytes: number | null;
  progressPercent: number | null;
  error: UploadError | null;
}
