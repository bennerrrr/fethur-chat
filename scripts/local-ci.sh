#!/bin/bash

# Local CI/CD Script - Mimics GitHub Actions locally
set -e

echo "🚀 Starting Local CI/CD Pipeline..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "server/go.mod" ] || [ ! -f "client/web/package.json" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

# Step 1: Backend Tests
print_status "Running Backend Tests..."
cd server
if go test -v ./...; then
    print_success "Backend tests passed"
else
    print_error "Backend tests failed"
    exit 1
fi
cd ..

# Step 2: Frontend Lint
print_status "Running Frontend Lint..."
cd client/web
if pnpm lint; then
    print_success "Frontend lint passed"
else
    print_warning "Frontend lint had warnings (continuing...)"
fi

# Step 3: Frontend Type Check
print_status "Running Frontend Type Check..."
if pnpm check; then
    print_success "Frontend type check passed"
else
    print_error "Frontend type check failed"
    exit 1
fi

# Step 4: Frontend Build
print_status "Running Frontend Build..."
if pnpm build; then
    print_success "Frontend build passed"
else
    print_error "Frontend build failed"
    exit 1
fi

# Step 5: Frontend Tests
print_status "Running Frontend Tests..."
if pnpm test --run; then
    print_success "Frontend tests passed"
else
    print_error "Frontend tests failed"
    exit 1
fi

cd ..

# Step 6: Integration Tests (if available)
if [ -f "scripts/integration-tests.sh" ]; then
    print_status "Running Integration Tests..."
    if ./scripts/integration-tests.sh; then
        print_success "Integration tests passed"
    else
        print_error "Integration tests failed"
        exit 1
    fi
fi

print_success "🎉 All tests passed! Local CI/CD pipeline completed successfully." 