import { NextFunction, Response } from 'express';
import { readdir, stat } from 'fs/promises';
import { extname, join } from 'path';
import { ICustomRequest } from '../../models';
import { updateFile, fileInfo } from '../../utils';

export async function copyFile(req: ICustomRequest, res: Response, next: NextFunction) {
  const { file_name: fileName } = req.query;
  const { STORAGE_MODE } = process.env;

  if (!fileName || typeof(fileName) !== 'string') {
    throw new Error('query parameter file_name is missing or has an incorrect type.');
  }

  if (!req.rawBody) {
    throw new Error('Buffer not defined on request');
  }

  try {
    if (STORAGE_MODE === 'azure') {
      // Azure mode - upload to Azure Blob Storage
      let newFileName = fileName as string;
      
      // Check if file already exists and generate version number if needed
      const { BlobServiceClient, StorageSharedKeyCredential } = require('@azure/storage-blob');
      const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME || '';
      const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY || '';
      const containerName = process.env.AZURE_STORAGE_CONTAINER || 'wopi-files';

      const credential = new StorageSharedKeyCredential(accountName, accountKey);
      const blobServiceClient = new BlobServiceClient(
        `https://${accountName}.blob.core.windows.net`,
        credential
      );
      const containerClient = blobServiceClient.getContainerClient(containerName);

      // Get list of existing files
      const existingFiles: string[] = [];
      for await (const blob of containerClient.listBlobsFlat()) {
        existingFiles.push(blob.name);
      }

      let count = 1;
      while (existingFiles.includes(newFileName)) {
        newFileName = `v${count}.${fileName}`;
        count++;
      }

      // Upload to Azure
      await fileInfo.putFile(newFileName, req.rawBody);

      // Get updated file list
      const newFiles: { id: string; name: string; ext: string }[] = [];
      for await (const blob of containerClient.listBlobsFlat()) {
        const ext = extname(blob.name);
        newFiles.push({ 
          id: blob.name, 
          name: blob.name, 
          ext: ext.startsWith('.') ? ext.replace('.', '') : ext 
        });
      }
      newFiles.sort((a, b) => a.name.localeCompare(b.name));

      res.status(201);
      return res.json({
        new_file: newFileName,
        files: newFiles,
      });
    } else {
      // Local mode - save to local filesystem
      const files = await readdir(join(process.cwd(), 'files'));
      
      let newFileName = fileName as string;
      let count = 1;

      while (files.includes(newFileName)) {
        newFileName = `v${count}.${fileName}`;
        count++;
      }

      await updateFile(join(process.cwd(), 'files', newFileName), req.rawBody);

      const newFiles = await readdir(join(process.cwd(), 'files'));
      newFiles.sort();

      res.status(201);
      return res.json({
        new_file: newFileName,
        files: newFiles.map((f, i) => {
          const ext = extname(f);
          return { id: i, name: f, ext: ext.startsWith('.') ? ext.replace('.', '') : ext };
        }),
      });
    }
  } catch (error) {
    console.error('Error copying file:', error);
    res.status(500).json({ error: 'Failed to copy file' });
  }
}