import { NextFunction, Response } from 'express';
import { ICustomRequest } from '../../models/ICustomRequest';
import { fileInfo } from '../../utils';

export async function putFile(req: ICustomRequest, res: Response, next: NextFunction): Promise<void> {
  const { file_id: fileId } = req.params;
  const lockValue = req.header('X-WOPI-Lock');

  try {
    // Check if file exists and get metadata
    const exists = await fileInfo.fileExists(fileId);
    const lockInfo = await fileInfo.getLock(fileId);

    // Allow PUT if:
    // 1. File doesn't exist or is empty AND there's no lock
    // 2. Lock value matches the current lock
    if ((!exists && !lockInfo) || (lockValue && lockInfo && lockInfo.lock === lockValue)) {
      // If lock value is provided and there's no lock, set it
      if (lockValue && !lockInfo) {
        await fileInfo.setLock(fileId, lockValue);
      }

      // Save the file
      const result = await fileInfo.putFile(fileId, req.rawBody ?? Buffer.from(''));

      // Update file info version
      if (fileInfo.info) {
        fileInfo.info.Version = result.version;
      }

      res.setHeader('X-WOPI-ItemVersion', result.version).sendStatus(200);
    } else {
      // Lock conflict or unauthorized
      res.setHeader('X-WOPI-Lock', lockInfo?.lock || '').sendStatus(409);
    }
  } catch (err) {
    console.error('Error putting file:', err);
    res.sendStatus(500);
  }
}
