/**
 * Storage Checker Script
 * Shows which files are in local storage and Azure storage
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

async function checkLocalStorage() {
  console.log('\n📁 LOCAL STORAGE');
  console.log('================');
  
  const filesDir = path.join(process.cwd(), 'files');
  const locksFile = path.join(process.cwd(), 'locks.json');
  
  // Check files directory
  if (fs.existsSync(filesDir)) {
    const files = fs.readdirSync(filesDir);
    if (files.length > 0) {
      console.log(`\nFiles in 'files/' directory: ${files.length}`);
      files.forEach(file => {
        const stats = fs.statSync(path.join(filesDir, file));
        console.log(`  - ${file} (${stats.size} bytes)`);
      });
    } else {
      console.log('\n❌ No files in local storage (files/ directory is empty)');
    }
  } else {
    console.log('\n❌ Local files directory does not exist');
  }
  
  // Check locks file
  if (fs.existsSync(locksFile)) {
    const locks = JSON.parse(fs.readFileSync(locksFile, 'utf-8'));
    const lockCount = Object.keys(locks).length;
    if (lockCount > 0) {
      console.log(`\nLocks in locks.json: ${lockCount}`);
      Object.entries(locks).forEach(([fileId, lockData]) => {
        console.log(`  - ${fileId}: ${lockData.lock}`);
      });
    } else {
      console.log('\n✅ No active locks in local storage');
    }
  } else {
    console.log('\n✅ No locks file (no locks exist yet)');
  }
}

async function checkAzureStorage() {
  console.log('\n☁️  AZURE STORAGE');
  console.log('================');
  
  const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
  const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
  const containerName = process.env.AZURE_STORAGE_CONTAINER || 'wopi-files';
  const lockTableName = process.env.AZURE_STORAGE_LOCK_TABLE || 'WopiLocks';
  
  if (!accountName || !accountKey || accountName === 'your-storage-account-name') {
    console.log('\n❌ Azure Storage not configured properly');
    console.log('   Set AZURE_STORAGE_ACCOUNT_NAME and AZURE_STORAGE_ACCOUNT_KEY in .env');
    return;
  }
  
  try {
    const { BlobServiceClient, StorageSharedKeyCredential } = require('@azure/storage-blob');
    const { TableClient, AzureNamedKeyCredential } = require('@azure/data-tables');
    
    // Check Blobs
    const credential = new StorageSharedKeyCredential(accountName, accountKey);
    const blobServiceClient = new BlobServiceClient(
      `https://${accountName}.blob.core.windows.net`,
      credential
    );
    const containerClient = blobServiceClient.getContainerClient(containerName);
    
    console.log(`\nContainer: ${containerName}`);
    
    const containerExists = await containerClient.exists();
    if (!containerExists) {
      console.log('❌ Container does not exist in Azure');
    } else {
      console.log('✅ Container exists');
      
      const blobs = [];
      for await (const blob of containerClient.listBlobsFlat()) {
        blobs.push(blob);
      }
      
      if (blobs.length > 0) {
        console.log(`\nFiles in Azure Blob Storage: ${blobs.length}`);
        blobs.forEach(blob => {
          console.log(`  - ${blob.name} (${blob.properties.contentLength} bytes)`);
        });
      } else {
        console.log('\n❌ No files in Azure Blob Storage');
      }
    }
    
    // Check Locks Table
    const tableClient = new TableClient(
      `https://${accountName}.table.core.windows.net`,
      lockTableName,
      new AzureNamedKeyCredential(accountName, accountKey)
    );
    
    console.log(`\nLock Table: ${lockTableName}`);
    
    try {
      const locks = [];
      for await (const entity of tableClient.listEntities()) {
        locks.push(entity);
      }
      
      if (locks.length > 0) {
        console.log(`\nLocks in Azure Table Storage: ${locks.length}`);
        locks.forEach(lock => {
          console.log(`  - ${lock.partitionKey}: ${lock.lockValue} (etag: ${lock.blobETag})`);
        });
      } else {
        console.log('\n✅ No active locks in Azure');
      }
    } catch (err) {
      if (err.statusCode === 404) {
        console.log('❌ Lock table does not exist in Azure');
      } else {
        throw err;
      }
    }
    
  } catch (error) {
    console.error('\n❌ Error checking Azure Storage:', error.message);
    if (error.code === 'MODULE_NOT_FOUND') {
      console.log('   Run: npm install');
    }
  }
}

async function main() {
  console.log('\n🔍 STORAGE CHECKER');
  console.log('==================');
  console.log(`Current mode: ${process.env.STORAGE_MODE || 'local'}`);
  
  await checkLocalStorage();
  await checkAzureStorage();
  
  console.log('\n');
}

main().catch(console.error);