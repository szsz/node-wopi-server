import { NextFunction, Request, Response } from 'express';
import { Stats, constants } from 'fs';
import { access, stat } from 'fs/promises';
import { userInfo } from 'os';
import { basename, extname } from 'path';
import { CheckFileInfoResponse } from '../../models';
import { fileInfo, getWopiMethods } from '../../utils';


export async function checkFileInfo(req: Request, res: Response, next: NextFunction): Promise<void> {
  const { WOPI_SERVER: wopiServer } = process.env;
  const { file_id: fileId } = req.params;

  const query = Object.entries(req.query).reduce(
    function(accumulator, [key, value]) {
      const q = key === 'access_token_ttl' ? 'access_token_ttl=0&' : `${key}=${value}&`;

      return accumulator + q;
    }, '') + `WOPISrc=${encodeURIComponent(wopiServer + req.originalUrl.split('?')[0])}`;

  if (!wopiServer) {
    throw new Error('WOPI_SERVER environment variable is not set');
  }

  if (!fileId) {
    throw new Error('file_id query parameter is required');
  }

  const filePath = await fileInfo.getFilePath(fileId);
  const fileName = basename(filePath);
  const userName = req.query.access_token?.toString().split('|')[1] ?? userInfo().username;
  let actionUrls;

  if (!fileName.endsWith('.wopitest')) {
    actionUrls = (await getWopiMethods())[extname(filePath).replace('.', '')];
  }

  let fileStats: Stats;
  let fileSize: number;
  let lastModified: Date;
  let version: string;

  try {
    const metadata = await fileInfo.getFileMetadata(fileId);
    fileSize = metadata.size;
    lastModified = metadata.lastModified;
    version = metadata.version;
    
    // Create a Stats-like object for backward compatibility
    fileStats = {
      dev: 2114,
      ino: 48064969,
      mode: 33188,
      nlink: 1,
      uid: 85,
      gid: 100,
      rdev: 0,
      size: fileSize,
      blksize: 4096,
      blocks: 8,
      atimeMs: lastModified.getTime(),
      mtimeMs: lastModified.getTime(),
      ctimeMs: lastModified.getTime(),
      birthtimeMs: lastModified.getTime(),
      atime: lastModified,
      mtime: lastModified,
      ctime: lastModified,
      birthtime: lastModified,
    } as Stats;
  } catch (err) {
    fileStats = {
      dev: 2114,
      ino: 48064969,
      mode: 33188,
      nlink: 1,
      uid: 85,
      gid: 100,
      rdev: 0,
      size: 527,
      blksize: 4096,
      blocks: 8,
      atimeMs: 1318289051000.1,
      mtimeMs: 1318289051000.1,
      ctimeMs: 1318289051000.1,
      birthtimeMs: 1318289051000.1,
      atime: new Date(),
      mtime: new Date(),
      ctime: new Date(),
      birthtime: new Date(),
    } as Stats;
    version = fileStats.mtimeMs.toString();
  }

  const editUrls = actionUrls?.find((x: string[]) => x[0] === 'edit');
  const viewUrls = actionUrls?.find((x: string[]) => x[0] === 'view');
  const editUrl = editUrls?.length > 0 && editUrls[1];
  const viewUrl = viewUrls?.length > 0 && viewUrls[1];
  const hostEditUrl = editUrl && `${editUrl}${editUrl?.endsWith('?') ? '' : '&'}${query}`;
  const hostViewUrl = viewUrl && `${viewUrl}${viewUrl?.endsWith('?') ? '' : '&'}${query}`;
  let isReadOnly = false;

  const { STORAGE_MODE } = process.env;
  
  if (STORAGE_MODE === 'azure') {
    // In Azure mode, assume writable (we have full access via storage key)
    isReadOnly = false;
  } else {
    // In local mode, check filesystem permissions
    try {
      await access(filePath, constants.W_OK);
    } catch (err) {
      isReadOnly = true;
    }
  }

  const info = new CheckFileInfoResponse({
    AllowExternalMarketplace: true,
    BaseFileName: fileName,
    BreadcrumbBrandName: 'LocalStorage WOPI Host',
    BreadcrumbBrandUrl: wopiServer,
    BreadcrumbDocName: fileName,
    BreadcrumbFolderName: 'WopiStorage',
    BreadcrumbFolderUrl: wopiServer,
    HostEditUrl: hostEditUrl && `${wopiServer}?action_url=${encodeURIComponent(hostEditUrl)}`,
    HostViewUrl: hostViewUrl && `${wopiServer}?action_url=${encodeURIComponent(hostViewUrl)}`,
    LastModifiedTime: new Date(fileStats.mtime).toISOString(),
    OwnerId: userName,
    ReadOnly: isReadOnly,
    Size: fileStats.size,
    SupportsCoauth: true,
    SupportsCobalt: false,
    SupportsDeleteFile: true,
    SupportsExtendedLockLength: true,
    SupportsGetLock: true,
    SupportsLocks: true,
    SupportsRename: true,
    SupportsUpdate: true,
    UserCanRename: !isReadOnly,
    UserCanWrite: !isReadOnly,
    UserFriendlyName: userName,
    UserId: userName,
    Version: version,
  });

  if (fileInfo?.info?.BaseFileName === fileName) {
    info.Version = fileInfo.info.Version;
  }

  fileInfo.info = info;

  res.send(fileInfo.info);
}
