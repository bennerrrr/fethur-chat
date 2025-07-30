#!/bin/bash

echo "🧪 Testing Feathur Login Functionality"
echo "======================================"

# Test backend health
echo "1. Testing backend health..."
if curl -s http://localhost:8081/health > /dev/null; then
    echo "   ✅ Backend is healthy"
else
    echo "   ❌ Backend is not responding"
    exit 1
fi

# Test frontend health
echo "2. Testing frontend health..."
if curl -k -s https://localhost:5173 > /dev/null; then
    echo "   ✅ Frontend is responding"
else
    echo "   ❌ Frontend is not responding"
    exit 1
fi

# Test admin login
echo "3. Testing admin login..."
ADMIN_RESPONSE=$(curl -s -X POST http://localhost:8081/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"password123!"}')

if echo "$ADMIN_RESPONSE" | grep -q "token"; then
    echo "   ✅ Admin login successful"
else
    echo "   ❌ Admin login failed"
    echo "   Response: $ADMIN_RESPONSE"
fi

# Test guest login
echo "4. Testing guest login..."
GUEST_RESPONSE=$(curl -s -X POST http://localhost:8081/api/auth/guest \
    -H "Content-Type: application/json")

if echo "$GUEST_RESPONSE" | grep -q "token"; then
    echo "   ✅ Guest login successful"
else
    echo "   ❌ Guest login failed"
    echo "   Response: $GUEST_RESPONSE"
fi

# Test frontend API proxy
echo "5. Testing frontend API proxy..."
PROXY_RESPONSE=$(curl -k -s https://localhost:5173/api/setup/status)

if echo "$PROXY_RESPONSE" | grep -q "isFirstTime"; then
    echo "   ✅ Frontend API proxy working"
else
    echo "   ❌ Frontend API proxy failed"
    echo "   Response: $PROXY_RESPONSE"
fi

echo ""
echo "🎉 All tests completed!"
echo ""
echo "📱 Frontend: https://localhost:5173"
echo "🔧 Backend:  http://localhost:8081"
echo ""
echo "You can now access the application in your browser!" 