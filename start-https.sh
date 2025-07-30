#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log "🚀 Starting Feathur with HTTPS support..."

# Function to kill processes more thoroughly
kill_processes() {
    log "🔄 Stopping existing processes..."
    
    # Kill by process name
    pkill -f "go run cmd/server/main.go" 2>/dev/null || true
    pkill -f "pnpm dev" 2>/dev/null || true
    pkill -f "vite" 2>/dev/null || true
    
    # Kill by port
    lsof -ti:8081 | xargs kill -9 2>/dev/null || true
    lsof -ti:5173 | xargs kill -9 2>/dev/null || true
    lsof -ti:5174 | xargs kill -9 2>/dev/null || true
    lsof -ti:5175 | xargs kill -9 2>/dev/null || true
    
    # Wait for processes to stop
    sleep 3
    
    # Verify processes are stopped
    if pgrep -f "go run cmd/server/main.go" > /dev/null; then
        error "Backend process still running, force killing..."
        pkill -9 -f "go run cmd/server/main.go" 2>/dev/null || true
    fi
    
    if pgrep -f "pnpm dev" > /dev/null; then
        error "Frontend process still running, force killing..."
        pkill -9 -f "pnpm dev" 2>/dev/null || true
    fi
}

# Generate self-signed certificate if not present
SSL_DIR="ssl"
CERT_FILE="$SSL_DIR/cert.pem"
KEY_FILE="$SSL_DIR/key.pem"

if [[ ! -f "$CERT_FILE" || ! -f "$KEY_FILE" ]]; then
    log "🔐 Generating self-signed SSL certificate..."
    mkdir -p "$SSL_DIR"
    openssl req -x509 -newkey rsa:2048 -days 365 -nodes \
        -keyout "$KEY_FILE" -out "$CERT_FILE" \
        -subj "/C=US/ST=State/L=City/O=Feathur/OU=Development/CN=localhost"
    
    if [[ $? -eq 0 ]]; then
        success "SSL certificate generated successfully"
    else
        error "Failed to generate SSL certificate"
        exit 1
    fi
else
    log "🔐 SSL certificates already exist"
fi

# Kill existing processes
kill_processes

# Start backend server
log "🔧 Starting backend server..."
cd server
go run cmd/server/main.go > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# Wait for backend to start with retry logic
log "⏳ Waiting for backend to start..."
BACKEND_READY=false
for i in {1..10}; do
    if curl -s http://localhost:8081/health > /dev/null 2>&1; then
        BACKEND_READY=true
        break
    fi
    log "Attempt $i/10: Backend not ready yet..."
    sleep 2
done

if [[ "$BACKEND_READY" == "true" ]]; then
    success "Backend server is running on http://localhost:8081"
else
    error "Backend server failed to start after 10 attempts"
    error "Check logs/backend.log for details"
    exit 1
fi

# Start frontend with HTTPS
log "🌐 Starting frontend with HTTPS..."
cd client/web
pnpm dev > ../../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
cd ../..

# Wait for frontend to start with retry logic
log "⏳ Waiting for frontend to start..."
FRONTEND_READY=false
for i in {1..15}; do
    if curl -s https://localhost:5173 > /dev/null 2>&1 || curl -s http://localhost:5173 > /dev/null 2>&1; then
        FRONTEND_READY=true
        break
    fi
    log "Attempt $i/15: Frontend not ready yet..."
    sleep 2
done

if [[ "$FRONTEND_READY" == "true" ]]; then
    success "Frontend server is running"
else
    warning "Frontend may not be fully ready, but continuing..."
fi

# Create logs directory
mkdir -p logs

echo ""
success "🎉 Feathur is now running with HTTPS!"
echo ""
echo -e "${GREEN}📱 Frontend (HTTPS):${NC} https://localhost:5173"
echo -e "${GREEN}🔧 Backend (HTTP):${NC}   http://localhost:8081"
echo -e "${GREEN}🎤 Voice Test:${NC}       https://localhost:5173/voice-test"
echo -e "${GREEN}📊 Logs:${NC}             logs/backend.log, logs/frontend.log"
echo ""
warning "⚠️  Note: You'll need to accept the self-signed certificate warning in your browser"
echo "   This is normal for local development with self-signed certificates."
echo ""
echo -e "${BLUE}Press Ctrl+C to stop all services${NC}"

# Function to cleanup on exit
cleanup() {
    echo ""
    log "🛑 Stopping services..."
    
    # Kill processes gracefully first
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    
    # Wait a moment
    sleep 2
    
    # Force kill if still running
    if pgrep -f "go run cmd/server/main.go" > /dev/null; then
        log "Force killing backend..."
        pkill -9 -f "go run cmd/server/main.go" 2>/dev/null || true
    fi
    
    if pgrep -f "pnpm dev" > /dev/null; then
        log "Force killing frontend..."
        pkill -9 -f "pnpm dev" 2>/dev/null || true
    fi
    
    success "All services stopped"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Function to show status
show_status() {
    echo ""
    log "📊 Service Status:"
    
    if curl -s http://localhost:8081/health > /dev/null 2>&1; then
        echo -e "  ${GREEN}✓${NC} Backend (http://localhost:8081)"
    else
        echo -e "  ${RED}✗${NC} Backend (http://localhost:8081)"
    fi
    
    if curl -s https://localhost:5173 > /dev/null 2>&1 || curl -s http://localhost:5173 > /dev/null 2>&1; then
        echo -e "  ${GREEN}✓${NC} Frontend (https://localhost:5173)"
    else
        echo -e "  ${RED}✗${NC} Frontend (https://localhost:5173)"
    fi
}

# Show status every 30 seconds
while true; do
    show_status
    sleep 30
done 