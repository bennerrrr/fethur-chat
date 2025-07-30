#!/bin/bash

echo "🔧 Feathur Login Fix Script"
echo "==========================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}This script will help fix common login issues...${NC}"
echo ""

# Check if services are running
echo "1. Checking if services are running..."

if curl -s http://localhost:8081/health > /dev/null 2>&1; then
    echo -e "   ${GREEN}✅ Backend is running${NC}"
else
    echo -e "   ${RED}❌ Backend is not running${NC}"
    echo "   Please start the backend first: cd server && go run cmd/server/main.go"
    exit 1
fi

if curl -k -s https://localhost:5173 > /dev/null 2>&1; then
    echo -e "   ${GREEN}✅ Frontend is running${NC}"
else
    echo -e "   ${RED}❌ Frontend is not running${NC}"
    echo "   Please start the frontend first: cd client/web && pnpm dev"
    exit 1
fi

echo ""

# Check environment variables
echo "2. Checking environment configuration..."

if [[ -f "client/web/.env" ]]; then
    echo -e "   ${GREEN}✅ .env file exists${NC}"
    
    # Check if API URL is correct for HTTPS
    if grep -q "PUBLIC_API_URL=https://localhost:5173" client/web/.env; then
        echo -e "   ${GREEN}✅ API URL is configured for HTTPS${NC}"
    else
        echo -e "   ${YELLOW}⚠️  API URL needs to be updated for HTTPS${NC}"
        echo "   Updating .env file..."
        cd client/web
        echo "PUBLIC_API_URL=https://localhost:5173" > .env
        echo "PUBLIC_WS_URL=wss://localhost:5173" >> .env
        echo "PUBLIC_DEV_MODE=true" >> .env
        echo "PUBLIC_LOG_LEVEL=debug" >> .env
        cd ../..
        echo -e "   ${GREEN}✅ .env file updated${NC}"
        echo -e "   ${YELLOW}⚠️  Please restart the frontend for changes to take effect${NC}"
    fi
else
    echo -e "   ${RED}❌ .env file missing${NC}"
    echo "   Creating .env file..."
    cd client/web
    echo "PUBLIC_API_URL=https://localhost:5173" > .env
    echo "PUBLIC_WS_URL=wss://localhost:5173" >> .env
    echo "PUBLIC_DEV_MODE=true" >> .env
    echo "PUBLIC_LOG_LEVEL=debug" >> .env
    cd ../..
    echo -e "   ${GREEN}✅ .env file created${NC}"
    echo -e "   ${YELLOW}⚠️  Please restart the frontend for changes to take effect${NC}"
fi

echo ""

# Test login functionality
echo "3. Testing login functionality..."

ADMIN_RESPONSE=$(curl -s -X POST http://localhost:8081/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"password123!"}')

if echo "$ADMIN_RESPONSE" | grep -q "token"; then
    echo -e "   ${GREEN}✅ Admin login works${NC}"
else
    echo -e "   ${RED}❌ Admin login failed${NC}"
    echo "   Response: $ADMIN_RESPONSE"
fi

GUEST_RESPONSE=$(curl -s -X POST http://localhost:8081/api/auth/guest \
    -H "Content-Type: application/json")

if echo "$GUEST_RESPONSE" | grep -q "token"; then
    echo -e "   ${GREEN}✅ Guest login works${NC}"
else
    echo -e "   ${RED}❌ Guest login failed${NC}"
    echo "   Response: $GUEST_RESPONSE"
fi

echo ""

# Test frontend API proxy
echo "4. Testing frontend API proxy..."

PROXY_RESPONSE=$(curl -k -s https://localhost:5173/api/setup/status)

if echo "$PROXY_RESPONSE" | grep -q "isFirstTime"; then
    echo -e "   ${GREEN}✅ Frontend API proxy works${NC}"
else
    echo -e "   ${RED}❌ Frontend API proxy failed${NC}"
    echo "   Response: $PROXY_RESPONSE"
fi

echo ""
echo -e "${GREEN}🎉 Login fix script completed!${NC}"
echo ""
echo "If you're still having login issues:"
echo "1. Make sure you're accessing https://localhost:5173 (not http)"
echo "2. Accept the self-signed certificate warning in your browser"
echo "3. Try clearing your browser cache and cookies"
echo "4. Check the browser console for any JavaScript errors"
echo ""
echo "Access URLs:"
echo -e "${BLUE}Frontend:${NC} https://localhost:5173"
echo -e "${BLUE}Backend:${NC}  http://localhost:8081" 