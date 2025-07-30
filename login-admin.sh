#!/bin/bash

# Feathur Admin Login Script
# This script logs in as admin and verifies the role

BASE_URL="http://localhost:8081"
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="Admin123!@#"

echo "🔐 Feathur Admin Login Script"
echo "============================="

# Check if server is running
echo "📡 Checking server status..."
if ! curl -s "$BASE_URL/health" > /dev/null; then
    echo "❌ Server is not running. Please start the server first."
    exit 1
fi

echo "✅ Server is running"

# Login as admin
echo "👤 Logging in as admin..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
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

# Get current user info
echo "🔍 Getting user info..."
USER_RESPONSE=$(curl -s -X GET "$BASE_URL/api/auth/me" \
    -H "Authorization: Bearer $TOKEN")

echo "User info: $USER_RESPONSE"

# Extract role from response
ROLE=$(echo "$USER_RESPONSE" | grep -o '"role":"[^"]*"' | cut -d'"' -f4)

echo ""
echo "🎉 Login complete!"
echo "=================="
echo "Username: $ADMIN_USERNAME"
echo "Role: $ROLE"
echo ""
echo "You can now access:"
echo "- Chat: http://localhost:5173/chat"
echo "- Admin panel: http://localhost:5173/admin" 