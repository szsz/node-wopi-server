import { IStorageProvider } from './IStorageProvider';
import { LocalStorageProvider } from './LocalStorageProvider';
import { AzureStorageProvider } from './AzureStorageProvider';

export class StorageFactory {
  private static instance: IStorageProvider | null = null;

  static getStorageProvider(): IStorageProvider {
    if (this.instance) {
      return this.instance;
    }

    const storageMode = process.env.STORAGE_MODE?.toLowerCase() || 'local';

    switch (storageMode) {
      case 'azure':
        console.log('Using Azure Storage for files and locks');
        this.instance = new AzureStorageProvider();
        break;
      case 'local':
      default:
        console.log('Using local file system for files and locks');
        this.instance = new LocalStorageProvider();
        break;
    }

    return this.instance;
  }

  // For testing purposes - allows resetting the singleton
  static resetInstance(): void {
    this.instance = null;
  }
}