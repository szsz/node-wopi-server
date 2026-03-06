import { NextFunction, Request, Response } from 'express';
import { readdir, stat } from 'fs/promises';
import { extname, join } from 'path';
import { fileInfo } from '../../utils';

const { WOPI_SERVER: wopiServer } = process.env;

export async function getFileNames(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!wopiServer) {
    res.sendStatus(503);
    return;
  }

  const { STORAGE_MODE } = process.env;
  const returnValues: { id: number | string; name: string; ext: string }[] = [];

  try {
    if (STORAGE_MODE === 'azure') {
      // List files from Azure Blob Storage only
      const { BlobServiceClient, StorageSharedKeyCredential } = require('@azure/storage-blob');
      const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME || '';
      const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY || '';
      const containerName = process.env.AZURE_STORAGE_CONTAINER || 'wopi-files';

      if (!accountName || accountName === 'your-storage-account-name') {
        res.status(500).json({ 
          error: 'Azure Storage not configured properly',
          message: 'Please set AZURE_STORAGE_ACCOUNT_NAME in .env'
        });
        return;
      }

      const credential = new StorageSharedKeyCredential(accountName, accountKey);
      const blobServiceClient = new BlobServiceClient(
        `https://${accountName}.blob.core.windows.net`,
        credential
      );
      const containerClient = blobServiceClient.getContainerClient(containerName);

      // Check if container exists
      const containerExists = await containerClient.exists();
      if (!containerExists) {
        // Create container if it doesn't exist
        await containerClient.create();
      }

      // List blobs
      for await (const blob of containerClient.listBlobsFlat()) {
        const ext = extname(blob.name).replace('.', '');
        if (fileInfo.supportedExtensions.includes(ext)) {
          returnValues.push({ 
            id: blob.name,  // Use blob name as ID for Azure
            name: blob.name, 
            ext 
          });
        }
      }
    } else {
      // List files from local filesystem
      const folderPath = join(process.cwd(), 'files');
      const files = await readdir(folderPath);

      for (const f of files) {
        const ext = extname(f);
        const id = (await stat(join(folderPath, f))).ino;
        const extClean = ext.startsWith('.') ? ext.replace('.', '') : ext;
        
        if (fileInfo.supportedExtensions.includes(extClean)) {
          returnValues.push({ id, name: f, ext: extClean });
        }
      }
    }

    const data = {
      files: returnValues,
      wopiServer,
      storageMode: STORAGE_MODE || 'local',
    };

    res.send(data);
  } catch (error: any) {
    console.error('Error listing files:', error);
    res.status(500).json({ 
      error: 'Failed to list files',
      message: error.message,
      storageMode: STORAGE_MODE || 'local'
    });
  }
}