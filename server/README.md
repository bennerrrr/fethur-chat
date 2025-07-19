# Fethur Server

A lightweight, self-hostable Discord alternative built with Go.

## Features

- ✅ User authentication (register/login)
- ✅ Server and channel management
- ✅ Real-time messaging via WebSocket
- ✅ Typing indicators
- ✅ SQLite database (easy deployment)
- ✅ JWT token authentication
- ✅ RESTful API

## Quick Start

### Prerequisites

- Go 1.21 or later
- SQLite (included with Go)
- Docker & Docker Compose (optional)

### Option 1: Development Mode

```bash
# From project root
make dev
```

### Option 2: Docker

```bash
# From project root
make docker-run
```

### Option 3: Manual Setup

1. **Navigate to server directory:**
   ```bash
   cd server
   ```

2. **Install dependencies:**
   ```bash
   go mod tidy
   ```

3. **Run the server:**
   ```bash
   go run cmd/server/main.go
   ```

The server will start on `http://localhost:8080`

### API Endpoints

#### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

#### Servers
- `POST /api/servers` - Create server
- `GET /api/servers` - Get user's servers
- `GET /api/servers/:id` - Get server details

#### Channels
- `POST /api/servers/:serverId/channels` - Create channel
- `GET /api/servers/:serverId/channels` - Get server channels

#### Messages
- `GET /api/channels/:channelId/messages` - Get channel messages

#### WebSocket
- `GET /ws?token=<jwt_token>` - WebSocket connection for real-time messaging

### Example Usage

#### Register a user:
```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123"
  }'
```

#### Login:
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "password123"
  }'
```

#### Create a server (use token from login):
```bash
curl -X POST http://localhost:8080/api/servers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your_jwt_token>" \
  -d '{
    "name": "My Server",
    "description": "A test server"
  }'
```

## WebSocket Messages

### Message Types

- `text` - Text message
- `join` - User joined channel
- `leave` - User left channel
- `typing` - User started typing
- `stop_typing` - User stopped typing

### Example WebSocket Message:
```json
{
  "type": "text",
  "channel_id": 1,
  "content": "Hello, world!",
  "user_id": 1,
  "username": "testuser",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

## Database Schema

The server automatically creates the following tables:
- `users` - User accounts
- `servers` - Discord-like servers
- `channels` - Text/voice channels
- `messages` - Chat messages
- `server_members` - Server membership

## Development

### Project Structure
```
server/
├── cmd/server/main.go     # Application entry point
├── internal/
│   ├── auth/             # Authentication service
│   ├── database/         # Database operations
│   ├── server/           # HTTP server and routes
│   └── websocket/        # WebSocket implementation
├── .golangci.yml         # Linting configuration
├── go.mod               # Go module file
└── README.md           # This file
```

### Development Commands

```bash
# From project root
make test          # Run tests
make lint          # Run linter
make fmt           # Format code
make build         # Build binary
make clean         # Clean artifacts
```

### Environment Variables
- `PORT` - Server port (default: 8080)
- `GIN_MODE` - Gin mode (debug/release)

### Testing

```bash
# Run all tests
make test

# Run tests with coverage
make test-coverage

# Run specific package tests
cd server && go test ./internal/auth
```

### Code Quality

This project uses golangci-lint for code quality checks:

```bash
# Run linter
make lint

# Auto-fix some issues
cd server && goimports -w .
```

## Performance

- **Memory Usage**: <100MB for typical usage
- **Response Time**: <100ms for API calls
- **WebSocket Latency**: <50ms for real-time messages
- **Concurrent Users**: Tested up to 100+ users
- **Docker Image**: <50MB optimized Alpine image
- **Startup Time**: <2 seconds

## Security

- Password hashing with bcrypt
- JWT token authentication
- SQL injection protection
- Input validation
- CORS configuration for development
- Automated security scanning with Trivy
- Non-root Docker container
- Regular dependency updates via Dependabot

## Next Steps

- [ ] Voice channels with WebRTC
- [ ] Screen sharing
- [ ] File uploads
- [ ] User avatars
- [ ] Server roles and permissions
- [ ] Message reactions
- [ ] Direct messages
- [ ] Mobile app support
- [ ] Enhanced test coverage
- [ ] Performance monitoring
- [ ] Load balancing
- [ ] Database migrations 