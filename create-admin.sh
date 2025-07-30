#!/bin/bash

# Feathur Admin User Creation Script
# This script creates an admin user for the Feathur application

BASE_URL="http://localhost:8081"
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="Admin123!@#"
ADMIN_EMAIL="admin@feathur.local"

echo "🚀 Feathur Admin User Creation Script"
echo "====================================="

# Check if server is running
echo "📡 Checking server status..."
if ! curl -s "$BASE_URL/health" > /dev/null; then
    echo "❌ Server is not running. Please start the server first."
    echo "   Run: cd server && go run cmd/server/main.go"
    exit 1
fi

echo "✅ Server is running"

# First, register a regular user
echo "👤 Registering admin user..."
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/register" \
    -H "Content-Type: application/json" \
    -d "{
        \"username\": \"$ADMIN_USERNAME\",
        \"password\": \"$ADMIN_PASSWORD\"
    }")

echo "Register response: $REGISTER_RESPONSE"

# Extract token from response
TOKEN=$(echo "$REGISTER_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo "❌ Failed to get token from registration response"
    echo "Response: $REGISTER_RESPONSE"
    exit 1
fi

echo "✅ User registered successfully"
echo "🔑 Token: ${TOKEN:0:20}..."

# Now update the user role to admin
echo "🔧 Updating user role to admin..."
UPDATE_RESPONSE=$(curl -s -X PATCH "$BASE_URL/api/admin/users/1/role" \
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

echo ""
echo "🎉 Admin user creation complete!"
echo "================================"
echo "Username: $ADMIN_USERNAME"
echo "Password: $ADMIN_PASSWORD"
echo "Role: admin"
echo ""
echo "You can now log in at: http://localhost:5173"
echo "Admin panel: http://localhost:5173/admin" 