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

### Server Setup

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
│   └── README.md          # Server documentation
├── client/                # Frontend applications (coming soon)
├── docs/                  # Documentation
├── scripts/               # Build and deployment scripts
└── docker/                # Docker configurations
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

## Development

### Prerequisites
- Go 1.21+
- Node.js 18+ (for client development)
- SQLite (included with Go)

### Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions
- **Documentation**: `/docs` directory

---

Built with ❤️ for the open source community 