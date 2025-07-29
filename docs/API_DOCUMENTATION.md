# API Documentation

## Overview

The Fethur API provides a comprehensive REST API for chat functionality, user management, and administrative features. All endpoints return JSON responses and use JWT authentication.

## Base URL

- **Development**: `http://localhost:8081`
- **Production**: Configure via environment variables

## Authentication

Most endpoints require authentication via JWT token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

## Response Format

All API responses follow this structure:

```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

## Endpoints

### Authentication

#### `POST /api/auth/login`
Authenticate a user and receive a JWT token.

**Request Body:**
```json
{
  "username": "admin",
  "password": "password123!"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com",
    "role": "super_admin",
    "created_at": "2025-07-28T20:00:00Z"
  }
}
```

#### `POST /api/auth/register`
Register a new user account.

**Request Body:**
```json
{
  "username": "newuser",
  "email": "user@example.com",
  "password": "securepassword123!"
}
```

#### `POST /api/auth/guest`
Login as a guest user (if guest mode is enabled).

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 0,
    "username": "guest",
    "role": "user"
  }
}
```

#### `GET /api/auth/me`
Get current user information.

**Response:**
```json
{
  "id": 1,
  "username": "admin",
  "email": "admin@example.com",
  "role": "super_admin",
  "created_at": "2025-07-28T20:00:00Z",
  "message_count": 42,
  "server_count": 3
}
```

### Servers & Channels

#### `GET /api/servers`
Get all available servers.

**Response:**
```json
[
  {
    "id": 1,
    "name": "Feathur Community",
    "description": "Main community server",
    "created_at": "2025-07-28T20:00:00Z",
    "channels": [
      {
        "id": 1,
        "name": "general",
        "description": "General discussion",
        "server_id": 1
      }
    ]
  }
]
```

#### `POST /api/servers`
Create a new server (requires authentication).

**Request Body:**
```json
{
  "name": "My Server",
  "description": "A new chat server"
}
```

#### `GET /api/servers/:id`
Get a specific server by ID.

#### `GET /api/servers/:id/channels`
Get all channels in a server.

#### `POST /api/servers/:id/channels`
Create a new channel in a server.

**Request Body:**
```json
{
  "name": "new-channel",
  "description": "A new channel"
}
```

### Messages

#### `GET /api/channels/:channelId/messages`
Get messages in a channel.

**Query Parameters:**
- `limit` (optional): Number of messages to return (default: 50)
- `offset` (optional): Number of messages to skip (default: 0)

**Response:**
```json
[
  {
    "id": 1,
    "content": "Hello, world!",
    "user_id": 1,
    "username": "admin",
    "channel_id": 1,
    "created_at": "2025-07-28T20:00:00Z"
  }
]
```

#### `POST /api/channels/:channelId/messages`
Send a message to a channel.

**Request Body:**
```json
{
  "content": "Hello, everyone!"
}
```

**Response:**
```json
{
  "id": 2,
  "content": "Hello, everyone!",
  "user_id": 1,
  "username": "admin",
  "channel_id": 1,
  "created_at": "2025-07-28T20:01:00Z"
}
```

### Admin Endpoints

All admin endpoints require `admin` or `super_admin` role.

#### `GET /api/admin/users`
Get all users in the system.

**Response:**
```json
[
  {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com",
    "role": "super_admin",
    "created_at": "2025-07-28T20:00:00Z",
    "message_count": 42,
    "server_count": 3,
    "is_online": true
  }
]
```

#### `POST /api/admin/users`
Create a new user.

**Request Body:**
```json
{
  "username": "newuser",
  "email": "user@example.com",
  "password": "password123!",
  "role": "user"
}
```

#### `PUT /api/admin/users/:id`
Update a user.

**Request Body:**
```json
{
  "username": "updateduser",
  "email": "updated@example.com",
  "password": "newpassword123!"
}
```

#### `DELETE /api/admin/users/:id`
Delete a user.

#### `POST /api/admin/users/:id/role`
Update user role.

**Request Body:**
```json
{
  "role": "admin"
}
```

#### `POST /api/admin/users/:id/kick`
Kick a user from the system.

**Request Body:**
```json
{
  "reason": "Violation of community guidelines"
}
```

#### `POST /api/admin/users/:id/ban`
Ban a user.

**Request Body:**
```json
{
  "reason": "Repeated violations",
  "duration": 24
}
```

#### `POST /api/admin/users/:id/mute`
Mute a user.

**Request Body:**
```json
{
  "reason": "Spam",
  "duration": 60
}
```

#### `POST /api/admin/users/:id/unban`
Unban a user.

#### `POST /api/admin/users/:id/unmute`
Unmute a user.

#### `GET /api/admin/health`
Get system health information.

**Response:**
```json
{
  "database": {
    "status": "healthy",
    "connection": "connected"
  },
  "websocket": {
    "status": "healthy",
    "connections": 5
  },
  "api": {
    "status": "healthy",
    "uptime": "2h 30m"
  }
}
```

#### `GET /api/admin/metrics`
Get system metrics.

**Response:**
```json
{
  "user_activity": {
    "active_users_24h": 15,
    "new_users_today": 3,
    "messages_today": 127
  },
  "role_distribution": {
    "user": 12,
    "admin": 2,
    "super_admin": 1
  },
  "online_users": 5
}
```

#### `GET /api/admin/users/online`
Get currently online users.

**Response:**
```json
[
  {
    "id": 1,
    "username": "admin",
    "ip": "192.168.1.100",
    "connected_at": "2025-07-28T20:00:00Z"
  }
]
```

#### `GET /api/admin/users/latency`
Get user latency information.

**Response:**
```json
[
  {
    "user_id": 1,
    "username": "admin",
    "latency_ms": 45,
    "last_ping": "2025-07-28T20:01:00Z"
  }
]
```

#### `GET /api/admin/logs`
Get audit logs.

**Query Parameters:**
- `limit` (optional): Number of logs to return (default: 20)
- `offset` (optional): Number of logs to skip (default: 0)

**Response:**
```json
[
  {
    "id": 1,
    "admin_username": "admin",
    "action": "user_created",
    "details": "Created user: newuser",
    "created_at": "2025-07-28T20:00:00Z"
  }
]
```

### Settings

#### `GET /api/settings`
Get system settings.

**Response:**
```json
{
  "guest_mode_enabled": true,
  "auto_login_enabled": false,
  "default_username": "",
  "default_password": ""
}
```

#### `POST /api/settings`
Update system settings.

**Request Body:**
```json
{
  "guest_mode_enabled": true,
  "auto_login_enabled": false,
  "default_username": "guest",
  "default_password": "guest123!"
}
```

### Health Check

#### `GET /health`
Simple health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-07-28T20:00:00Z"
}
```

### WebSocket

#### `GET /ws`
WebSocket connection for real-time communication.

**Query Parameters:**
- `token`: JWT authentication token

**Events:**

**Client to Server:**
```json
{
  "type": "message",
  "channel_id": 1,
  "content": "Hello, world!"
}
```

**Server to Client:**
```json
{
  "type": "message_created",
  "channel_id": 1,
  "message": {
    "id": 1,
    "content": "Hello, world!",
    "user_id": 1,
    "username": "admin",
    "created_at": "2025-07-28T20:00:00Z"
  }
}
```

## Error Responses

All endpoints return consistent error responses:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

Common error codes:
- `UNAUTHORIZED`: Authentication required
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `VALIDATION_ERROR`: Invalid request data
- `INTERNAL_ERROR`: Server error

## Rate Limiting

Currently, no rate limiting is implemented. Consider implementing rate limiting for production use.

## CORS

The API includes CORS middleware and accepts requests from:
- `http://localhost:5173`
- `http://localhost:5174`
- `http://localhost:5175`
- `http://192.168.1.23:*`

## Authentication Flow

1. **Login**: `POST /api/auth/login` → Receive JWT token
2. **Include Token**: Add `Authorization: Bearer <token>` header to requests
3. **Token Expiry**: Tokens expire after 24 hours
4. **Refresh**: Re-authenticate to get a new token

## Testing

Use the debug page at `/debug` to test API endpoints and authentication.

## Examples

### JavaScript/TypeScript

```javascript
// Login
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'admin',
    password: 'password123!'
  })
});
const { token } = await response.json();

// Send message
await fetch('/api/channels/1/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    content: 'Hello, world!'
  })
});
```

### cURL

```bash
# Login
curl -X POST http://localhost:8081/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password123!"}'

# Send message
curl -X POST http://localhost:8081/api/channels/1/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"content":"Hello, world!"}'
``` 