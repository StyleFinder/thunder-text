# Quick Dev Server Commands

## Daily Startup Routine
```bash
# 1. Check what's running
./daily-startup-check.sh

# 2. If servers found, kill them
./kill-all-shopify.sh

# 3. Start fresh
shopify app dev
```

## Emergency Commands
```bash
# Kill everything Shopify
./kill-all-shopify.sh

# Check specific port
lsof -i :3050

# Kill specific process by PID
kill 21032

# Nuclear option (kill all node processes)
pkill node
```

## Understanding What You See
```bash
# This shows running processes
ps aux | grep shopify

# This shows what's using ports  
lsof -i :3050

# This shows listening ports
netstat -an | grep LISTEN
```

## Key Signs of Conflicts
- ⚠️ Multiple PIDs when running `ps aux | grep shopify`
- ⚠️ App accessible on weird ports (54929 instead of 3050)
- ⚠️ Error messages about ports being busy
- ⚠️ App behaving strangely (old code running)

## Clean Slate Procedure
1. `./kill-all-shopify.sh`
2. `./daily-startup-check.sh` (should show "ALL CLEAR")
3. `shopify app dev`
4. Note the port number it gives you
5. Open that URL in browser