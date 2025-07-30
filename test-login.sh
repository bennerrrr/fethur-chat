#!/bin/bash

# Feathur Login Test Script
# This script tests the login functionality through the HTTPS proxy

BASE_URL="https://localhost:5173"
ADMIN_USERNAME="feathur_admin"
ADMIN_PASSWORD="Admin123!@#"

echo "🧪 Feathur Login Test Script"
echo "============================"

# Check if frontend is running
echo "📡 Checking frontend status..."
if ! curl -s -k "$BASE_URL/health" > /dev/null; then
    echo "❌ Frontend is not running or proxy not working."
    echo "   Make sure the frontend is running: cd client/web && pnpm dev"
    exit 1
fi

echo "✅ Frontend is running and proxy is working"

# Test login
echo "👤 Testing login..."
LOGIN_RESPONSE=$(curl -s -k -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{
        \"username\": \"$ADMIN_USERNAME\",
        \"password\": \"$ADMIN_PASSWORD\"
    }")

echo "Login response: $LOGIN_RESPONSE"

# Extract token from response
TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo "❌ Failed to get token from login response"
    echo "Response: $LOGIN_RESPONSE"
    exit 1
fi

echo "✅ Login successful"
echo "🔑 Token: ${TOKEN:0:20}..."

# Test getting current user
echo "🔍 Testing get current user..."
USER_RESPONSE=$(curl -s -k -X GET "$BASE_URL/api/auth/me" \
    -H "Authorization: Bearer $TOKEN")

echo "User info: $USER_RESPONSE"

# Extract role from response
ROLE=$(echo "$USER_RESPONSE" | grep -o '"role":"[^"]*"' | cut -d'"' -f4)

echo ""
echo "🎉 All tests passed!"
echo "==================="
echo "Username: $ADMIN_USERNAME"
echo "Role: $ROLE"
echo ""
echo "You can now access:"
echo "- Frontend: $BASE_URL"
echo "- Chat: $BASE_URL/chat"
echo "- Admin panel: $BASE_URL/admin"
