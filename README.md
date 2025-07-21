# Fethur 🚀

A lightweight, self-hostable Discord alternative built with performance and efficiency in mind.

## What is Fethur?

Fethur is an open-source, self-hostable communication platform that provides:
- **Real-time messaging** with WebSocket support
- **Voice channels** with WebRTC (coming soon)
- **Screen sharing** capabilities (coming soon)
- **Server management** with channels and permissions
- **Lightweight design** - uses minimal system resources
- **Easy deployment** - single binary, no complex setup

## Why Fethur?

- **Performance First**: Built for speed and efficiency
- **Self-Hosted**: Your data, your control
- **Lightweight**: Uses <50MB RAM, starts in <2 seconds
- **Modern Stack**: Go backend, Svelte frontend
- **Open Source**: Transparent, auditable, customizable

## Quick Start

### Option 1: Development Mode (Recommended)

```bash
# Install dependencies
make deps

# Run in development mode
make dev
```

### Option 2: Docker (Production-like)

```bash
# Build and run with Docker Compose
make docker-run

# Stop containers
make docker-stop
```

### Option 3: Manual Setup

```bash
# Navigate to server directory
cd server

# Install dependencies
go mod tidy

# Run the server
go run cmd/server/main.go
```

The server will start on `http://localhost:8080`

### API Testing

```bash
# Health check
curl http://localhost:8080/health

# Register a user
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "email": "test@example.com", "password": "password123"}'
```

## Project Structure

```
fethur/
├── server/                 # Go backend
│   ├── cmd/server/        # Main application
│   ├── internal/          # Private application code
│   ├── pkg/               # Public libraries
│   ├── .golangci.yml      # Linting configuration
│   └── README.md          # Server documentation
├── client/                # Frontend applications (coming soon)
├── docs/                  # Documentation
├── scripts/               # Build and deployment scripts
├── docker/                # Docker configurations
│   └── Dockerfile         # Multi-stage Docker build
├── .github/workflows/     # GitHub Actions
│   ├── ci.yml            # CI pipeline
│   └── release.yml       # Release pipeline
├── docker-compose.yml     # Local development setup
├── Makefile              # Development commands
└── README.md             # This file
```

## Features

### ✅ Implemented
- User authentication (JWT)
- Server and channel management
- Real-time messaging
- Typing indicators
- SQLite database
- RESTful API

### 🚧 In Development
- Voice channels (WebRTC)
- Screen sharing
- Desktop client (Electron)
- Web client (Svelte)
- Mobile app

### 📋 Planned
- File uploads
- User avatars
- Advanced permissions
- Bot API
- Cloud hosting

## Performance

- **Memory Usage**: <50MB per client
- **Startup Time**: <2 seconds
- **Message Latency**: <100ms
- **Concurrent Users**: 100+ tested
- **Docker Image Size**: <50MB
- **CI Pipeline Time**: <5 minutes

## Development

### Prerequisites
- Go 1.21+
- Docker & Docker Compose (for containerized development)
- Node.js 18+ (for client development)
- SQLite (included with Go)

### Development Commands

```bash
# Show all available commands
make help

# Development workflow
make deps          # Install dependencies
make dev           # Run server in development mode
make test          # Run tests
make lint          # Run linter
make fmt           # Format code

# Building
make build         # Build binary
make clean         # Clean build artifacts

# Docker
make docker-build  # Build Docker image
make docker-run    # Run with Docker Compose
make docker-stop   # Stop containers

# Testing & Quality
make test-coverage # Run tests with coverage report
make security      # Run security scan
make bench         # Run performance benchmarks
```

### CI/CD Pipeline

This project uses GitHub Actions for automated testing and deployment:

- **CI Pipeline**: Runs on every push and pull request
  - Unit tests with coverage
  - Code linting with golangci-lint
  - Security scanning with Trivy
  - Multi-platform builds
  - Docker image testing

- **Release Pipeline**: Runs on version tags (v*)
  - Creates GitHub releases
  - Builds multi-platform binaries
  - Publishes Docker images to GHCR

### Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests (`make test`)
5. Run linter (`make lint`)
6. Submit a pull request

**Note**: All PRs must pass CI checks before merging.

## License

MIT License - see LICENSE file for details

## Documentation

📚 **Comprehensive Documentation**: Visit [`/docs`](docs/) for organized documentation including:
- **Project Planning & Architecture** - Roadmaps, feature analysis, and design decisions
- **Technical Implementation** - WebRTC guides, plugin architecture, and implementation details
- **DevOps & Deployment** - CI/CD setup, deployment guides, and contribution guidelines
- **Business Strategy** - Monetization plans and implementation roadmaps

🚀 **Quick Links**:
- [Project Plan](PROJECT_PLAN.md) - Main roadmap and technical decisions
- [Feature Analysis Report](FEATURE_ANALYSIS_REPORT.md) - Current implementation status
- [WebRTC Implementation Guide](docs/WEBRTC_PERFORMANCE_IMPLEMENTATION_GUIDE.md) - Voice/video features
- [Plugin Architecture Research](PLUGIN_BOT_ARCHITECTURE_RESEARCH.md) - Extensibility system

## Support

- **Issues**: [GitHub Issues](https://github.com/bennerrrr/fethur-chat/issues)
- **Discussions**: [GitHub Discussions](https://github.com/bennerrrr/fethur-chat/discussions)
- **Actions**: [GitHub Actions](https://github.com/bennerrrr/fethur-chat/actions)
- **Docker Images**: [GitHub Container Registry](https://github.com/bennerrrr/fethur-chat/packages)

---

Built with ❤️ for the open source community # Trigger CI test
