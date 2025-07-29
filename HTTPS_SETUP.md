# 🔒 HTTPS Setup for Local Development

This guide explains how to use HTTPS for local development, which is required for voice chat functionality.

## 🎯 Why HTTPS?

Voice chat features require HTTPS because:
- **MediaDevices API** (microphone access) only works over secure connections
- **WebRTC** requires HTTPS for security reasons
- **Modern browsers** block media access on HTTP connections

## 🚀 Quick Start

### Option 1: Use the Start Script (Recommended)
```bash
./start-https.sh
```

This script will:
- ✅ Start the backend server
- ✅ Start the frontend with HTTPS
- ✅ Configure all necessary settings
- ✅ Provide you with the correct URLs

### Option 2: Manual Setup

1. **Start Backend Server:**
   ```bash
   cd server
   go run cmd/server/main.go
   ```

2. **Start Frontend with HTTPS:**
   ```bash
   cd client/web
   pnpm dev
   ```

## 🌐 Access URLs

Once running, access the application at:

- **Frontend (HTTPS):** https://localhost:5173
- **Backend (HTTP):** http://localhost:8081
- **Voice Test Page:** https://localhost:5173/voice-test

## ⚠️ Self-Signed Certificate Warning

When you first visit the HTTPS URL, your browser will show a security warning. This is normal for self-signed certificates.

### How to Accept the Certificate:

**Chrome/Edge:**
1. Click "Advanced"
2. Click "Proceed to localhost (unsafe)"
3. The site will load normally

**Firefox:**
1. Click "Advanced"
2. Click "Accept the Risk and Continue"
3. The site will load normally

**Safari:**
1. Click "Show Details"
2. Click "visit this website"
3. Enter your password if prompted
4. The site will load normally

## 🔧 Configuration Details

### SSL Certificates
- **Location:** `ssl/cert.pem` and `ssl/key.pem`
- **Valid for:** 365 days
- **Domain:** localhost
- **Type:** Self-signed

### Environment Variables
The frontend is configured to use:
- `PUBLIC_API_URL=https://localhost:5173`
- `PUBLIC_WS_URL=wss://localhost:5173`

### Vite Configuration
The `vite.config.ts` includes:
- HTTPS server configuration
- WebSocket proxy settings
- API proxy settings

## 🎤 Testing Voice Chat

1. **Visit the Voice Test Page:**
   ```
   https://localhost:5173/voice-test
   ```

2. **Check Status Indicators:**
   - ✅ HTTPS Status: Should show "Secure Connection"
   - ✅ MediaDevices API: Should show "Available"

3. **Test Microphone:**
   - Click "Test Microphone"
   - Allow microphone permissions when prompted
   - You should see "✅ Microphone is active and working"

4. **Test Voice Server:**
   - Click "Connect to Voice Server"
   - You should see "✅ Connected to voice server"

## 🛠️ Troubleshooting

### Certificate Issues
If you get certificate errors:
```bash
# Regenerate certificates
rm -rf ssl/
mkdir ssl
openssl req -x509 -newkey rsa:4096 -keyout ssl/key.pem -out ssl/cert.pem -days 365 -nodes -subj "/C=US/ST=State/L=City/O=Feathur/OU=Development/CN=localhost"
```

### Port Conflicts
If ports are in use:
```bash
# Kill existing processes
pkill -f "go run cmd/server/main.go"
pkill -f "pnpm dev"
```

### Browser Issues
- **Clear browser cache** and reload
- **Try incognito/private mode**
- **Check browser console** for errors

## 🔄 Development Workflow

1. **Start services:** `./start-https.sh`
2. **Make changes** to code
3. **Hot reload** will work automatically
4. **Test voice features** at https://localhost:5173/voice-test
5. **Stop services:** Ctrl+C

## 📝 Notes

- The backend still runs on HTTP (port 8081)
- Only the frontend uses HTTPS (port 5173)
- WebSocket connections are proxied through HTTPS
- All API calls are proxied through HTTPS
- Voice chat will work properly with this setup

## 🎉 Success!

Once you see:
- ✅ HTTPS Status: Secure Connection
- ✅ MediaDevices API: Available
- ✅ Microphone access working

You're ready to test voice chat features! 🎤 