#!/bin/bash

# Quick Test Script - Fast local testing
set -e

echo "⚡ Quick Local Test Suite"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

print_success() {
    echo -e "${GREEN}✅${NC} $1"
}

print_error() {
    echo -e "${RED}❌${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ️${NC} $1"
}

# Quick backend test
print_info "Testing Backend..."
cd server
if go test -v ./internal/auth ./internal/database; then
    print_success "Backend tests passed"
else
    print_error "Backend tests failed"
    exit 1
fi
cd ..

# Quick frontend build test
print_info "Testing Frontend Build..."
cd client/web
if pnpm build > /dev/null 2>&1; then
    print_success "Frontend build passed"
else
    print_error "Frontend build failed"
    exit 1
fi
cd ..

print_success "🎉 Quick tests completed successfully!" 