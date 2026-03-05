# Collabora Online + WOPI Server Setup Guide

This guide will help you set up and run Collabora Online with the Node.js WOPI Server.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) installed
- [Docker Compose](https://docs.docker.com/compose/install/) installed
- [Node.js 14+](https://nodejs.org/en/) installed
- npm (comes with Node.js)

## Setup Instructions

### 1. Install WOPI Server Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

A `.env` file has been created with the default configuration:

```env
OFFICE_ONLINE_SERVER=http://localhost:9980
WOPI_IMPLEMENTED=view,open,edit
WOPI_SERVER=http://localhost:3000
```

**Note:** These settings are configured for local development on localhost. If you need to access from other machines on your network, you'll need to update the URLs accordingly.

### 3. Start Collabora Online

Start the Collabora Online container using Docker Compose:

```bash
docker-compose up -d
```

This will:
- Pull the latest Collabora Online Docker image
- Start Collabora on port 9980
- Configure it to allow connections from localhost

To check if Collabora is running:

```bash
docker-compose ps
```

To view Collabora logs:

```bash
docker-compose logs -f collabora
```

### 4. Start the WOPI Server

In a separate terminal (or after Collabora is running), start the WOPI server:

```bash
npm start
```

The WOPI server will start on port 3000.

### 5. Verify the Setup

1. **Check Collabora Discovery Endpoint:**
   
   Open in browser: http://localhost:9980/hosting/discovery
   
   You should see an XML response with discovery information.

2. **Check WOPI Server:**
   
   Open in browser: http://localhost:3000
   
   You should see the WOPI server interface.

3. **Check WOPI Discovery:**
   
   The WOPI server should be able to fetch discovery info from Collabora.

## Collabora Admin Console

Access the Collabora admin console at:

- URL: http://localhost:9980/browser/dist/admin/admin.html
- Username: `admin`
- Password: `admin`

## Stopping the Services

### Stop Collabora:
```bash
docker-compose down
```

### Stop WOPI Server:
Press `Ctrl+C` in the terminal where it's running.

## Troubleshooting

### Collabora container fails to start

1. Check if port 9980 is already in use:
   ```bash
   # Windows
   netstat -ano | findstr :9980
   
   # Linux/Mac
   lsof -i :9980
   ```

2. Check Docker logs:
   ```bash
   docker-compose logs collabora
   ```

### WOPI Server can't connect to Collabora

1. Ensure Collabora is running:
   ```bash
   docker-compose ps
   ```

2. Test the discovery endpoint manually:
   ```bash
   curl http://localhost:9980/hosting/discovery
   ```

3. Check that the `.env` file has the correct `OFFICE_ONLINE_SERVER` value.

### WOPI Server fails to start

1. Ensure port 3000 is not in use:
   ```bash
   # Windows
   netstat -ano | findstr :3000
   
   # Linux/Mac
   lsof -i :3000
   ```

2. Ensure dependencies are installed:
   ```bash
   npm install
   ```

3. Check that `.env` file exists in the project root.

## Platform-Specific Notes

### Windows
- Use PowerShell or Command Prompt for commands
- Docker Desktop for Windows must be running

### Linux
- Ensure your user is in the `docker` group:
  ```bash
  sudo usermod -aG docker $USER
  ```
- Log out and back in for group changes to take effect

### macOS
- Docker Desktop for Mac must be running
- Use Terminal for commands

## Advanced Configuration

### Custom Domains

If you need to access from a custom domain or different machine:

1. Update `docker-compose.yml`:
   ```yaml
   environment:
     - domain=yourdomain\\.com
   ```

2. Update `.env`:
   ```env
   OFFICE_ONLINE_SERVER=http://yourdomain.com:9980
   WOPI_SERVER=http://yourdomain.com:3000
   ```

### HTTPS/SSL

For production use with HTTPS, you'll need to:

1. Set up a reverse proxy (nginx, Apache, or Traefik)
2. Configure SSL certificates
3. Update Collabora environment variables:
   ```yaml
   - extra_params=--o:ssl.enable=true --o:ssl.termination=true
   ```

### Multiple Domains

To allow multiple domains to access Collabora, update the domain in `docker-compose.yml`:

```yaml
- domain=localhost|domain1\\.com|domain2\\.com
```

## File Structure

```
node-wopi-server/
├── docker-compose.yml          # Collabora container configuration
├── .env                        # WOPI server environment variables
├── .env.example               # Example environment variables
├── COLLABORA_SETUP.md         # This file
├── package.json               # Node.js dependencies
├── src/                       # WOPI server source code
└── ...
```

## Resources

- [Collabora Online Documentation](https://www.collaboraoffice.com/code/)
- [WOPI Protocol Specification](https://docs.microsoft.com/en-us/openspecs/office_protocols/ms-wopi/)
- [Collabora Docker Image](https://hub.docker.com/r/collabora/code)

## License

See LICENSE file for details.