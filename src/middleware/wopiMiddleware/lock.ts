import { NextFunction, Request, Response } from 'express';
import { fileInfo } from '../../utils';

export async function lock(req: Request, res: Response, next: NextFunction): Promise<void> {
  const lockValue = req.header('X-WOPI-Lock');
  const oldLockValue = req.header('X-WOPI-OldLock');

  if (!lockValue) {
    res.sendStatus(400);
    return;
  }

  const { file_id: fileId } = req.params;

  try {
    const result = await fileInfo.setLock(fileId, lockValue, oldLockValue);

    if (result.success) {
      if (fileInfo?.info?.Version) {
        res.setHeader('X-WOPI-ItemVersion', fileInfo.info.Version);
      }

      res.sendStatus(200);
    } else {
      res.setHeader('X-WOPI-Lock', result.currentLock || '');
      res.sendStatus(409);
    }
  } catch (err) {
    console.error('Error setting lock:', err);
    res.sendStatus(500);
  }
}
