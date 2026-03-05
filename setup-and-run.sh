#!/bin/bash

# WOPI Server + Collabora Online Setup Script
# This script automates the complete setup and startup process

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
WOPI_PORT=3000
COLLABORA_PORT=9980

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  WOPI Server + Collabora Online Setup${NC}"
echo -e "${BLUE}================================================${NC}\n"

# Step 1: Verify we're in the project directory
echo -e "${YELLOW}[1/6] Checking project directory...${NC}"
if [ ! -f "package.json" ] || [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}✗ This script must be run from the node-wopi-server directory!${NC}"
    echo -e "${YELLOW}Please cd into the project directory first.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Project directory verified${NC}"

# Step 2: Install dependencies
echo -e "\n${YELLOW}[2/6] Installing dependencies...${NC}"
if command -v npm &> /dev/null; then
    npm install
    echo -e "${GREEN}✓ Dependencies installed${NC}"
else
    echo -e "${RED}✗ npm not found! Please install Node.js and npm first.${NC}"
    exit 1
fi

# Step 3: Setup environment file
echo -e "\n${YELLOW}[3/6] Setting up environment configuration...${NC}"
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        # Update .env for Docker networking
        if [[ "$OSTYPE" == "darwin"* ]] || [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
            # macOS or Windows
            sed -i.bak 's|WOPI_SERVER=http://a-wopi-server:3000|WOPI_SERVER=http://host.docker.internal:3000|g' .env
            sed -i.bak 's|OFFICE_ONLINE_SERVER=http://an-office-online-server|OFFICE_ONLINE_SERVER=http://localhost:9980|g' .env
            sed -i.bak 's|VERBOSE_LOGGING=false|VERBOSE_LOGGING=true|g' .env
            rm -f .env.bak
        else
            # Linux
            sed -i 's|WOPI_SERVER=http://a-wopi-server:3000|WOPI_SERVER=http://host.docker.internal:3000|g' .env
            sed -i 's|OFFICE_ONLINE_SERVER=http://an-office-online-server|OFFICE_ONLINE_SERVER=http://localhost:9980|g' .env
            sed -i 's|VERBOSE_LOGGING=false|VERBOSE_LOGGING=true|g' .env
        fi
        echo -e "${GREEN}✓ Created .env file${NC}"
    else
        echo -e "${RED}✗ .env.example not found!${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓ .env file already exists${NC}"
fi

# Step 4: Create files directory
echo -e "\n${YELLOW}[4/6] Creating files directory...${NC}"
if [ ! -d "files" ]; then
    mkdir -p files
    echo "Test Document - Created by setup script" > files/test.txt
    echo -e "${GREEN}✓ Files directory created with test file${NC}"
else
    echo -e "${GREEN}✓ Files directory already exists${NC}"
fi

# Step 5: Check Docker
echo -e "\n${YELLOW}[5/6] Checking Docker...${NC}"
if command -v docker &> /dev/null; then
    if docker ps &> /dev/null; then
        echo -e "${GREEN}✓ Docker is running${NC}"
    else
        echo -e "${RED}✗ Docker daemon is not running!${NC}"
        echo -e "${YELLOW}Please start Docker Desktop and run this script again.${NC}"
        exit 1
    fi
else
    echo -e "${RED}✗ Docker not found! Please install Docker first.${NC}"
    exit 1
fi

# Step 6: Start Collabora with Docker Compose
echo -e "\n${YELLOW}[6/6] Starting Collabora Online...${NC}"
if command -v docker &> /dev/null; then
    # Try docker compose (new syntax) first, fall back to docker-compose
    if docker compose version &> /dev/null; then
        docker compose up -d
    elif command -v docker-compose &> /dev/null; then
        docker-compose up -d
    else
        echo -e "${RED}✗ docker compose not available!${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Collabora container started${NC}"
    echo -e "${YELLOW}Waiting for Collabora to be ready (30 seconds)...${NC}"
    
    # Wait for Collabora to be ready
    for i in {1..30}; do
        if curl -s "http://localhost:${COLLABORA_PORT}/hosting/discovery" &> /dev/null; then
            echo -e "${GREEN}✓ Collabora is ready!${NC}"
            break
        fi
        echo -n "."
        sleep 1
    done
    echo ""
else
    echo -e "${RED}✗ Docker not found!${NC}"
    exit 1
fi

# Start WOPI Server
echo -e "\n${YELLOW}Starting WOPI Server...${NC}"

# Kill any existing node processes on port 3000
if lsof -Pi :${WOPI_PORT} -sTCP:LISTEN -t &> /dev/null; then
    echo -e "${YELLOW}Killing existing process on port ${WOPI_PORT}...${NC}"
    kill $(lsof -t -i:${WOPI_PORT}) 2>/dev/null || true
    sleep 2
fi

# Start the WOPI server in the background
echo -e "${YELLOW}Starting WOPI server on port ${WOPI_PORT}...${NC}"
nohup npm start > wopi-server.log 2>&1 &
WOPI_PID=$!

# Wait for WOPI server to start
sleep 5

# Check if WOPI server is running
if ps -p $WOPI_PID > /dev/null; then
    echo -e "${GREEN}✓ WOPI Server started (PID: ${WOPI_PID})${NC}"
else
    echo -e "${RED}✗ WOPI Server failed to start. Check wopi-server.log for details.${NC}"
    exit 1
fi

# Final output
echo -e "\n${GREEN}================================================${NC}"
echo -e "${GREEN}  ✓ Setup Complete!${NC}"
echo -e "${GREEN}================================================${NC}\n"

echo -e "${BLUE}Access your WOPI Server at:${NC}"
echo -e "${GREEN}➜  http://localhost:${WOPI_PORT}${NC}\n"

echo -e "${BLUE}Collabora Admin Console:${NC}"
echo -e "${GREEN}➜  http://localhost:${COLLABORA_PORT}/browser/dist/admin/admin.html${NC}"
echo -e "   Username: admin"
echo -e "   Password: admin\n"

echo -e "${BLUE}Collabora Discovery:${NC}"
echo -e "${GREEN}➜  http://localhost:${COLLABORA_PORT}/hosting/discovery${NC}\n"

echo -e "${YELLOW}Logs:${NC}"
echo -e "  - WOPI Server: tail -f wopi-server.log"
if docker compose version &> /dev/null; then
    echo -e "  - Collabora:   docker compose logs -f collabora\n"
else
    echo -e "  - Collabora:   docker-compose logs -f collabora\n"
fi

echo -e "${YELLOW}To stop services:${NC}"
echo -e "  - WOPI Server: kill ${WOPI_PID}"
if docker compose version &> /dev/null; then
    echo -e "  - Collabora:   docker compose down\n"
else
    echo -e "  - Collabora:   docker-compose down\n"
fi

echo -e "${BLUE}Add files to edit:${NC}"
echo -e "  Copy Office documents to: $(pwd)/files/\n"

echo -e "${GREEN}Happy editing! 🎉${NC}\n"

# Save PID for later
echo $WOPI_PID > .wopi-server.pid