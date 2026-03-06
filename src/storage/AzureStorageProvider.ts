import { BlobServiceClient, ContainerClient, BlockBlobClient, StorageSharedKeyCredential } from '@azure/storage-blob';
import { TableClient, AzureNamedKeyCredential } from '@azure/data-tables';
import { IStorageProvider, FileMetadata, LockInfo, LockResult } from './IStorageProvider';

interface LockEntity {
  partitionKey: string;
  rowKey: string;
  lockValue: string;
  blobETag: string;
  lockedAt: Date;
  lastRefreshed: Date;
  etag?: string;
}

export class AzureStorageProvider implements IStorageProvider {
  private containerClient: ContainerClient;
  private tableClient: TableClient;
  private accountName: string;
  private accountKey: string;
  private containerName: string;
  private lockTableName: string;

  constructor() {
    this.accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME || '';
    this.accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY || '';
    this.containerName = process.env.AZURE_STORAGE_CONTAINER || 'wopi-files';
    this.lockTableName = process.env.AZURE_STORAGE_LOCK_TABLE || 'WopiLocks';

    if (!this.accountName || !this.accountKey) {
      throw new Error('Azure Storage account name and key must be provided');
    }

    // Initialize Blob Service Client
    const blobServiceClient = new BlobServiceClient(
      `https://${this.accountName}.blob.core.windows.net`,
      new StorageSharedKeyCredential(this.accountName, this.accountKey)
    );

    this.containerClient = blobServiceClient.getContainerClient(this.containerName);

    // Initialize Table Client
    this.tableClient = new TableClient(
      `https://${this.accountName}.table.core.windows.net`,
      this.lockTableName,
      new AzureNamedKeyCredential(this.accountName, this.accountKey)
    );

    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      // Create container if it doesn't exist
      await this.containerClient.createIfNotExists();

      // Create table if it doesn't exist
      await this.tableClient.createTable();
    } catch (err: any) {
      // Ignore errors if already exists
      if (err.statusCode !== 409) {
        console.error('Error initializing Azure Storage:', err);
      }
    }
  }

  private getBlobClient(fileId: string): BlockBlobClient {
    return this.containerClient.getBlockBlobClient(fileId);
  }

  async getFilePath(fileId: string): Promise<string> {
    // For Azure, return the blob name (which is the fileId)
    return fileId;
  }

  async getFile(fileId: string): Promise<Buffer> {
    try {
      const blobClient = this.getBlobClient(fileId);
      const downloadResponse = await blobClient.download(0);

      if (!downloadResponse.readableStreamBody) {
        throw new Error('No data in blob');
      }

      const chunks: any[] = [];
      for await (const chunk of downloadResponse.readableStreamBody) {
        chunks.push(chunk);
      }

      const buffers: Buffer[] = chunks.map((chunk) => Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      return Buffer.concat(buffers as any);
    } catch (err: any) {
      if (err.statusCode === 404) {
        throw new Error('File not found');
      }
      throw err;
    }
  }

  async putFile(fileId: string, content: Buffer): Promise<{ version: string; etag: string }> {
    const blobClient = this.getBlobClient(fileId);

    const uploadResponse = await blobClient.upload(content, content.length, {
      blobHTTPHeaders: {
        blobContentType: 'application/octet-stream',
      },
    });

    const etag = uploadResponse.etag || '';
    const version = uploadResponse.lastModified?.getTime().toString() || Date.now().toString();

    // Update lock etag if file is locked
    const lockEntity = await this.getLockEntity(fileId);
    if (lockEntity) {
      lockEntity.blobETag = etag;
      await this.tableClient.updateEntity(lockEntity, 'Merge');
    }

    return { version, etag };
  }

  async getFileMetadata(fileId: string): Promise<FileMetadata> {
    try {
      const blobClient = this.getBlobClient(fileId);
      const properties = await blobClient.getProperties();

      const etag = properties.etag || '';
      const version = properties.lastModified?.getTime().toString() || '';
      const size = properties.contentLength || 0;
      const lastModified = properties.lastModified || new Date();

      return {
        size,
        lastModified,
        version,
        etag,
      };
    } catch (err: any) {
      if (err.statusCode === 404) {
        throw new Error('File not found');
      }
      throw err;
    }
  }

  async deleteFile(fileId: string): Promise<void> {
    const blobClient = this.getBlobClient(fileId);

    try {
      await blobClient.delete();
    } catch (err: any) {
      if (err.statusCode !== 404) {
        throw err;
      }
    }

    // Remove lock if exists
    try {
      await this.tableClient.deleteEntity(fileId, 'lock');
    } catch (err: any) {
      // Ignore if lock doesn't exist
      if (err.statusCode !== 404) {
        console.error('Error deleting lock:', err);
      }
    }
  }

  async fileExists(fileId: string): Promise<boolean> {
    try {
      const blobClient = this.getBlobClient(fileId);
      return await blobClient.exists();
    } catch (err) {
      return false;
    }
  }

  private async getLockEntity(fileId: string): Promise<LockEntity | null> {
    try {
      const entity = await this.tableClient.getEntity<LockEntity>(fileId, 'lock');
      return {
        partitionKey: entity.partitionKey,
        rowKey: entity.rowKey,
        lockValue: entity.lockValue,
        blobETag: entity.blobETag,
        lockedAt: new Date(entity.lockedAt),
        lastRefreshed: new Date(entity.lastRefreshed),
        etag: entity.etag,
      };
    } catch (err: any) {
      if (err.statusCode === 404) {
        return null;
      }
      throw err;
    }
  }

  async getLock(fileId: string): Promise<LockInfo | null> {
    const lockEntity = await this.getLockEntity(fileId);

    if (!lockEntity) {
      return null;
    }

    // Check if file etag matches - if not, lock was broken
    try {
      const metadata = await this.getFileMetadata(fileId);
      if (metadata.etag !== lockEntity.blobETag) {
        // Lock was broken - file was modified
        try {
          await this.tableClient.deleteEntity(fileId, 'lock');
        } catch (err) {
          console.error('Error deleting broken lock:', err);
        }
        return null;
      }
    } catch (err) {
      // File doesn't exist anymore
      try {
        await this.tableClient.deleteEntity(fileId, 'lock');
      } catch (deleteErr) {
        console.error('Error deleting lock for non-existent file:', deleteErr);
      }
      return null;
    }

    return {
      lock: lockEntity.lockValue,
      etag: lockEntity.blobETag,
      lockedAt: lockEntity.lockedAt,
      lastRefreshed: lockEntity.lastRefreshed,
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
    const lockEntity: LockEntity = {
      partitionKey: fileId,
      rowKey: 'lock',
      lockValue,
      blobETag: metadata.etag,
      lockedAt: new Date(),
      lastRefreshed: new Date(),
    };

    try {
      if (existingLock) {
        // Update existing lock
        await this.tableClient.updateEntity(lockEntity, 'Replace');
      } else {
        // Create new lock
        await this.tableClient.createEntity(lockEntity);
      }

      return {
        success: true,
        etag: metadata.etag,
      };
    } catch (err: any) {
      console.error('Error setting lock:', err);
      return {
        success: false,
        currentLock: existingLock?.lock,
      };
    }
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
    try {
      const lockEntity = await this.getLockEntity(fileId);
      if (lockEntity) {
        lockEntity.lastRefreshed = new Date();
        await this.tableClient.updateEntity(lockEntity, 'Merge');
      }

      return {
        success: true,
      };
    } catch (err) {
      console.error('Error refreshing lock:', err);
      return {
        success: false,
        currentLock: existingLock.lock,
      };
    }
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

    try {
      await this.tableClient.deleteEntity(fileId, 'lock');
      return {
        success: true,
      };
    } catch (err) {
      console.error('Error unlocking:', err);
      return {
        success: false,
        currentLock: existingLock.lock,
      };
    }
  }
}