#!/bin/bash

# Feathur Admin Setup Script
# This script creates a new admin user for the Feathur application

BASE_URL="http://localhost:8081"
ADMIN_USERNAME="feathur_admin"
ADMIN_PASSWORD="Admin123!@#"
ADMIN_EMAIL="admin@feathur.local"

echo "🚀 Feathur Admin Setup Script"
echo "============================="

# Check if server is running
echo "📡 Checking server status..."
if ! curl -s "$BASE_URL/health" > /dev/null; then
    echo "❌ Server is not running. Please start the server first."
    echo "   Run: cd server && go run cmd/server/main.go"
    exit 1
fi

echo "✅ Server is running"

# First, register a regular user
echo "👤 Registering new admin user..."
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

# Get user ID from the response
USER_ID=$(echo "$REGISTER_RESPONSE" | grep -o '"id":[0-9]*' | cut -d':' -f2)

if [ -z "$USER_ID" ]; then
    echo "❌ Failed to get user ID from registration response"
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
echo "🎉 Admin user setup complete!"
echo "============================"
echo "Username: $ADMIN_USERNAME"
echo "Password: $ADMIN_PASSWORD"
echo "Role: $ROLE"
echo ""
echo "You can now log in at: http://localhost:5173"
echo "Admin panel: http://localhost:5173/admin" 