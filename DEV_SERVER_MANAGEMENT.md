# Dev Server Management

## Problem
Background Bash processes in Claude Code show `status: running` even after the actual process exits. This causes:
- Multiple zombie dev servers accumulating
- Port conflicts and debugging issues
- Unclear which server is actually serving requests

## Root Cause
Claude Code's background shell tracking doesn't update when processes exit naturally. The shell remains marked as "running" indefinitely.

## Solution: Dev Server Management Script

**Location:** `scripts/dev-server.sh`

### Usage

```bash
# Start dev server (kills any existing servers first)
./scripts/dev-server.sh start

# Stop dev server
./scripts/dev-server.sh stop

# Restart dev server
./scripts/dev-server.sh restart

# Check server status
./scripts/dev-server.sh status
```

### How It Works

1. **Port Check**: Uses `lsof -ti:3050` to detect processes on port 3050
2. **Process Kill**: Kills by port AND process name to ensure cleanup
3. **Verification**: Confirms port is clear before starting new server
4. **Clean Start**: Only starts after confirming no conflicts

### Best Practices

**When Starting Dev Server:**
```bash
# Always use the management script
./scripts/dev-server.sh start
```

**Never:**
```bash
# Don't run npm run dev directly in background
npm run dev &  # ❌ Creates zombie tracking issues
```

**Claude Code Usage:**
```bash
# Use the management script for all dev server operations
/Users/bigdaddy/prod_desc/thunder-text/scripts/dev-server.sh restart
```

## Why This Works

1. **Atomic Operation**: Script ensures kill → verify → start happens atomically
2. **No Tracking Dependency**: Doesn't rely on Claude Code's background shell tracking
3. **Process-Level Control**: Works at OS level, not shell level
4. **Idempotent**: Safe to run multiple times - always results in exactly one server

## Debugging Server Issues

If you suspect zombie servers:

```bash
# Check what's actually running
lsof -ti:3050

# Check server status via script
./scripts/dev-server.sh status

# Force clean restart
./scripts/dev-server.sh restart
```

## Future Prevention

**Rule for Claude Code:**
- ALWAYS use `scripts/dev-server.sh` for dev server operations
- NEVER run `npm run dev` directly in background mode
- Check `./scripts/dev-server.sh status` before starting new servers
