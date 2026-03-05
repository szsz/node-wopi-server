#!/bin/bash

# Stop WOPI Server and Collabora Online

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  Stopping WOPI Server + Collabora Online${NC}"
echo -e "${BLUE}================================================${NC}\n"

# Stop WOPI Server
echo -e "${YELLOW}Stopping WOPI Server...${NC}"
if [ -f ".wopi-server.pid" ]; then
    PID=$(cat .wopi-server.pid)
    if ps -p $PID > /dev/null 2>&1; then
        kill $PID
        echo -e "${GREEN}✓ WOPI Server stopped (PID: ${PID})${NC}"
    else
        echo -e "${YELLOW}WOPI Server was not running${NC}"
    fi
    rm -f .wopi-server.pid
else
    # Try to find and kill any process on port 3000
    if lsof -Pi :3000 -sTCP:LISTEN -t &> /dev/null; then
        kill $(lsof -t -i:3000) 2>/dev/null
        echo -e "${GREEN}✓ WOPI Server stopped${NC}"
    else
        echo -e "${YELLOW}WOPI Server was not running${NC}"
    fi
fi

# Stop Collabora
echo -e "\n${YELLOW}Stopping Collabora Online...${NC}"
if command -v docker &> /dev/null; then
    if docker compose version &> /dev/null; then
        docker compose down
    elif command -v docker-compose &> /dev/null; then
        docker-compose down
    else
        echo -e "${RED}✗ docker compose not available!${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Collabora stopped${NC}"
else
    echo -e "${RED}✗ Docker not found!${NC}"
fi

echo -e "\n${GREEN}✓ All services stopped${NC}\n"