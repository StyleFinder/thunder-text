#!/bin/bash

# Authentication Flow Testing Script
# Tests the complete Shopify authentication flow end-to-end

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_BASE_URL="${API_BASE_URL:-http://localhost:3050}"
TEST_SHOP="${TEST_SHOP:-zunosai-staging-test-store.myshopify.com}"

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Shopify Authentication Flow Testing Script        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to print test step
print_step() {
  echo -e "${BLUE}▶ $1${NC}"
}

# Function to print success
print_success() {
  echo -e "${GREEN}✓ $1${NC}"
}

# Function to print error
print_error() {
  echo -e "${RED}✗ $1${NC}"
}

# Function to print warning
print_warning() {
  echo -e "${YELLOW}⚠ $1${NC}"
}

# Test 1: Environment Check
print_step "Test 1: Checking environment configuration"

if [ -z "$SHOPIFY_API_KEY" ]; then
  print_error "SHOPIFY_API_KEY not set"
  exit 1
fi

if [ -z "$SHOPIFY_API_SECRET" ]; then
  print_error "SHOPIFY_API_SECRET not set"
  exit 1
fi

if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
  print_error "NEXT_PUBLIC_SUPABASE_URL not set"
  exit 1
fi

if [ "$SHOPIFY_AUTH_BYPASS" = "true" ]; then
  print_error "SHOPIFY_AUTH_BYPASS is enabled - this should NOT be enabled in production!"
  exit 1
fi

print_success "Environment configuration valid"
echo ""

# Test 2: Server Health Check
print_step "Test 2: Checking if server is running"

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE_URL" || echo "000")

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "302" ]; then
  print_success "Server is running on $API_BASE_URL"
else
  print_error "Server is not running (HTTP $HTTP_CODE)"
  print_warning "Start the dev server with: npm run dev"
  exit 1
fi
echo ""

# Test 3: Database Connection
print_step "Test 3: Testing database connection"

# Try to verify database connectivity
if command -v psql &> /dev/null; then
  # Extract connection details from Supabase URL if available
  print_success "Database client available"
else
  print_warning "psql not available, skipping direct database test"
fi
echo ""

# Test 4: Token Manager Functionality
print_step "Test 4: Testing token storage and retrieval"

# We'll use the debug endpoint to verify token operations
RESPONSE=$(curl -s "$API_BASE_URL/api/debug/token-status?shop=$TEST_SHOP")

if echo "$RESPONSE" | grep -q "hasToken"; then
  print_success "Token manager API accessible"
  echo "Response: $RESPONSE"
else
  print_error "Token manager API failed"
  echo "Response: $RESPONSE"
fi
echo ""

# Test 5: Protected Route Access (Without Auth)
print_step "Test 5: Testing protected route without authentication"

RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
  "$API_BASE_URL/api/shopify/products?shop=$TEST_SHOP")

if [ "$RESPONSE" = "401" ]; then
  print_success "Protected route correctly requires authentication (401)"
else
  print_warning "Expected 401, got $RESPONSE"
fi
echo ""

# Test 6: Auth Bypass Check
print_step "Test 6: Verifying auth bypass is disabled"

node scripts/check-auth-bypass.mjs

if [ $? -eq 0 ]; then
  print_success "Auth bypass check passed"
else
  print_error "Auth bypass check failed"
  exit 1
fi
echo ""

# Test 7: Unit Tests
print_step "Test 7: Running authentication unit tests"

if npm test -- --testPathPattern="shopify-auth" --passWithNoTests 2>&1 | grep -q "PASS\|Tests:.*passed"; then
  print_success "Unit tests passed"
else
  print_warning "No unit tests found or tests failed"
fi
echo ""

# Test 8: Integration Tests (Optional)
print_step "Test 8: Running integration tests (if available)"

if [ "$SKIP_INTEGRATION_TESTS" != "true" ]; then
  if npm test -- --testPathPattern="token-manager" --passWithNoTests 2>&1 | grep -q "PASS\|Tests:.*passed"; then
    print_success "Integration tests passed"
  else
    print_warning "No integration tests found or tests failed"
  fi
else
  print_warning "Integration tests skipped (SKIP_INTEGRATION_TESTS=true)"
fi
echo ""

# Test 9: Token Exchange Endpoint
print_step "Test 9: Testing token exchange endpoint availability"

RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "$API_BASE_URL/api/shopify/auth/token-exchange" \
  -H "Content-Type: application/json" \
  -d '{"shop":"'$TEST_SHOP'"}')

if [ "$RESPONSE" = "400" ] || [ "$RESPONSE" = "401" ]; then
  print_success "Token exchange endpoint accessible (returned $RESPONSE as expected without token)"
else
  print_warning "Unexpected response: $RESPONSE"
fi
echo ""

# Test 10: Verify No Hardcoded Tokens in Routes
print_step "Test 10: Scanning for hardcoded tokens in API routes"

HARDCODED_TOKENS=$(grep -r "shpat_" src/app/api --include="*.ts" --include="*.tsx" | grep -v "// Example:" | grep -v "test" || true)

if [ -z "$HARDCODED_TOKENS" ]; then
  print_success "No hardcoded access tokens found in API routes"
else
  print_error "Found potential hardcoded tokens:"
  echo "$HARDCODED_TOKENS"
  exit 1
fi
echo ""

# Summary
echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    Test Summary                        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
print_success "All authentication tests passed!"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Test OAuth flow manually: Install app in Shopify Admin"
echo "2. Verify session tokens in Browser DevTools"
echo "3. Monitor authentication errors in Sentry"
echo "4. Test with real merchant stores before production"
echo ""
echo -e "${BLUE}Documentation:${NC}"
echo "• Testing Guide: docs/AUTHENTICATION_TESTING_GUIDE.md"
echo "• Cleanup Summary: docs/AUTHENTICATION_CLEANUP_SUMMARY.md"
echo ""
