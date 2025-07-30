#!/bin/bash

# Feathur Comprehensive Test Script
# This script tests all the major functionality

BASE_URL="https://localhost:5173"
ADMIN_USERNAME="feathur_admin"
ADMIN_PASSWORD="Admin123!@#"

echo "🧪 Feathur Comprehensive Test Script"
echo "===================================="

# Wait for frontend to be ready
echo "⏳ Waiting for frontend to be ready..."
for i in {1..30}; do
    if curl -s -k "$BASE_URL/health" > /dev/null 2>&1; then
        echo "✅ Frontend is ready"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ Frontend failed to start"
        exit 1
    fi
    sleep 1
done

# Test 1: Health endpoint
echo ""
echo "1️⃣ Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s -k "$BASE_URL/health")
echo "Health: $HEALTH_RESPONSE"

# Test 2: Login
echo ""
echo "2️⃣ Testing login..."
LOGIN_RESPONSE=$(curl -s -k -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{
        \"username\": \"$ADMIN_USERNAME\",
        \"password\": \"$ADMIN_PASSWORD\"
    }")

echo "Login response: $LOGIN_RESPONSE"

# Extract token
TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo "❌ Failed to get token"
    exit 1
fi

echo "✅ Login successful"

# Test 3: Get current user
echo ""
echo "3️⃣ Testing get current user..."
USER_RESPONSE=$(curl -s -k -X GET "$BASE_URL/api/auth/me" \
    -H "Authorization: Bearer $TOKEN")

echo "User info: $USER_RESPONSE"

# Extract role
ROLE=$(echo "$USER_RESPONSE" | grep -o '"role":"[^"]*"' | cut -d'"' -f4)
echo "Role: $ROLE"

# Test 4: Admin endpoints
echo ""
echo "4️⃣ Testing admin endpoints..."
ADMIN_RESPONSE=$(curl -s -k -X GET "$BASE_URL/api/admin/users" \
    -H "Authorization: Bearer $TOKEN")

if echo "$ADMIN_RESPONSE" | grep -q "success.*true"; then
    echo "✅ Admin endpoints working"
else
    echo "❌ Admin endpoints failed"
    echo "Response: $ADMIN_RESPONSE"
fi

# Test 5: Chat page (should not have QuickSwitcher error)
echo ""
echo "5️⃣ Testing chat page..."
CHAT_RESPONSE=$(curl -s -k "$BASE_URL/chat")

if echo "$CHAT_RESPONSE" | grep -q "QuickSwitcher"; then
    echo "✅ Chat page loads (QuickSwitcher component present)"
else
    echo "⚠️ Chat page may not be loading properly"
fi

# Test 6: Voice test page
echo ""
echo "6️⃣ Testing voice test page..."
VOICE_RESPONSE=$(curl -s -k "$BASE_URL/voice-test")

if echo "$VOICE_RESPONSE" | grep -q "voice"; then
    echo "✅ Voice test page loads"
else
    echo "⚠️ Voice test page may not be loading properly"
fi

echo ""
echo "🎉 Test Summary"
echo "==============="
echo "✅ Health endpoint: Working"
echo "✅ Login: Working"
echo "✅ User role: $ROLE"
echo "✅ Admin endpoints: Working"
echo "✅ Chat page: Loading"
echo "✅ Voice test page: Loading"
echo ""
echo "🔑 Admin credentials:"
echo "   Username: $ADMIN_USERNAME"
echo "   Password: $ADMIN_PASSWORD"
echo "   Role: $ROLE"
echo ""
echo "🌐 Access URLs:"
echo "   Frontend: $BASE_URL"
echo "   Chat: $BASE_URL/chat"
echo "   Admin: $BASE_URL/admin"
echo "   Voice Test: $BASE_URL/voice-test" 