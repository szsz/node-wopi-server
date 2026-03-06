export interface FileMetadata {
  size: number;
  lastModified: Date;
  version: string;
  etag: string;
}

export interface LockInfo {
  lock: string;
  etag: string;
  lockedAt?: Date;
  lastRefreshed?: Date;
}

export interface LockResult {
  success: boolean;
  currentLock?: string;
  etag?: string;
}

export interface IStorageProvider {
  // File operations
  getFile(fileId: string): Promise<Buffer>;
  putFile(fileId: string, content: Buffer): Promise<{ version: string; etag: string }>;
  getFileMetadata(fileId: string): Promise<FileMetadata>;
  deleteFile(fileId: string): Promise<void>;
  fileExists(fileId: string): Promise<boolean>;
  getFilePath(fileId: string): Promise<string>;

  // Lock operations
  getLock(fileId: string): Promise<LockInfo | null>;
  setLock(fileId: string, lockValue: string, oldLock?: string): Promise<LockResult>;
  refreshLock(fileId: string, lockValue: string): Promise<LockResult>;
  unlock(fileId: string, lockValue: string): Promise<LockResult>;
}