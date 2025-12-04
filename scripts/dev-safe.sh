#!/bin/bash

# Safe dev server startup script
# Checks for existing processes before starting a new one

PORT=3050

echo "🔍 Checking for existing dev servers on port $PORT..."

# Check if port is already in use
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
  echo "⚠️  Port $PORT is already in use!"
  echo ""
  echo "Existing processes:"
  lsof -Pi :$PORT -sTCP:LISTEN
  echo ""
  read -p "Kill existing processes and restart? (y/N) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🔪 Killing existing processes..."
    lsof -ti:$PORT | xargs kill -9 2>/dev/null
    sleep 1
  else
    echo "❌ Aborted. Use 'npm run dev:kill' to stop existing servers."
    exit 1
  fi
fi

# Check for any running Next.js dev processes
NEXT_PIDS=$(pgrep -f "next dev")
if [ ! -z "$NEXT_PIDS" ]; then
  echo "⚠️  Found running Next.js dev processes:"
  ps -p $NEXT_PIDS -o pid,command
  echo ""
  read -p "Kill these processes and restart? (y/N) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🔪 Killing Next.js processes..."
    pkill -f "next dev"
    sleep 1
  else
    echo "❌ Aborted."
    exit 1
  fi
fi

echo "✅ No conflicts found. Starting dev server..."
echo ""

# Start the dev server
next dev --turbopack --port $PORT
