import { CheckFileInfoResponse } from './CheckFileInfoResponse';
import { StorageFactory } from '../storage';
import { IStorageProvider } from '../storage';

interface IFileInfo {
  info?: CheckFileInfoResponse;
  supportedExtensions: [
    'doc',
    'docx',
    'dotx',
    'dot',
    'dotm',
    'xls',
    'xlsx',
    'xlsm',
    'xlm',
    'xlsb',
    'ppt',
    'pptx',
    'pps',
    'ppsx',
    'potx',
    'pot',
    'pptm',
    'potm',
    'ppsm',
    'pdf',
  ];
}

export class FileInfo {
  info?: CheckFileInfoResponse;
  supportedExtensions: string[];
  private storageProvider: IStorageProvider;

  constructor(options: IFileInfo) {
    this.info = options.info;
    this.supportedExtensions = options.supportedExtensions;
    this.storageProvider = StorageFactory.getStorageProvider();
  }

  getFilePath = async (fileId: string): Promise<string> => {
    return await this.storageProvider.getFilePath(fileId);
  };

  // Storage operations
  async getFile(fileId: string): Promise<Buffer> {
    return await this.storageProvider.getFile(fileId);
  }

  async putFile(fileId: string, content: Buffer): Promise<{ version: string; etag: string }> {
    return await this.storageProvider.putFile(fileId, content);
  }

  async getFileMetadata(fileId: string) {
    return await this.storageProvider.getFileMetadata(fileId);
  }

  async deleteFile(fileId: string): Promise<void> {
    return await this.storageProvider.deleteFile(fileId);
  }

  async fileExists(fileId: string): Promise<boolean> {
    return await this.storageProvider.fileExists(fileId);
  }

  // Lock operations
  async getLock(fileId: string) {
    return await this.storageProvider.getLock(fileId);
  }

  async setLock(fileId: string, lockValue: string, oldLock?: string) {
    return await this.storageProvider.setLock(fileId, lockValue, oldLock);
  }

  async refreshLock(fileId: string, lockValue: string) {
    return await this.storageProvider.refreshLock(fileId, lockValue);
  }

  async unlock(fileId: string, lockValue: string) {
    return await this.storageProvider.unlock(fileId, lockValue);
  }
}
