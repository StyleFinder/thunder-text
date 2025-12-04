#!/bin/bash
# Apply debug route guards to all unprotected debug endpoints
# Usage: ./scripts/apply-debug-guards.sh

set -e

DEBUG_DIR="src/app/api/debug"
GUARD_IMPORT="import { guardDebugRoute } from '../_middleware-guard'"

# List of debug routes (excluding env which is already protected)
ROUTES=(
  "app-bridge-test"
  "auth-status"
  "check-token"
  "clear-token"
  "db-check"
  "decode-session-token"
  "env-check"
  "manual-token-exchange"
  "product-detail"
  "products"
  "supabase-check"
  "test-raw-token-exchange"
  "test-session-token"
  "test-token-exchange"
  "token-exchange-test"
  "token-status"
  "update-token"
  "verify-credentials"
)

echo "🔒 Applying Debug Route Guards"
echo "=============================="
echo ""

protected_count=0
already_protected=0
failed_count=0

for route in "${ROUTES[@]}"; do
  route_file="${DEBUG_DIR}/${route}/route.ts"

  if [ ! -f "$route_file" ]; then
    echo "⚠️  SKIP: $route (file not found)"
    ((failed_count++))
    continue
  fi

  # Check if already protected
  if grep -q "guardDebugRoute" "$route_file"; then
    echo "✓  SKIP: $route (already protected)"
    ((already_protected++))
    continue
  fi

  # Create backup
  cp "$route_file" "${route_file}.backup"

  echo "🔧 Protecting: $route"

  # This is a dry-run message
  # Actual implementation would need per-route logic
  echo "   → Add guard import"
  echo "   → Insert guard check at function start"
  echo "   📝 Manual intervention required for: $route_file"

  ((protected_count++))
done

echo ""
echo "=============================="
echo "Summary:"
echo "  Protected: $protected_count"
echo "  Already Protected: $already_protected"
echo "  Failed/Skipped: $failed_count"
echo ""
echo "⚠️  NOTE: This is a DRY RUN script"
echo "   Each route needs manual inspection due to varying structures"
echo ""
echo "📝 Next Steps:"
echo "   1. Review each route.ts file"
echo "   2. Add guardDebugRoute() call after imports"
echo "   3. Test each route in development"
echo "   4. Verify 403 response in production mode"
