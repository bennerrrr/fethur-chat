#!/bin/bash

# Feathur Admin Promotion Script
# This script promotes an existing user to admin role

BASE_URL="http://localhost:8081"
ADMIN_USERNAME="feathur_admin"
ADMIN_PASSWORD="Admin123!@#"

echo "🔧 Feathur Admin Promotion Script"
echo "================================="

# Check if server is running
echo "📡 Checking server status..."
if ! curl -s "$BASE_URL/health" > /dev/null; then
    echo "❌ Server is not running. Please start the server first."
    exit 1
fi

echo "✅ Server is running"

# Login as the user
echo "👤 Logging in as $ADMIN_USERNAME..."
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

# Get user ID from the response
USER_ID=$(echo "$LOGIN_RESPONSE" | grep -o '"id":[0-9]*' | cut -d':' -f2)

if [ -z "$USER_ID" ]; then
    echo "❌ Failed to get user ID from login response"
    exit 1
fi

echo "🆔 User ID: $USER_ID"

# Now update the user role to admin
echo "🔧 Updating user role to admin..."
UPDATE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/admin/users/$USER_ID/role" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{
        \"role\": \"admin\"
    }")

echo "Update response: $UPDATE_RESPONSE"

# Verify the user is now admin
echo "🔍 Verifying admin status..."
USER_RESPONSE=$(curl -s -X GET "$BASE_URL/api/auth/me" \
    -H "Authorization: Bearer $TOKEN")

echo "User info: $USER_RESPONSE"

# Extract role from response
ROLE=$(echo "$USER_RESPONSE" | grep -o '"role":"[^"]*"' | cut -d'"' -f4)

echo ""
echo "🎉 Admin promotion complete!"
echo "==========================="
echo "Username: $ADMIN_USERNAME"
echo "Password: $ADMIN_PASSWORD"
echo "Role: $ROLE"
echo ""
echo "You can now access:"
echo "- Chat: http://localhost:5173/chat"
echo "- Admin panel: http://localhost:5173/admin" 