# Feathur API Documentation

## Overview

The Feathur API provides a RESTful interface for managing chat servers, channels, messages, and user authentication. All endpoints return JSON responses and use standard HTTP status codes.

**Base URL**: `http://localhost:8081` (development)

## Authentication

Most endpoints require authentication via JWT tokens. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Token Format
JWT tokens contain user information and expire after 24 hours. They include:
- `user_id`: User's unique identifier
- `username`: User's display name
- `role`: User's role (user, admin, super_admin)

## Endpoints

### Authentication

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "string",
  "email": "string",
  "password": "string"
}
```

**Response** (201 Created):
```json
{
  "token": "jwt-token-string",
  "user": {
    "id": 1,
    "username": "string",
    "email": "string",
    "role": "user"
  }
}
```

**Password Requirements**:
- Minimum 9 characters
- Must contain at least one number
- Must contain at least one special character

#### Login User
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "string",
  "password": "string"
}
```

**Response** (200 OK):
```json
{
  "token": "jwt-token-string",
  "user": {
    "id": 1,
    "username": "string",
    "email": "string",
    "role": "user"
  }
}
```

#### Guest Login
```http
POST /api/auth/guest
Content-Type: application/json

{}
```

**Requirements**:
- Guest mode must be enabled in admin settings
- Auto-login must be enabled in admin settings
- Default credentials must be configured

**Response** (200 OK):
```json
{
  "token": "jwt-token-string",
  "user": {
    "id": 1,
    "username": "string",
    "email": "string",
    "role": "user"
  }
}
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <token>
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "username": "string",
    "email": "string",
    "role": "user"
  }
}
```

### Admin Settings

#### Get Settings
```http
GET /api/settings
Authorization: Bearer <token>
```

**Requirements**: Admin or Super Admin role

**Response** (200 OK):
```json
{
  "guest_mode_enabled": "true",
  "auto_login_enabled": "true",
  "default_username": "testuser",
  "default_password": "password123!"
}
```

#### Update Settings
```http
POST /api/settings
Authorization: Bearer <token>
Content-Type: application/json

{
  "guest_mode_enabled": true,
  "auto_login_enabled": true,
  "default_username": "string",
  "default_password": "string"
}
```

**Requirements**: Admin or Super Admin role

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Settings updated successfully"
}
```

### Servers

#### List Servers
```http
GET /api/servers
Authorization: Bearer <token>
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "string",
      "description": "string",
      "owner_id": 1,
      "created_at": "2025-07-28T17:00:00Z"
    }
  ]
}
```

#### Create Server
```http
POST /api/servers
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "string",
  "description": "string"
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "string",
    "description": "string",
    "owner_id": 1,
    "created_at": "2025-07-28T17:00:00Z"
  }
}
```

#### Get Server
```http
GET /api/servers/{id}
Authorization: Bearer <token>
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "string",
    "description": "string",
    "owner_id": 1,
    "created_at": "2025-07-28T17:00:00Z"
  }
}
```

### Channels

#### List Channels
```http
GET /api/servers/{serverId}/channels
Authorization: Bearer <token>
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "string",
      "server_id": 1,
      "channel_type": "text",
      "description": "string",
      "created_at": "2025-07-28T17:00:00Z"
    }
  ]
}
```

#### Create Channel
```http
POST /api/servers/{serverId}/channels
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "string",
  "type": "text",
  "description": "string"
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "string",
    "server_id": 1,
    "channel_type": "text",
    "description": "string",
    "created_at": "2025-07-28T17:00:00Z"
  }
}
```

### Messages

#### Get Messages
```http
GET /api/channels/{channelId}/messages?page=1&limit=50
Authorization: Bearer <token>
```

**Query Parameters**:
- `page` (optional): Page number (default: 1)
- `limit` (optional): Messages per page (default: 50, max: 100)

**Response** (200 OK):
```json
{
  "messages": [
    {
      "id": 1,
      "content": "string",
      "user_id": 1,
      "username": "string",
      "created_at": "2025-07-28T17:00:00Z"
    }
  ]
}
```

#### Send Message
```http
POST /api/channels/{channelId}/messages
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "string"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Message sent successfully",
  "data": {
    "id": 1,
    "channel_id": "1",
    "user_id": 1,
    "username": "string",
    "content": "string",
    "created_at": "2025-07-28T17:00:00Z"
  }
}
```

**Real-time Broadcasting**: Messages are automatically broadcast to all connected WebSocket clients in the same channel.

### WebSocket

#### Connect to WebSocket
```http
GET /ws?token=<jwt-token>
```

**Connection**: WebSocket upgrade from HTTP

**Message Format**:
```json
{
  "type": "message|join|leave|typing|stop_typing",
  "channel_id": 1,
  "content": "string",
  "user_id": 1,
  "username": "string",
  "timestamp": "2025-07-28T17:00:00Z",
  "data": {}
}
```

**Message Types**:
- `message`: New chat message
- `join`: User joined channel
- `leave`: User left channel
- `typing`: User started typing
- `stop_typing`: User stopped typing

### System

#### Health Check
```http
GET /health
```

**Response** (200 OK):
```json
{
  "status": "healthy",
  "message": "Fethur Server is running"
}
```

#### Setup Status
```http
GET /api/setup/status
```

**Response** (200 OK):
```json
{
  "is_first_time": true,
  "setup_complete": false
}
```

#### Configure System
```http
POST /api/setup/configure
Content-Type: application/json

{
  "network": {
    "hostname": "string",
    "port": 8081,
    "ssl": false,
    "external_domain": "string",
    "mdns": false
  },
  "auth": {
    "mode": "open_registration|invite_only|closed",
    "registration_password": "string"
  },
  "admin": {
    "username": "string",
    "password": "string",
    "confirm_password": "string"
  },
  "user": {
    "username": "string",
    "email": "string",
    "password": "string"
  }
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "System configured successfully"
}
```

## Error Responses

### Standard Error Format
```json
{
  "error": "Error message description"
}
```

### Common Status Codes
- `200 OK`: Request successful
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Authentication required or invalid token
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

### Authentication Errors
```json
{
  "error": "Invalid username or password"
}
```

```json
{
  "error": "Guest mode is not enabled"
}
```

```json
{
  "error": "Auto login is not enabled"
}
```

### Permission Errors
```json
{
  "error": "Only admins can access this endpoint"
}
```

## Rate Limiting

Currently, no rate limiting is implemented. Consider implementing rate limiting for production deployments.

## CORS

CORS is enabled for development with the following configuration:
- **Allowed Origins**: `http://localhost:5173`, `http://127.0.0.1:5173`
- **Allowed Methods**: GET, POST, PUT, DELETE, OPTIONS
- **Allowed Headers**: Origin, Content-Type, Accept, Authorization
- **Credentials**: true

## Security Considerations

1. **JWT Tokens**: Store tokens securely and never expose them in client-side code
2. **Password Requirements**: Enforce strong passwords (minimum 9 characters, numbers, special characters)
3. **Admin Access**: Limit admin panel access to trusted users only
4. **Guest Mode**: Use guest mode carefully in production environments
5. **HTTPS**: Always use HTTPS in production

## Examples

### Complete Authentication Flow
```bash
# 1. Register a new user
curl -X POST http://localhost:8081/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username": "newuser", "email": "user@example.com", "password": "password123!"}'

# 2. Login with the user
curl -X POST http://localhost:8081/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "newuser", "password": "password123!"}'

# 3. Use the token for authenticated requests
TOKEN="your-jwt-token-here"
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8081/api/servers
```

### Guest Access Flow
```bash
# 1. Enable guest mode (admin only)
curl -X POST http://localhost:8081/api/settings \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"guest_mode_enabled": true, "auto_login_enabled": true, "default_username": "guest", "default_password": "guest123!"}'

# 2. Guest login
curl -X POST http://localhost:8081/api/auth/guest \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Messaging Flow
```bash
# 1. Get channels
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8081/api/servers/1/channels

# 2. Send a message
curl -X POST http://localhost:8081/api/channels/1/messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content": "Hello, world!"}'

# 3. Get messages
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8081/api/channels/1/messages
``` 