import { existsSync, mkdirSync } from 'fs';
import { readFile, readdir, stat, unlink, writeFile } from 'fs/promises';
import { join } from 'path';
import { IStorageProvider, FileMetadata, LockInfo, LockResult } from './IStorageProvider';

interface LocalLockData {
  [fileId: string]: {
    lock: string;
    etag: string;
    lockedAt: string;
    lastRefreshed: string;
  };
}

export class LocalStorageProvider implements IStorageProvider {
  private filesDir: string;
  private locksFile: string;
  private idMap: { [key: string]: string } = {};
  private locks: LocalLockData = {};

  constructor() {
    this.filesDir = join(process.cwd(), 'files');
    this.locksFile = join(process.cwd(), 'locks.json');
    this.ensureFilesDir();
    this.loadLocks();
  }

  private ensureFilesDir(): void {
    if (!existsSync(this.filesDir)) {
      mkdirSync(this.filesDir, { recursive: true });
    }
  }

  private async loadLocks(): Promise<void> {
    try {
      if (existsSync(this.locksFile)) {
        const data = await readFile(this.locksFile, 'utf-8');
        this.locks = JSON.parse(data);
      }
    } catch (err) {
      console.error('Error loading locks:', err);
      this.locks = {};
    }
  }

  private async saveLocks(): Promise<void> {
    try {
      await writeFile(this.locksFile, JSON.stringify(this.locks, null, 2));
    } catch (err) {
      console.error('Error saving locks:', err);
    }
  }

  async getFilePath(fileId: string): Promise<string> {
    try {
      let id = '';

      if (Object.hasOwnProperty.call(this.idMap, fileId)) {
        id = this.idMap[fileId];
      }

      const files = await readdir(this.filesDir);

      for (const name of files) {
        const curFilePath = join(this.filesDir, name);

        if (existsSync(curFilePath)) {
          const stats = await stat(curFilePath);
          const n = stats.ino.toString();

          if (n === fileId || name === fileId) {
            this.idMap[name] = n;
            id = n;
            break;
          }
        }
      }

      for (const name of files) {
        const fp = join(this.filesDir, name);
        const stats = await stat(fp);

        if (stats.ino.toString() === id) {
          return fp;
        }
      }

      if (!id) {
        id = join(this.filesDir, fileId);
        this.idMap[fileId] = id;
      }

      return id;
    } catch (err: any) {
      console.error((err as Error).message || err);
      return '';
    }
  }

  async getFile(fileId: string): Promise<Buffer> {
    const filePath = await this.getFilePath(fileId);
    
    if (!existsSync(filePath)) {
      throw new Error('File not found');
    }

    return await readFile(filePath);
  }

  async putFile(fileId: string, content: Buffer): Promise<{ version: string; etag: string }> {
    const filePath = await this.getFilePath(fileId);

    if (!existsSync(filePath)) {
      await writeFile(filePath, new Uint8Array(Buffer.from('')));
    }

    await writeFile(filePath, new Uint8Array(content));
    const fileStats = await stat(filePath);
    const version = fileStats.mtimeMs.toString();
    const etag = `"${fileStats.mtimeMs}-${fileStats.size}"`;

    // Update lock etag if file is locked
    if (this.locks[fileId]) {
      this.locks[fileId].etag = etag;
      await this.saveLocks();
    }

    return { version, etag };
  }

  async getFileMetadata(fileId: string): Promise<FileMetadata> {
    const filePath = await this.getFilePath(fileId);

    if (!existsSync(filePath)) {
      throw new Error('File not found');
    }

    const fileStats = await stat(filePath);
    const version = fileStats.mtimeMs.toString();
    const etag = `"${fileStats.mtimeMs}-${fileStats.size}"`;

    return {
      size: fileStats.size,
      lastModified: fileStats.mtime,
      version,
      etag,
    };
  }

  async deleteFile(fileId: string): Promise<void> {
    const filePath = await this.getFilePath(fileId);

    if (existsSync(filePath)) {
      await unlink(filePath);
    }

    // Remove lock if exists
    if (this.locks[fileId]) {
      delete this.locks[fileId];
      await this.saveLocks();
    }
  }

  async fileExists(fileId: string): Promise<boolean> {
    const filePath = await this.getFilePath(fileId);
    return existsSync(filePath);
  }

  async getLock(fileId: string): Promise<LockInfo | null> {
    if (!this.locks[fileId]) {
      return null;
    }

    const lockData = this.locks[fileId];
    
    // Check if file etag matches - if not, lock was broken
    try {
      const metadata = await this.getFileMetadata(fileId);
      if (metadata.etag !== lockData.etag) {
        // Lock was broken - file was modified
        delete this.locks[fileId];
        await this.saveLocks();
        return null;
      }
    } catch (err) {
      // File doesn't exist anymore
      delete this.locks[fileId];
      await this.saveLocks();
      return null;
    }

    return {
      lock: lockData.lock,
      etag: lockData.etag,
      lockedAt: new Date(lockData.lockedAt),
      lastRefreshed: new Date(lockData.lastRefreshed),
    };
  }

  async setLock(fileId: string, lockValue: string, oldLock?: string): Promise<LockResult> {
    const existingLock = await this.getLock(fileId);

    // If there's an existing lock and it doesn't match the old lock or new lock, conflict
    if (existingLock && existingLock.lock !== lockValue && existingLock.lock !== oldLock) {
      return {
        success: false,
        currentLock: existingLock.lock,
        etag: existingLock.etag,
      };
    }

    // Get current file etag
    const metadata = await this.getFileMetadata(fileId);

    // Set the lock
    this.locks[fileId] = {
      lock: lockValue,
      etag: metadata.etag,
      lockedAt: new Date().toISOString(),
      lastRefreshed: new Date().toISOString(),
    };

    await this.saveLocks();

    return {
      success: true,
      etag: metadata.etag,
    };
  }

  async refreshLock(fileId: string, lockValue: string): Promise<LockResult> {
    const existingLock = await this.getLock(fileId);

    if (!existingLock) {
      return {
        success: false,
        currentLock: '',
      };
    }

    if (existingLock.lock !== lockValue) {
      return {
        success: false,
        currentLock: existingLock.lock,
      };
    }

    // Update last refreshed time
    this.locks[fileId].lastRefreshed = new Date().toISOString();
    await this.saveLocks();

    return {
      success: true,
    };
  }

  async unlock(fileId: string, lockValue: string): Promise<LockResult> {
    const existingLock = await this.getLock(fileId);

    if (!existingLock) {
      return {
        success: false,
        currentLock: '',
      };
    }

    if (existingLock.lock !== lockValue) {
      return {
        success: false,
        currentLock: existingLock.lock,
      };
    }

    delete this.locks[fileId];
    await this.saveLocks();

    return {
      success: true,
    };
  }
}