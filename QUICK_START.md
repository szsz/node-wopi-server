# Quick Start Guide - WOPI Server + Collabora Online

This guide will get you up and running with Collabora Online and the WOPI server in minutes.

## Prerequisites Check

Before starting, ensure you have:
- ✅ Docker installed and running
- ✅ Node.js 14+ installed
- ✅ npm installed

## Quick Start (5 Steps)

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Collabora Online

```bash
docker compose up -d
```

Wait 10-30 seconds for Collabora to fully start.

### 3. Verify Collabora is Running

Check the logs:
```bash
docker compose logs -f collabora
```

Press `Ctrl+C` to exit logs once you see it's ready.

Or check the status:
```bash
docker compose ps
```

### 4. Start the WOPI Server

```bash
npm start
```

You should see: `server running on port 3000`

### 5. Open in Browser

Navigate to: **http://localhost:3000**

## Adding Files to Edit

Simply copy any Office document into the `files/` directory:

```bash
# Windows
copy "C:\path\to\your\document.docx" files\

# Linux/Mac
cp /path/to/your/document.docx files/
```

Then refresh the browser to see the new file.

## Testing with a Sample File

Create a quick test document:

```bash
# Windows
echo Test Document > files\test.txt

# Linux/Mac
echo "Test Document" > files/test.txt
```

Open http://localhost:3000 and click on the file to edit it in Collabora.

## What Just Happened?

- **Collabora Online** is running in Docker on port 9980
- **WOPI Server** is running locally on port 3000
- Files are stored in the `files/` directory
- The WOPI server connects your files to Collabora's web editor

## Stopping the Services

### Stop WOPI Server
Press `Ctrl+C` in the terminal

### Stop Collabora
```bash
docker compose down
```

## Troubleshooting

### "ECONNREFUSED" Error

**Problem:** WOPI server can't connect to Collabora

**Solution:** Ensure Collabora is running first:
```bash
docker compose ps
```

If not running, start it:
```bash
docker compose up -d
```

### Collabora Won't Start

**Problem:** Docker not running or port conflict

**Solutions:**
1. Ensure Docker Desktop is running
2. Check if port 9980 is free:
   ```bash
   # Windows
   netstat -ano | findstr :9980
   
   # Linux/Mac
   lsof -i :9980
   ```

### File Not Found

**Problem:** File doesn't appear in browser

**Solution:** 
1. Verify file is in `files/` directory:
   ```bash
   dir files
   ```
2. Ensure file extension is supported (docx, xlsx, pptx, etc.)

## Next Steps

- 📖 Read [FILE_STORAGE_GUIDE.md](FILE_STORAGE_GUIDE.md) for detailed file management
- 🔧 Read [COLLABORA_SETUP.md](COLLABORA_SETUP.md) for advanced configuration
- 📝 Add your own documents to the `files/` directory

## Key URLs

- **WOPI Server Interface:** http://localhost:3000
- **Collabora Discovery:** http://localhost:9980/hosting/discovery
- **Collabora Admin:** http://localhost:9980/browser/dist/admin/admin.html
  - Username: `admin`
  - Password: `admin`

## Configuration Files

All configuration is in `.env`:
```env
OFFICE_ONLINE_SERVER=http://localhost:9980
WOPI_IMPLEMENTED=view,open,edit
WOPI_SERVER=http://localhost:3000
VERBOSE_LOGGING=true
```

Change these values if you need different ports or domains.

## Verbose Logging

To help debug issues, you can enable verbose logging:

```env
VERBOSE_LOGGING=true
```

This will log:
- All incoming HTTP requests (method, URL, headers, query params)
- Request bodies (excluding binary file data)
- All outgoing responses (status, headers, body)
- Request/response duration

**Note:** File data is automatically excluded from logs to keep them readable.

To disable verbose logging:
```env
VERBOSE_LOGGING=false
```

## What Was Fixed

During setup, I fixed a critical bug in the WOPI server:
- **Issue:** The server wasn't including the port number when connecting to Collabora
- **Fix:** Updated `src/utils/getWopiMethods.ts` to include the port
- **Result:** Server can now properly connect to Collabora on port 9980

## Platform Compatibility

This setup works on:
- ✅ Windows
- ✅ Linux  
- ✅ macOS

The Docker Compose configuration and scripts are cross-platform compatible.

## Need More Help?

Check these documentation files:
- `COLLABORA_SETUP.md` - Detailed setup and configuration guide
- `FILE_STORAGE_GUIDE.md` - Complete file storage documentation
- `README.md` - Original project documentation

## Support

For issues with:
- **Collabora:** Check logs with `docker compose logs collabora`
- **WOPI Server:** Check terminal output where `npm start` is running
- **File operations:** See FILE_STORAGE_GUIDE.md troubleshooting section