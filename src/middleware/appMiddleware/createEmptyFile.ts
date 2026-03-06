import { NextFunction, Request, Response } from 'express';
import { writeFile } from 'fs/promises';
import { fileInfo } from '../../utils';

export async function createEmptyFile(req: Request, res: Response, next: NextFunction) {
  const { file_id: fileId } = req.params;
  const { STORAGE_MODE } = process.env;

  try {
    if (STORAGE_MODE === 'azure') {
      // Create empty file in Azure Blob Storage
      await fileInfo.putFile(fileId, Buffer.from(''));
    } else {
      // Create empty file in local filesystem
      const filePath = await fileInfo.getFilePath(fileId);
      await writeFile(filePath, new Uint8Array(Buffer.from('')));
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Error creating empty file:', error);
    res.sendStatus(500);
  }
}