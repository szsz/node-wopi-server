import { NextFunction, Request, Response } from 'express';
import { fileInfo } from '../../utils';

export async function getFile(req: Request, res: Response, next: NextFunction): Promise<void> {
  const { file_id: fileId } = req.params;

  try {
    const file = await fileInfo.getFile(fileId);

    if (fileInfo?.info?.Version) {
      res.setHeader('X-WOPI-ItemVersion', fileInfo.info.Version);
    }

    res.status(200).send(file);
  } catch (err: any) {
    if (err.message === 'File not found') {
      res.sendStatus(404);
    } else {
      console.error('Error getting file:', err);
      res.sendStatus(500);
    }
  }
}
