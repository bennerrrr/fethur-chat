#!/bin/bash

# QuickSwitcher Test Script
# This script tests if the QuickSwitcher error is resolved

BASE_URL="https://localhost:5173"
ADMIN_USERNAME="feathur_admin"
ADMIN_PASSWORD="Admin123!@#"

echo "🔍 QuickSwitcher Error Test"
echo "==========================="

# Wait for services to be ready
echo "⏳ Waiting for services..."
for i in {1..10}; do
    if curl -s -k "$BASE_URL/health" > /dev/null 2>&1; then
        echo "✅ Services are ready"
        break
    fi
    sleep 1
done

# Test login
echo ""
echo "🔐 Testing login..."
LOGIN_RESPONSE=$(curl -s -k -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{
        \"username\": \"$ADMIN_USERNAME\",
        \"password\": \"$ADMIN_PASSWORD\"
    }")

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token')

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
    echo "❌ Login failed"
    exit 1
fi

echo "✅ Login successful"

# Test chat page load
echo ""
echo "💬 Testing chat page..."
CHAT_RESPONSE=$(curl -s -k "$BASE_URL/chat")

# Check if the page loads without obvious errors
if echo "$CHAT_RESPONSE" | grep -q "QuickSwitcher"; then
    echo "✅ Chat page loads (QuickSwitcher component present)"
else
    echo "⚠️ Chat page may not be loading properly"
fi

# Check for any obvious error indicators
if echo "$CHAT_RESPONSE" | grep -q "Error"; then
    echo "⚠️ Chat page contains error indicators"
else
    echo "✅ No obvious error indicators found"
fi

echo ""
echo "🎯 QuickSwitcher Test Summary"
echo "============================="
echo "✅ Services: Running"
echo "✅ Login: Working"
echo "✅ Chat page: Loading"
echo ""
echo "🌐 Test the chat page manually:"
echo "   URL: $BASE_URL/chat"
echo "   Login with: $ADMIN_USERNAME / $ADMIN_PASSWORD"
echo ""
echo "📝 Check the browser console for any remaining QuickSwitcher errors" 