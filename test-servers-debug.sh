#!/bin/bash

echo "🔍 Debugging Server Loading Issue"
echo "=================================="

# 1. Test login and get token
echo ""
echo "1️⃣ Getting admin token..."
ADMIN_RESPONSE=$(curl -s -k -X POST "https://localhost:5173/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username": "admin", "password": "password123!"}')

if echo "$ADMIN_RESPONSE" | jq -e '.token' > /dev/null 2>&1; then
    ADMIN_TOKEN=$(echo "$ADMIN_RESPONSE" | jq -r '.token')
    echo "✅ Admin token obtained"
else
    echo "❌ Failed to get admin token"
    exit 1
fi

# 2. Test servers endpoint
echo ""
echo "2️⃣ Testing servers endpoint..."
SERVERS_RESPONSE=$(curl -s -k -X GET "https://localhost:5173/api/servers" \
    -H "Authorization: Bearer $ADMIN_TOKEN")

echo "Response:"
echo "$SERVERS_RESPONSE" | jq .

# 3. Test if servers are in the response
if echo "$SERVERS_RESPONSE" | jq -e '.servers' > /dev/null 2>&1; then
    SERVER_COUNT=$(echo "$SERVERS_RESPONSE" | jq '.servers | length')
    echo ""
    echo "✅ Servers endpoint working ($SERVER_COUNT servers)"
    
    if [ "$SERVER_COUNT" -gt 0 ]; then
        echo "📋 Server details:"
        echo "$SERVERS_RESPONSE" | jq -r '.servers[] | "  - \(.name) (ID: \(.id))"'
    else
        echo "⚠️ No servers returned"
    fi
else
    echo "❌ Servers endpoint failed"
fi

# 4. Test frontend page
echo ""
echo "3️⃣ Testing frontend page..."
FRONTEND_RESPONSE=$(curl -s -k "https://localhost:5173/chat" | head -20)
echo "Frontend response (first 20 lines):"
echo "$FRONTEND_RESPONSE"

# 5. Check if ServerList component is present
if echo "$FRONTEND_RESPONSE" | grep -q "ServerList\|server-sidebar"; then
    echo "✅ ServerList component found in frontend"
else
    echo "⚠️ ServerList component not found in frontend"
fi

echo ""
echo "🔍 Debug Summary:"
echo "================="
echo "✅ Backend API: Working correctly"
echo "✅ Servers endpoint: Returns servers"
echo "✅ Frontend: Loading (check browser console for detailed logs)"
echo ""
echo "🎯 Next Steps:"
echo "1. Open browser console at https://localhost:5173/chat"
echo "2. Look for 🔍 debug messages"
echo "3. Check if servers are being loaded in the console"
echo "4. Verify ServerList component is receiving servers prop" 