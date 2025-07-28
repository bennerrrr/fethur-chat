# Feathur - Modern Chat & Voice Platform

A real-time chat and voice communication platform built with Go (backend) and SvelteKit (frontend).

## 🚀 Recent Updates (Latest)

### ✅ **Admin System Fully Implemented**
- **Comprehensive User Management** - Create, edit, delete users with role management
- **Advanced Moderation Tools** - Kick, ban, mute users with duration and reason tracking
- **System Health Monitoring** - Real-time database, WebSocket, and server status
- **Detailed Metrics Dashboard** - User activity, role distribution, and online statistics
- **Audit Logging** - Complete tracking of all admin actions for security
- **User Latency Monitoring** - Track connection quality for all online users
- **IP Address Tracking** - Monitor user connections and locations

### ✅ **Chat System Fully Functional**
- **Real-time messaging** with WebSocket support
- **Message history** loading and persistence
- **User authentication** with JWT tokens
- **Server and channel management**
- **Cross-platform compatibility** (localhost and network access)

### ✅ **Authentication System Enhanced**
- **Guest mode** with admin controls
- **Auto-login** with default credentials
- **Role-based access** (user, admin, super_admin)
- **Secure password hashing** with bcrypt
- **Token-based authentication** with JWT

### ✅ **UI/UX Improvements**
- **Modern chat interface** with enhanced components
- **Real-time typing indicators** and message reactions
- **Responsive design** for all screen sizes
- **Admin dashboard** with comprehensive management tools
- **System monitoring** with real-time health checks

### ✅ **Backend Stability**
- **CORS support** for cross-origin requests
- **WebSocket real-time communication**
- **Database persistence** with SQLite
- **Error handling** and logging
- **Health check endpoints**

## 🎯 Features

### Core Chat Features
- ✅ **Real-time messaging** with WebSocket
- ✅ **Message history** and persistence
- ✅ **User authentication** and authorization
- ✅ **Server and channel management**
- ✅ **Typing indicators**
- ✅ **Message reactions**
- ✅ **File attachments** (drag & drop)
- ✅ **Message replies**

### Authentication & Security
- ✅ **JWT token authentication**
- ✅ **Role-based access control** (user, admin, super_admin)
- ✅ **Guest mode** (admin configurable)
- ✅ **Auto-login** with default credentials
- ✅ **Secure password hashing** (bcrypt)
- ✅ **CORS support** for cross-origin requests

### Admin Features
- ✅ **Comprehensive User Management** - Create, edit, delete users with role assignment
- ✅ **Advanced Moderation Tools** - Kick, ban, mute users with duration and reason tracking
- ✅ **System Health Monitoring** - Real-time database, WebSocket, and server status
- ✅ **Detailed Metrics Dashboard** - User activity, role distribution, and online statistics
- ✅ **Audit Logging** - Complete tracking of all admin actions for security compliance
- ✅ **User Latency Monitoring** - Track connection quality and performance for all users
- ✅ **IP Address Tracking** - Monitor user connections and geographic locations
- ✅ **Guest mode toggle** and **Auto-login configuration**
- ✅ **Default credentials management**
- ✅ **Server and channel creation**

### Voice Features (Planned)
- 🔄 **WebRTC voice channels**
- 🔄 **Push-to-talk**
- 🔄 **Voice activity detection**
- 🔄 **Audio device management**

## 🛠️ Technology Stack

### Backend
- **Go** - High-performance server language
- **Gin** - Web framework
- **SQLite** - Database
- **JWT** - Authentication
- **WebSocket** - Real-time communication
- **Bcrypt** - Password hashing

### Frontend
- **SvelteKit** - Modern web framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **WebSocket** - Real-time updates
- **Vite** - Build tool

## 📦 Installation

### Prerequisites
- Go 1.21+
- Node.js 18+
- pnpm (recommended)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Feathur
   ```

2. **Start the backend**
   ```bash
   cd server
   go run cmd/server/main.go
   ```
   Backend will start on `http://localhost:8081`

3. **Start the frontend**
   ```bash
   cd client/web
   pnpm install
   pnpm dev
   ```
   Frontend will start on `http://localhost:5174`

4. **Access the application**
   - **Local**: `http://localhost:5174`
   - **Network**: `http://192.168.1.23:5174` (if configured)

## 🔧 Configuration

### Environment Variables

Create `.env` file in `client/web/`:
```bash
PUBLIC_API_URL=http://192.168.1.23:8081
PUBLIC_WS_URL=ws://192.168.1.23:8081
PUBLIC_DEV_MODE=true
PUBLIC_LOG_LEVEL=debug
```

### Default Users

The system comes with pre-configured users:
- **superadmin** / **password123!** (super_admin role)
- **testuser** / **password123!** (user role)

## 🎮 Usage

### Getting Started

1. **Login** with default credentials
2. **Create or join** a server
3. **Join channels** to start chatting
4. **Send messages** in real-time
5. **Use reactions** and replies

### Admin Features

1. **Access admin panel** at `/admin`
2. **Configure guest mode** settings
3. **Set up auto-login** credentials
4. **Manage users** and permissions

### Chat Features

- **Real-time messaging** - Messages appear instantly
- **Message history** - Load previous conversations
- **Typing indicators** - See when others are typing
- **File uploads** - Drag and drop files
- **Message reactions** - React with emojis
- **Message replies** - Reply to specific messages

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/guest` - Guest login
- `GET /api/auth/me` - Get current user

### Servers & Channels
- `GET /api/servers` - List servers
- `POST /api/servers` - Create server
- `GET /api/servers/:id/channels` - List channels
- `POST /api/servers/:id/channels` - Create channel

### Messages
- `GET /api/channels/:id/messages` - Get messages
- `POST /api/channels/:id/messages` - Send message

### WebSocket
- `GET /ws?token=<jwt>` - WebSocket connection

### Health
- `GET /health` - Health check

## 🐛 Troubleshooting

### Common Issues

1. **"Backend Server Offline"**
   - Ensure backend is running on port 8081
   - Check `.env` configuration
   - Verify network connectivity

2. **"Failed to load messages"**
   - Check authentication token
   - Verify channel exists
   - Check browser console for errors

3. **"Failed to send message"**
   - Ensure user is authenticated
   - Check channel permissions
   - Verify WebSocket connection

4. **CORS Errors**
   - Backend includes CORS middleware
   - Check frontend URL configuration
   - Verify API endpoints

### Debug Tools

- **Debug Page**: `http://192.168.1.23:5174/debug`
- **Health Check**: `http://192.168.1.23:8081/health`
- **Browser Console**: Check for JavaScript errors

## 📁 Project Structure

```
Feathur/
├── server/                 # Go backend
│   ├── cmd/server/        # Main application
│   ├── internal/          # Internal packages
│   │   ├── auth/         # Authentication
│   │   ├── database/     # Database operations
│   │   ├── server/       # HTTP server
│   │   ├── websocket/    # WebSocket handling
│   │   └── voice/        # Voice features
│   └── data/             # Database files
├── client/web/            # SvelteKit frontend
│   ├── src/
│   │   ├── lib/          # Shared libraries
│   │   │   ├── api/      # API client
│   │   │   ├── components/ # UI components
│   │   │   ├── stores/   # State management
│   │   │   └── types/    # TypeScript types
│   │   └── routes/       # Page routes
│   └── static/           # Static assets
└── docs/                 # Documentation
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Check the [documentation](docs/)
- Review [troubleshooting guide](#troubleshooting)
- Open an issue on GitHub

---

**Feathur** - Building the future of real-time communication 🚀
