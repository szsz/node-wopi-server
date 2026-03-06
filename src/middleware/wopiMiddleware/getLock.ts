import { NextFunction, Request, Response } from 'express';
import { fileInfo } from '../../utils';

export async function getLock(req: Request, res: Response, next: NextFunction): Promise<void> {
  const { file_id: fileId } = req.params;

  try {
    const lockInfo = await fileInfo.getLock(fileId);

    if (lockInfo) {
      res.setHeader('X-WOPI-Lock', lockInfo.lock);
    } else {
      res.setHeader('X-WOPI-Lock', '');
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('Error getting lock:', err);
    res.sendStatus(500);
  }
}
