# Quick Start Commands

## Prerequisites Check

Before running these commands, ensure Docker Desktop is installed and running:
- Windows: [Docker Desktop for Windows](https://docs.docker.com/desktop/install/windows-install/)
- Mac: [Docker Desktop for Mac](https://docs.docker.com/desktop/install/mac-install/)
- Linux: [Docker Engine](https://docs.docker.com/engine/install/)

## Starting the Services

### Step 1: Start Collabora Online (Docker)

```bash
docker compose up -d
```

Or if you have the older docker-compose:
```bash
docker-compose up -d
```

### Step 2: Verify Collabora is Running

Check container status:
```bash
docker compose ps
```

Check logs:
```bash
docker compose logs -f collabora
```

Test discovery endpoint (wait 30-60 seconds after starting):
```bash
curl http://localhost:9980/hosting/discovery
```

Or open in browser: http://localhost:9980/hosting/discovery

### Step 3: Start WOPI Server

In a new terminal window:
```bash
npm install
npm start
```

### Step 4: Verify Everything Works

1. WOPI Server UI: http://localhost:3000
2. Collabora Discovery: http://localhost:9980/hosting/discovery
3. Collabora Admin: http://localhost:9980/browser/dist/admin/admin.html (admin/admin)

## Stopping the Services

Stop Collabora:
```bash
docker compose down
```

Stop WOPI Server:
Press `Ctrl+C` in the terminal where it's running.

## Troubleshooting

If you get "docker: command not found":
1. Install Docker Desktop
2. Start Docker Desktop
3. Wait for Docker to fully start (whale icon in system tray)
4. Open a new terminal and try again

For detailed troubleshooting, see COLLABORA_SETUP.md