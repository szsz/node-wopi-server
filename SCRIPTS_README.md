# Automated Setup Scripts

This directory contains scripts to automate the setup and management of the WOPI Server + Collabora Online environment.

## Quick Start

### One-Command Setup

```bash
bash setup-and-run.sh
```

This single command will:
1. ✅ Verify project directory
2. ✅ Install all npm dependencies
3. ✅ Create and configure `.env` file
4. ✅ Create `files/` directory with test file
5. ✅ Check Docker is running
6. ✅ Start Collabora Online container
7. ✅ Start WOPI Server
8. ✅ Display access links

**Note:** Run this script from within the cloned repository directory.

### Stop Services

```bash
bash stop-services.sh
```

This will cleanly stop both the WOPI Server and Collabora container.

## Platform Support

Both scripts work on:
- ✅ **Linux** (Ubuntu, Debian, CentOS, etc.)
- ✅ **macOS** (Intel and Apple Silicon)
- ✅ **Windows** (Git Bash, WSL, or Cygwin)

## Prerequisites

Before running the setup script, ensure you have:

1. **Git** - To clone the repository
   ```bash
   git --version
   ```

2. **Node.js 14+** and **npm** - To run the WOPI server
   ```bash
   node --version
   npm --version
   ```

3. **Docker** - To run Collabora Online
   ```bash
   docker --version
   ```
   
   Make sure Docker Desktop is running!

## What the Setup Script Does

### Step-by-Step Process

```
[1/6] Checking project directory...
      - Verifies package.json and docker-compose.yml exist
      - Ensures script is run from project root

[2/6] Installing dependencies...
      - Runs npm install
      - Installs all required packages

[3/6] Setting up environment configuration...
      - Creates .env from .env.example
      - Configures for Docker networking
      - Sets WOPI_SERVER=http://host.docker.internal:3000
      - Enables verbose logging

[4/6] Creating files directory...
      - Creates files/ folder
      - Adds test.txt sample file

[5/6] Checking Docker...
      - Verifies Docker is installed
      - Checks Docker daemon is running

[6/6] Starting Collabora Online...
      - Starts Collabora container
      - Waits for it to be ready (30s timeout)
      - Verifies /hosting/discovery endpoint

Starting WOPI Server...
      - Kills any existing process on port 3000
      - Starts WOPI server in background
      - Logs output to wopi-server.log
```

## After Setup

Once the setup completes, you'll see:

```
================================================
  ✓ Setup Complete!
================================================

Access your WOPI Server at:
➜  http://localhost:3000

Collabora Admin Console:
➜  http://localhost:9980/browser/dist/admin/admin.html
   Username: admin
   Password: admin

Logs:
  - WOPI Server: tail -f wopi-server.log
  - Collabora:   docker compose logs -f collabora

To stop services:
  - WOPI Server: kill [PID]
  - Collabora:   docker compose down
```

## Viewing Logs

### WOPI Server Logs

```bash
# View logs in real-time
tail -f wopi-server.log

# View all logs
cat wopi-server.log
```

### Collabora Logs

```bash
# View logs in real-time
docker compose logs -f collabora

# View last 50 lines
docker compose logs --tail 50 collabora
```

## Troubleshooting

### Script Fails at Step 5 (Docker)

**Problem:** Docker daemon is not running

**Solution:**
```bash
# Start Docker Desktop
# Then run the script again
bash setup-and-run.sh
```

### Script Fails at Step 6 (Collabora)

**Problem:** Port 9980 is already in use

**Solution:**
```bash
# Find what's using port 9980
# Linux/Mac:
lsof -i :9980

# Windows (Git Bash):
netstat -ano | findstr :9980

# Kill the process or change the port in docker-compose.yml
```

### WOPI Server Won't Start

**Problem:** Port 3000 is already in use

**Solution:**
```bash
# The script will automatically kill any process on port 3000
# If that fails, manually kill it:

# Linux/Mac:
kill $(lsof -t -i:3000)

# Windows (Git Bash):
netstat -ano | findstr :3000
# Note the PID and:
taskkill /PID [PID] /F
```

### "Permission Denied" When Running Scripts

**Problem:** Scripts don't have execute permissions

**Solution:**
```bash
chmod +x setup-and-run.sh stop-services.sh
./setup-and-run.sh
```

### Running the Script

The script must be run from within the cloned repository directory:

```bash
cd node-wopi-server
bash setup-and-run.sh
```

## Manual Setup Alternative

If you prefer to run steps manually:

```bash
# 1. Clone repository
git clone https://github.com/szsz/node-wopi-server.git
cd node-wopi-server

# 2. Install dependencies
npm install

# 3. Setup environment
cp .env.example .env
# Edit .env with your settings

# 4. Create files directory
mkdir -p files
echo "Test" > files/test.txt

# 5. Start Collabora
docker compose up -d

# 6. Start WOPI Server
npm start
```

## Advanced Usage

### Custom Repository URL

Edit `setup-and-run.sh` and change:
```bash
REPO_URL="https://github.com/YOUR-USERNAME/node-wopi-server.git"
```

### Custom Ports

Edit `setup-and-run.sh` and change:
```bash
WOPI_PORT=3000      # Change to your desired port
COLLABORA_PORT=9980 # Change to your desired port
```

Then update `docker-compose.yml` and `.env` accordingly.

### Running on a Remote Server

If running on a server:

1. Replace `localhost` with your server's IP/domain in `.env`:
   ```env
   WOPI_SERVER=http://your-server-ip:3000
   OFFICE_ONLINE_SERVER=http://your-server-ip:9980
   ```

2. Update `docker-compose.yml` domain setting:
   ```yaml
   - domain=your-domain\\.com
   ```

3. Ensure firewall allows ports 3000 and 9980

## Files Created by Script

- `.env` - Environment configuration
- `files/` - Directory for Office documents
- `files/test.txt` - Sample test file
- `wopi-server.log` - WOPI server output log
- `.wopi-server.pid` - PID file for WOPI server process

## Cleaning Up

To completely remove everything:

```bash
# Stop services
bash stop-services.sh

# Remove containers and volumes
docker compose down -v

# Remove files
rm -rf files/ wopi-server.log .wopi-server.pid

# Remove repository (if needed)
cd ..
rm -rf node-wopi-server/
```

## Support

For issues:
- Check `wopi-server.log` for WOPI server errors
- Check `docker compose logs collabora` for Collabora errors
- See main documentation: `README.md`, `QUICK_START.md`, `COLLABORA_SETUP.md`

## License

Same as the main project (MIT)