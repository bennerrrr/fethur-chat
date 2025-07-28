# Feathur API Documentation

Complete API reference for the Feathur chat platform.

## 🔗 Base URL

- **Development**: `http://localhost:8081`
- **Network**: `http://192.168.1.23:8081`

## 🔐 Authentication

All authenticated endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

## 📋 API Endpoints

### Authentication

#### POST /api/auth/login
Login with username and password.

**Request:**
```json
{
  "username": "testuser",
  "password": "password123!"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 3,
    "username": "testuser",
    "email": "",
    "role": "user"
  }
}
```

#### POST /api/auth/register
Register a new user account.

**Request:**
```json
{
  "username": "newuser",
  "email": "user@example.com",
  "password": "password123!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "id": 4,
    "username": "newuser",
    "email": "user@example.com",
    "role": "user"
  }
}
```

#### POST /api/auth/guest
Guest login (requires guest mode enabled).

**Request:**
```json
{}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 3,
    "username": "testuser",
    "email": "",
    "role": "user"
  }
}
```

#### GET /api/auth/me
Get current user information.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 3,
    "username": "testuser",
    "email": "",
    "role": "user",
    "created_at": "2025-07-28T19:00:00Z"
  }
}
```

### Servers

#### GET /api/servers
Get all servers the user has access to.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "servers": [
    {
      "id": 1,
      "name": "Fethur Community",
      "description": "Official Feathur server",
      "icon": "",
      "owner_id": 1,
      "created_at": "2025-07-28T19:00:00Z"
    }
  ]
}
```

#### POST /api/servers
Create a new server.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request:**
```json
{
  "name": "My Server",
  "description": "A new server"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 2,
    "name": "My Server",
    "description": "A new server",
    "icon": "",
    "owner_id": 3,
    "created_at": "2025-07-28T19:00:00Z"
  }
}
```

#### GET /api/servers/:id
Get server details.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Fethur Community",
    "description": "Official Feathur server",
    "icon": "",
    "owner_id": 1,
    "created_at": "2025-07-28T19:00:00Z"
  }
}
```

### Channels

#### GET /api/servers/:id/channels
Get all channels in a server.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "channels": [
    {
      "id": 1,
      "name": "general",
      "description": "General discussion",
      "channel_type": "text",
      "server_id": 1,
      "created_at": "2025-07-28T19:00:00Z"
    }
  ]
}
```

#### POST /api/servers/:id/channels
Create a new channel.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request:**
```json
{
  "name": "new-channel",
  "type": "text",
  "description": "A new text channel"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 2,
    "name": "new-channel",
    "description": "A new text channel",
    "channel_type": "text",
    "server_id": 1,
    "created_at": "2025-07-28T19:00:00Z"
  }
}
```

### Messages

#### GET /api/channels/:id/messages
Get messages from a channel.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
- `limit` (optional): Number of messages to return (default: 50)
- `before` (optional): Get messages before this ID

**Response:**
```json
{
  "messages": [
    {
      "id": 1,
      "content": "Hello, world!",
      "username": "testuser",
      "created_at": "2025-07-28T19:00:00Z"
    }
  ]
}
```

#### POST /api/channels/:id/messages
Send a message to a channel.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request:**
```json
{
  "content": "Hello, everyone!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Message sent successfully",
  "data": {
    "id": 2,
    "channel_id": "1",
    "user_id": 3,
    "username": "testuser",
    "content": "Hello, everyone!",
    "created_at": "2025-07-28T19:00:00Z"
  }
}
```

### Settings (Admin Only)

#### GET /api/settings
Get all admin settings.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "guest_mode_enabled": "true",
    "auto_login_enabled": "true",
    "default_username": "testuser",
    "default_password": "password123!"
  }
}
```

#### POST /api/settings
Update admin settings.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request:**
```json
{
  "guest_mode_enabled": "true",
  "auto_login_enabled": "false",
  "default_username": "guest",
  "default_password": "guest123!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Settings updated successfully"
}
```

### System

#### GET /health
Health check endpoint.

**Response:**
```json
{
  "message": "Fethur Server is running",
  "status": "healthy"
}
```

#### GET /api/setup/status
Get setup status.

**Response:**
```json
{
  "success": true,
  "data": {
    "is_configured": true,
    "admin_exists": true
  }
}
```

## 🔌 WebSocket API

### Connection

Connect to WebSocket endpoint with JWT token:

```
ws://localhost:8081/ws?token=<jwt_token>
```

### Message Types

#### Text Message
```json
{
  "type": "text",
  "channel_id": 1,
  "content": "Hello, world!",
  "user_id": 3,
  "username": "testuser",
  "timestamp": "2025-07-28T19:00:00Z"
}
```

#### Join Channel
```json
{
  "type": "join",
  "channel_id": 1,
  "user_id": 3,
  "username": "testuser",
  "timestamp": "2025-07-28T19:00:00Z"
}
```

#### Leave Channel
```json
{
  "type": "leave",
  "channel_id": 1,
  "user_id": 3,
  "username": "testuser",
  "timestamp": "2025-07-28T19:00:00Z"
}
```

#### Typing Indicator
```json
{
  "type": "typing",
  "channel_id": 1,
  "user_id": 3,
  "username": "testuser",
  "timestamp": "2025-07-28T19:00:00Z"
}
```

#### Stop Typing
```json
{
  "type": "stop_typing",
  "channel_id": 1,
  "user_id": 3,
  "username": "testuser",
  "timestamp": "2025-07-28T19:00:00Z"
}
```

## 🚨 Error Responses

### Standard Error Format
```json
{
  "error": "Error message description"
}
```

### Common HTTP Status Codes

- **200** - Success
- **201** - Created
- **400** - Bad Request
- **401** - Unauthorized
- **403** - Forbidden
- **404** - Not Found
- **500** - Internal Server Error

### Error Examples

#### Authentication Error
```json
{
  "error": "Invalid username or password"
}
```

#### Permission Error
```json
{
  "error": "Guest mode is not enabled"
}
```

#### Validation Error
```json
{
  "error": "Username is required"
}
```

## 🔒 Security

### Password Requirements
- Minimum 9 characters
- Must contain at least one number
- Must contain at least one special character

### JWT Token
- 24-hour expiration
- Contains user ID, username, and role
- Required for all authenticated endpoints

### CORS
- Configured for development and production
- Supports cross-origin requests
- Secure origin validation

## 📝 Usage Examples

### JavaScript/TypeScript

```javascript
// Login
const loginResponse = await fetch('http://localhost:8081/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'testuser',
    password: 'password123!'
  })
});

const { token } = await loginResponse.json();

// Get servers
const serversResponse = await fetch('http://localhost:8081/api/servers', {
  headers: { 'Authorization': `Bearer ${token}` }
});

const { servers } = await serversResponse.json();

// Send message
const messageResponse = await fetch('http://localhost:8081/api/channels/1/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ content: 'Hello, world!' })
});
```

### cURL

```bash
# Login
curl -X POST http://localhost:8081/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "password": "password123!"}'

# Get servers (with token)
curl -H "Authorization: Bearer <token>" \
  http://localhost:8081/api/servers

# Send message
curl -X POST http://localhost:8081/api/channels/1/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"content": "Hello, world!"}'
```

## 🔧 Development

### Testing Endpoints

Use the debug page for testing:
```
http://localhost:5174/debug
```

### Health Check

Monitor server status:
```
http://localhost:8081/health
```

### WebSocket Testing

Use browser console or WebSocket testing tools:
```javascript
const ws = new WebSocket('ws://localhost:8081/ws?token=<jwt_token>');
ws.onmessage = (event) => console.log(JSON.parse(event.data));
```

---

For more information, see the [main documentation](../README.md) and [user guide](USER_GUIDE.md). 