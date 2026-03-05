# WOPI Server File Storage Guide

## Overview

The WOPI server stores and manages files in a local `files/` directory. This guide explains how to add, manage, and edit files using the WOPI server and Collabora Online.

## File Storage Location

**Directory:** `c:/Users/szebe/Documents/GitHub/node-wopi-server/files/`

All files you want to edit with Collabora must be placed in this directory.

## Supported File Types

The WOPI server supports the following file types:
- **Word:** doc, docx, dotx, dot, dotm
- **Excel:** xls, xlsx, xlsm, xlm, xlsb
- **PowerPoint:** ppt, pptx, pps, ppsx, potx, pot, pptm, potm, ppsm
- **PDF:** pdf (view only)

## How to Add Files

### Method 1: Manual Copy (Simplest)

Simply copy any Office document into the `files/` directory:

```bash
# Copy a file into the files directory
copy "C:\path\to\your\document.docx" files\
```

### Method 2: Via API Upload

Upload files using the WOPI server's upload endpoint:

```bash
# Using curl
curl -X POST "http://localhost:3000/add-file?file_name=mydocument.docx" \
  --data-binary "@/path/to/mydocument.docx"

# Using PowerShell
Invoke-WebRequest -Uri "http://localhost:3000/add-file?file_name=mydocument.docx" `
  -Method POST -InFile "C:\path\to\mydocument.docx"
```

## How the System Works

### 1. File Identification

Files are identified by either:
- **Filename** - The actual file name (e.g., `document.docx`)
- **Inode number** - A unique system-generated ID

### 2. WOPI Protocol Flow

```
User Request → Collabora → WOPI Server → files/ directory
                    ↓
            Display in Browser
                    ↓
User Edits → Collabora → WOPI Server → Save to files/ directory
```

### 3. File Operations

The WOPI server handles these operations:
- **CheckFileInfo** - Get file metadata (name, size, permissions)
- **GetFile** - Read file contents
- **PutFile** - Save file changes
- **Lock/Unlock** - Prevent concurrent edits
- **RenameFile** - Change file name
- **DeleteFile** - Remove file

## Complete Workflow

### Step 1: Start Services

```bash
# Terminal 1: Start Collabora
docker compose up -d

# Terminal 2: Start WOPI Server
npm start
```

### Step 2: Add a Document

Place a document in the `files/` directory:

```bash
# Example: Create a test Word document
echo "Hello World" > files/test.docx
```

### Step 3: List Available Files

Get a list of files via the API:

```bash
curl http://localhost:3000/fileNames
```

Response example:
```json
[
  {"id": 0, "name": "test.docx", "ext": "docx"},
  {"id": 1, "name": "presentation.pptx", "ext": "pptx"}
]
```

### Step 4: Open File in Collabora

Access the WOPI server interface:

1. Open browser: http://localhost:3000
2. You should see a list of available files
3. Click on a file to open it in Collabora
4. Edit and save - changes are automatically saved back to `files/` directory

## API Endpoints

### Get File List
```http
GET http://localhost:3000/fileNames
```

### Upload File
```http
POST http://localhost:3000/add-file?file_name=document.docx
Content-Type: application/octet-stream
Body: [file binary data]
```

### Create Empty File
```http
POST http://localhost:3000/create/{filename}
```

### Get Discovery Info
```http
GET http://localhost:3000/discovery
```
Returns supported file types and actions from Collabora.

### WOPI Endpoints (Used by Collabora)
```http
GET /wopi/files/{file_id}              # Get file info
GET /wopi/files/{file_id}/contents     # Download file
POST /wopi/files/{file_id}/contents    # Upload changes
POST /wopi/files/{file_id}             # Lock, unlock, rename, etc.
```

## Access Tokens

The WOPI server uses simple token-based authentication:

- Tokens are passed as query parameter: `?access_token=YOUR_TOKEN`
- For development, any non-empty token works (except "invalid")
- Token format can include TTL: `TOKEN|TIMESTAMP`

Example:
```
http://localhost:3000/wopi/files/test.docx?access_token=dev-token
```

## Troubleshooting

### File Not Found (404)

**Problem:** WOPI server can't find the file

**Solutions:**
1. Verify file exists in `files/` directory:
   ```bash
   dir files
   ```
2. Check file name matches exactly (case-sensitive on Linux/Mac)
3. Ensure file has correct extension

### File Won't Open in Collabora

**Problem:** Collabora shows error or blank page

**Solutions:**
1. Check Collabora is running:
   ```bash
   docker compose ps
   ```
2. Verify discovery endpoint works:
   ```bash
   curl http://localhost:9980/hosting/discovery
   ```
3. Check WOPI server logs for errors
4. Ensure file type is supported

### Can't Save Changes

**Problem:** Edits don't persist to disk

**Solutions:**
1. Check file permissions - WOPI server needs write access to `files/` directory
2. Verify no other process has file locked
3. Check WOPI server logs for errors
4. Ensure sufficient disk space

### Connection Refused Error

**Problem:** `ECONNREFUSED` when starting WOPI server

**Solutions:**
1. Ensure Collabora is running first:
   ```bash
   docker compose up -d
   ```
2. Wait 10-30 seconds for Collabora to fully start
3. Verify `.env` has correct OFFICE_ONLINE_SERVER URL:
   ```
   OFFICE_ONLINE_SERVER=http://localhost:9980
   ```

## Example: Complete Test

```bash
# 1. Start Collabora
docker compose up -d

# 2. Wait for it to start (check logs)
docker compose logs -f collabora
# Wait for "Ready to accept connections"

# 3. Create a test document
echo "Test Content" > files/test-doc.txt

# 4. Start WOPI server
npm start

# 5. Open in browser
# Navigate to: http://localhost:3000

# 6. Click on test-doc.txt to open in Collabora

# 7. Make edits in Collabora and save

# 8. Verify changes saved to disk
type files\test-doc.txt
```

## File Versioning

The WOPI server tracks file versions using:
- **Modified timestamp** - When file was last changed
- **Version number** - Incremented on each save
- **X-WOPI-ItemVersion** header - Sent with responses

Version conflicts are handled by Collabora's locking mechanism.

## Performance Tips

1. **Keep files directory clean** - Remove old/unused files
2. **Use reasonable file sizes** - Large files (>50MB) may be slow
3. **Limit concurrent users** - This is a development server, not production-ready
4. **Regular backups** - Files are stored locally only

## Security Notes

⚠️ **WARNING:** This is a development server with minimal security:

- Token validation is basic (any non-empty string works)
- No user authentication or authorization
- No encryption (uses HTTP, not HTTPS)
- Files are stored locally without encryption
- **DO NOT use for sensitive documents**
- **DO NOT expose to the internet**

For production use, implement:
- Proper authentication (OAuth, SAML, etc.)
- HTTPS/TLS encryption
- Role-based access control
- Audit logging
- Cloud storage integration

## Advanced: Monitoring File Changes

You can monitor what happens to files:

```bash
# Watch the files directory (Linux/Mac)
watch -n 1 ls -lh files/

# Windows PowerShell - watch directory
while ($true) { 
  Clear-Host
  Get-ChildItem files | Format-Table Name, LastWriteTime, Length
  Start-Sleep -Seconds 1
}
```

## Integration with Your Application

To integrate this WOPI server with your own application:

1. **Generate access tokens** - Implement proper token generation
2. **Build URLs** - Construct WOPI URLs with file IDs and tokens
3. **Embed in iframe** - Show Collabora editor in your UI
4. **Handle callbacks** - Listen for save/close events

Example WOPI URL structure:
```
{CollaboraURL}/loleaflet/{document_type}/edit?
  WOPISrc=http://localhost:3000/wopi/files/{file_id}&
  access_token={your_token}
```

## Resources

- [WOPI Protocol Documentation](https://docs.microsoft.com/en-us/openspecs/office_protocols/ms-wopi/)
- [Collabora Online Documentation](https://www.collaboraoffice.com/code/)
- [LibreOffice Supported Formats](https://www.libreoffice.org/discover/what-is-opendocument/)

## Need Help?

Check the main documentation:
- `COLLABORA_SETUP.md` - Setup and configuration
- `start-services.md` - Quick start guide
- `README.md` - Project overview