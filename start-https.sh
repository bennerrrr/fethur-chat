#!/bin/bash

echo "🚀 Starting Feathur with HTTPS support..."

# Kill any existing processes
echo "🔄 Stopping existing processes..."
pkill -f "go run cmd/server/main.go" 2>/dev/null || true
pkill -f "pnpm dev" 2>/dev/null || true

# Wait a moment for processes to stop
sleep 2

# Start backend server
echo "🔧 Starting backend server..."
cd server
go run cmd/server/main.go &
BACKEND_PID=$!
cd ..

# Wait for backend to start
echo "⏳ Waiting for backend to start..."
sleep 3

# Check if backend is running
if curl -s http://localhost:8081/health > /dev/null; then
    echo "✅ Backend server is running on http://localhost:8081"
else
    echo "❌ Backend server failed to start"
    exit 1
fi

# Start frontend with HTTPS
echo "🌐 Starting frontend with HTTPS..."
cd client/web
pnpm dev &
FRONTEND_PID=$!
cd ../..

# Wait for frontend to start
echo "⏳ Waiting for frontend to start..."
sleep 5

echo ""
echo "🎉 Feathur is now running with HTTPS!"
echo ""
echo "📱 Frontend (HTTPS): https://localhost:5173"
echo "🔧 Backend (HTTP):   http://localhost:8081"
echo "🎤 Voice Test:       https://localhost:5173/voice-test"
echo ""
echo "⚠️  Note: You'll need to accept the self-signed certificate warning in your browser"
echo "   This is normal for local development with self-signed certificates."
echo ""
echo "Press Ctrl+C to stop all services"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping services..."
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Wait for user to stop
wait 