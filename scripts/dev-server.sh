#!/bin/bash

# Thunder Text Dev Server Manager
# Ensures only one dev server runs at a time

PROJECT_DIR="/Users/bigdaddy/projects/thunder-text"
PORT=3050

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if port is in use
check_port() {
    lsof -ti:$PORT >/dev/null 2>&1
    return $?
}

# Function to kill existing dev servers
kill_servers() {
    echo -e "${YELLOW}🔍 Checking for existing dev servers...${NC}"

    # Kill by port
    if check_port; then
        echo -e "${YELLOW}⚠️  Port $PORT is in use. Killing process...${NC}"
        lsof -ti:$PORT | xargs kill -9 2>/dev/null
        sleep 1
    fi

    # Kill by process name
    PIDS=$(pgrep -f "next dev --turbopack --port $PORT")
    if [ ! -z "$PIDS" ]; then
        echo -e "${YELLOW}⚠️  Found Next.js dev processes. Killing...${NC}"
        pkill -9 -f "next dev --turbopack --port $PORT"
        sleep 1
    fi

    # Verify clean
    if check_port; then
        echo -e "${RED}❌ Failed to kill process on port $PORT${NC}"
        exit 1
    fi

    echo -e "${GREEN}✅ Port $PORT is clear${NC}"
}

# Function to start dev server
start_server() {
    echo -e "${GREEN}🚀 Starting dev server on port $PORT...${NC}"
    cd "$PROJECT_DIR" && npm run dev
}

# Main execution
case "${1:-start}" in
    start)
        kill_servers
        start_server
        ;;
    stop)
        kill_servers
        ;;
    restart)
        kill_servers
        start_server
        ;;
    status)
        if check_port; then
            PID=$(lsof -ti:$PORT)
            echo -e "${GREEN}✅ Dev server is running (PID: $PID)${NC}"
        else
            echo -e "${RED}❌ No dev server running${NC}"
        fi
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status}"
        exit 1
        ;;
esac
