# Feathur 🚀

A modern, self-hosted communication platform featuring real-time chat, voice communication, and comprehensive administration tools. Built with Go (backend) and SvelteKit (frontend), Feathur provides a Discord-like experience with enterprise-grade features.

## ✨ Features

- **🔐 Authentication**: JWT-based login/register with guest access
- **💬 Real-time Chat**: ✅ **FULLY WORKING** - WebSocket-based messaging with reactions and file uploads
- **🎤 Voice Communication**: WebRTC-based voice chat with advanced settings
- **🛡️ Admin Panel**: Comprehensive user and server management
- **🔒 Security**: HTTPS support with SSL/TLS encryption
- **📱 Responsive**: Modern UI that works on desktop and mobile
- **⚡ Performance**: Optimized for speed and efficiency

## 🎉 Latest Updates

### ✅ **Chat System Now Fully Working**
- **Real-time Messaging**: Messages send and receive instantly
- **WebSocket Integration**: Proper WebSocket connections for live updates
- **Message History**: Load and display message history correctly
- **Error Recovery**: Improved error handling and user feedback

### 🔧 **Recent Critical Fixes**
- Fixed message sending and receiving
- Resolved WebSocket connection issues
- Fixed API response parsing
- Improved voice chat WebSocket connections
- Fixed admin panel access issues

## 🚀 Quick Start

### Using Docker (Recommended)

```bash
# Clone the repository
git clone <repository-url>
cd Feathur

# Start all services
docker-compose up -d

# Access the application
# Frontend: https://localhost:5173
# Backend: https://localhost:8081
```

### Local Development

```bash
# Clone the repository
git clone <repository-url>
cd Feathur

# Start backend
cd server && go run cmd/server/main.go

# In another terminal, start frontend
cd client/web && pnpm dev

# Access the application
# Frontend: https://localhost:5173
# Backend: https://localhost:8081
```

## 🛠️ Development

### Prerequisites

- **Go 1.21+** for backend development
- **Node.js 18+** and **pnpm** for frontend development
- **Git** for version control

### Setup Development Environment

```bash
# Backend setup
cd server
go mod download
go test ./...

# Frontend setup
cd client/web
pnpm install
pnpm build
pnpm test

# Run all tests
make ci
```

### Available Commands

```bash
# Development
make dev              # Start both backend and frontend
make dev-backend      # Start backend only
make dev-frontend     # Start frontend only

# Testing
make ci               # Run full CI pipeline
make ci-backend       # Backend tests only
make ci-frontend      # Frontend tests only
make test-local       # Quick local tests

# Build
make build            # Build both backend and frontend
make build-backend    # Build backend only
make build-frontend   # Build frontend only

# Docker
make docker-build     # Build Docker images
make docker-up        # Start with Docker Compose
make docker-down      # Stop Docker services
```

## 📁 Project Structure

```
Feathur/
├── server/                 # Go backend
│   ├── cmd/server/        # Main application entry point
│   ├── internal/          # Internal packages
│   │   ├── auth/         # Authentication logic
│   │   ├── database/     # Database operations
│   │   ├── server/       # HTTP server and routes
│   │   ├── voice/        # WebRTC voice handling
│   │   └── websocket/    # WebSocket connections
│   └── data/             # SQLite database files
├── client/web/            # SvelteKit frontend
│   ├── src/
│   │   ├── lib/          # Shared libraries
│   │   │   ├── api/      # API client
│   │   │   ├── components/ # UI components
│   │   │   ├── stores/   # Svelte stores
│   │   │   └── webrtc/   # WebRTC client
│   │   └── routes/       # SvelteKit pages
│   └── static/           # Static assets
├── docs/                 # Documentation
├── docker/               # Docker configuration
└── scripts/              # Development scripts
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
# Server Configuration
SERVER_PORT=8081
SERVER_HOST=localhost
SSL_ENABLED=true
SSL_CERT_FILE=ssl/cert.pem
SSL_KEY_FILE=ssl/key.pem

# Database
DATABASE_URL=./data/feathur.db

# JWT
JWT_SECRET=your-secret-key-here
JWT_EXPIRY=24h

# CORS
CORS_ALLOWED_ORIGINS=https://localhost:5173,https://localhost:3000
```

### SSL Certificate Generation

For HTTPS support, generate self-signed certificates:

```bash
# Generate SSL certificates
./start-https.sh

# Or manually
mkdir ssl
openssl req -x509 -newkey rsa:4096 -keyout ssl/key.pem -out ssl/cert.pem -days 365 -nodes
```

## 🧪 Testing

### Backend Tests

```bash
cd server
go test -v ./...
```

### Frontend Tests

```bash
cd client/web
pnpm test
pnpm lint
pnpm check
```

### Full CI Pipeline

```bash
# Run complete CI pipeline locally
make ci

# Or use the script
./scripts/local-ci.sh
```

## 📚 Documentation

- **[Project Status & Changelog](docs/PROJECT_STATUS_AND_CHANGELOG.md)** - Comprehensive project overview
- **[Local CI/CD Guide](docs/LOCAL_CI_GUIDE.md)** - Running tests locally
- **[Home Lab CI Setup](docs/HOMELAB_CI_SETUP.md)** - Self-hosted CI/CD options
- **[API Documentation](docs/API_DOCUMENTATION.md)** - Backend API reference
- **[User Guide](docs/USER_GUIDE.md)** - End-user documentation

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](docs/CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `make ci`
5. Submit a pull request

## 🐛 Troubleshooting

### Common Issues

**Port already in use:**
```bash
# Kill process using port 8081
lsof -ti:8081 | xargs kill -9
```

**Frontend build errors:**
```bash
cd client/web
rm -rf node_modules .svelte-kit
pnpm install
pnpm build
```

**Database issues:**
```bash
cd server
rm -f data/feathur.db
go run cmd/server/main.go
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Go](https://golang.org/) and [SvelteKit](https://kit.svelte.dev/)
- UI components powered by [Tailwind CSS](https://tailwindcss.com/)
- Icons from [Lucide](https://lucide.dev/)
- Real-time communication with [WebSocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket) and [WebRTC](https://webrtc.org/)

---

**Feathur** - Modern communication, self-hosted. 🚀
