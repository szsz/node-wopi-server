# Azure Storage Integration Guide

This WOPI server now supports dual-mode storage: **Local File System** or **Azure Storage**.

## Overview

The storage system has been refactored to support multiple storage backends through a clean abstraction layer. You can switch between local filesystem and Azure Storage by simply changing an environment variable.

## Features

### ✅ Storage Abstraction Layer
- Clean interface-based design
- Easy to add new storage providers (AWS S3, Google Cloud Storage, etc.)
- Seamless switching between storage modes

### ✅ Local Storage Mode
- Files stored in local `files` directory
- Locks persisted in `locks.json` file
- Lock breaking detection using file etag (mtime + size)
- Survives server restarts

### ✅ Azure Storage Mode
- Files stored in Azure Blob Storage
- Locks managed in Azure Table Storage
- Lock breaking detection using blob etag
- Distributed lock management
- Scalable and cloud-native

### ✅ WOPI Lock Implementation
- Proper lock/unlock operations
- Lock refresh support
- Old lock value support for lock updates
- **Automatic lock breaking detection** - if a file is modified outside of a lock, the lock is automatically invalidated
- Conflict detection (409 responses)

## Environment Variables

Add these to your `.env` file:

```env
# Storage Mode: 'local' or 'azure'
STORAGE_MODE=local

# Azure Storage Configuration (required when STORAGE_MODE=azure)
AZURE_STORAGE_ACCOUNT_NAME=your-storage-account-name
AZURE_STORAGE_ACCOUNT_KEY=your-storage-account-key
AZURE_STORAGE_CONTAINER=wopi-files
AZURE_STORAGE_LOCK_TABLE=WopiLocks
```

## Setup Instructions

### Local Mode (Default)

1. Set `STORAGE_MODE=local` in `.env` (or leave it unset)
2. Files will be stored in the `files` directory
3. Locks will be stored in `locks.json`
4. No additional setup required

### Azure Mode

1. **Create an Azure Storage Account**
   - Go to the Azure Portal
   - Create a new Storage Account
   - Copy the account name and access key

2. **Configure Environment Variables**
   ```env
   STORAGE_MODE=azure
   AZURE_STORAGE_ACCOUNT_NAME=mystorageaccount
   AZURE_STORAGE_ACCOUNT_KEY=your-storage-account-key-here
   AZURE_STORAGE_CONTAINER=wopi-files
   AZURE_STORAGE_LOCK_TABLE=WopiLocks
   ```

3. **Start the Server**
   - The container and table will be created automatically on first run
   - Files will be stored as blobs
   - Locks will be stored as table entities

## Architecture

### Storage Provider Interface

```typescript
interface IStorageProvider {
  // File operations
  getFile(fileId: string): Promise<Buffer>;
  putFile(fileId: string, content: Buffer): Promise<{ version: string; etag: string }>;
  getFileMetadata(fileId: string): Promise<FileMetadata>;
  deleteFile(fileId: string): Promise<void>;
  fileExists(fileId: string): Promise<boolean>;
  getFilePath(fileId: string): Promise<string>;

  // Lock operations
  getLock(fileId: string): Promise<LockInfo | null>;
  setLock(fileId: string, lockValue: string, oldLock?: string): Promise<LockResult>;
  refreshLock(fileId: string, lockValue: string): Promise<LockResult>;
  unlock(fileId: string, lockValue: string): Promise<LockResult>;
}
```

### Storage Factory

The `StorageFactory` creates the appropriate provider based on `STORAGE_MODE`:

```typescript
const storageProvider = StorageFactory.getStorageProvider();
// Returns LocalStorageProvider or AzureStorageProvider
```

### File Structure

```
src/
├── storage/
│   ├── IStorageProvider.ts         # Interface definition
│   ├── LocalStorageProvider.ts     # Local filesystem implementation
│   ├── AzureStorageProvider.ts     # Azure blob/table implementation
│   ├── StorageFactory.ts           # Factory to create providers
│   └── index.ts                    # Exports
├── models/
│   └── FileInfo.ts                 # Updated to use storage provider
└── middleware/
    └── wopiMiddleware/
        ├── lock.ts                  # Updated to use storage provider
        ├── unlock.ts                # Updated to use storage provider
        ├── getLock.ts               # Updated to use storage provider
        ├── refreshLock.ts           # Updated to use storage provider
        ├── getFile.ts               # Updated to use storage provider
        ├── putFile.ts               # Updated to use storage provider
        ├── deleteFile.ts            # Updated to use storage provider
        └── checkFileInfo.ts         # Updated to use storage provider
```

## Lock Breaking Detection

### How It Works

Both storage providers implement lock breaking detection using ETags:

1. **When a lock is acquired:**
   - The current file ETag is stored with the lock
   - ETag = `"${lastModifiedTime}-${fileSize}"` (local) or blob ETag (Azure)

2. **When checking a lock:**
   - Compare the stored ETag with the current file ETag
   - If they differ → file was modified → lock is broken → lock is removed

3. **Result:**
   - Prevents stale locks
   - Automatically handles external file modifications
   - Ensures data consistency

### Example Scenario

```
1. User A locks document.docx (ETag: "abc123")
2. External process modifies document.docx (ETag changes to "def456")
3. User B checks the lock
4. System detects ETag mismatch → lock is broken
5. User B can now acquire the lock
```

## Azure Table Storage Schema

### Lock Table (WopiLocks)

| Field | Type | Description |
|-------|------|-------------|
| PartitionKey | string | File ID |
| RowKey | string | "lock" (constant) |
| lockValue | string | WOPI lock identifier |
| blobETag | string | ETag of blob when locked |
| lockedAt | DateTime | When lock was acquired |
| lastRefreshed | DateTime | Last lock refresh time |

## Migration Between Modes

### Local to Azure

1. Upload files from `files/` directory to Azure Blob Container
2. Lock data in `locks.json` can be discarded (locks are temporary)
3. Change `STORAGE_MODE` to `azure`
4. Restart the server

### Azure to Local

1. Download blobs from Azure Container to `files/` directory
2. Lock data in Azure Table can be discarded
3. Change `STORAGE_MODE` to `local`
4. Restart the server

## Performance Considerations

### Local Mode
- ✅ Fast for development
- ✅ No external dependencies
- ❌ Single server only
- ❌ Limited scalability

### Azure Mode
- ✅ Highly scalable
- ✅ Distributed architecture
- ✅ Built-in redundancy
- ❌ Network latency
- ❌ Azure costs

## Troubleshooting

### "Azure Storage account name and key must be provided"
- Ensure `AZURE_STORAGE_ACCOUNT_NAME` and `AZURE_STORAGE_ACCOUNT_KEY` are set when using `STORAGE_MODE=azure`

### "Error initializing Azure Storage"
- Check that your storage account credentials are correct
- Ensure the storage account exists in Azure
- Verify network connectivity to Azure

### Lock conflicts (409 errors)
- This is expected behavior when a file is locked by another user
- Check the `X-WOPI-Lock` response header for the current lock value

### Lock breaking not working
- Ensure the file's ETag changes when modified
- Check server logs for lock validation errors

## Security Notes

1. **Never commit `.env` with real credentials**
2. **Use Azure Key Vault** for production credentials
3. **Use SAS tokens** instead of account keys when possible
4. **Enable Azure Storage encryption** at rest
5. **Use HTTPS** for all Azure Storage communication

## Future Enhancements

Possible future additions:
- AWS S3 storage provider
- Google Cloud Storage provider
- Redis-based lock management
- Lease-based locking in Azure (blob leases)
- Lock timeout configuration
- Lock owner tracking
- Audit logging

## Testing

### Test Local Mode
```bash
# Set STORAGE_MODE=local in .env
npm start
# Upload a document through the WOPI interface
# Check files/ directory and locks.json
```

### Test Azure Mode
```bash
# Set STORAGE_MODE=azure in .env with valid Azure credentials
npm start
# Upload a document through the WOPI interface
# Check Azure Portal for blobs and table entries
```

### Test Lock Breaking
```bash
# 1. Lock a file through WOPI
# 2. Manually modify the file (change content)
# 3. Try to get the lock
# 4. Verify the lock was automatically removed
```

## API Reference

All WOPI endpoints remain unchanged. The storage abstraction is transparent to WOPI clients.

## Support

For issues or questions:
1. Check server logs for detailed error messages
2. Verify environment variables are set correctly
3. Test connectivity to Azure (if using Azure mode)
4. Review WOPI protocol specifications