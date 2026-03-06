import { NextFunction, Request, Response } from 'express';
import { fileInfo } from '../../utils';

export async function deleteFile(req: Request, res: Response, next: NextFunction): Promise<void> {
  const { file_id: fileId } = req.params;

  try {
    // Check if file has a lock
    const lockInfo = await fileInfo.getLock(fileId);
    
    if (lockInfo) {
      res.header('X-WOPI-Lock', lockInfo.lock);
      res.sendStatus(409);
      return;
    }

    // Delete the file
    await fileInfo.deleteFile(fileId);
    res.sendStatus(200);
  } catch (err) {
    console.error('Error deleting file:', err);
    res.sendStatus(500);
  }
}
