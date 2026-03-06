import { NextFunction, Request, Response } from 'express';
import { fileInfo } from '../../utils';

export async function unlock(req: Request, res: Response, next: NextFunction): Promise<void> {
  const lockValue = req.header('X-WOPI-Lock');

  if (!lockValue) {
    res.sendStatus(400);
    return;
  }

  const { file_id: fileId } = req.params;

  try {
    const result = await fileInfo.unlock(fileId, lockValue);

    if (result.success) {
      if (fileInfo?.info?.Version) {
        res.setHeader('X-WOPI-ItemVersion', fileInfo?.info?.Version);
      }

      res.sendStatus(200);
    } else {
      res.setHeader('X-WOPI-Lock', result.currentLock || '');
      res.sendStatus(409);
    }
  } catch (err) {
    console.error('Error unlocking:', err);
    res.sendStatus(500);
  }
}
