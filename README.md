# Feathur - Lightweight Discord Alternative

A modern, self-hosted chat application built with Go (backend) and SvelteKit (frontend), featuring real-time messaging, voice channels, and admin-controlled authentication.

## 🚀 Features

### Core Chat Features
- **Real-time Messaging**: WebSocket-based instant messaging
- **Server & Channel Management**: Create and manage servers with multiple channels
- **User Authentication**: JWT-based authentication with role-based access
- **Voice Channels**: WebRTC-powered voice communication (coming soon)

### Authentication & Access Control
- **Guest Mode**: Allow users to access chat without registration (admin-controlled)
- **Auto-Login**: Automatic authentication with default credentials (admin-controlled)
- **Role-Based Access**: User, Admin, and Super Admin roles
- **Admin Settings Panel**: Web-based configuration interface

### Admin Features
- **Settings Management**: Configure guest mode, auto-login, and default credentials
- **User Management**: View and manage user accounts
- **Server Administration**: Create and manage servers and channels
- **Real-time Monitoring**: Monitor active users and system status

## 🛠️ Technology Stack

### Backend
- **Go** with Gin framework
- **SQLite** database
- **WebSocket** for real-time communication
- **JWT** for authentication
- **CORS** enabled for cross-origin requests

### Frontend
- **SvelteKit** with TypeScript
- **Tailwind CSS** for styling
- **Vite** for development and building
- **pnpm** for package management

## 📦 Installation

### Prerequisites
- Go 1.21+
- Node.js 18+
- pnpm (recommended) or npm

### Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Feathur
   ```

2. **Install dependencies**
   ```bash
   # Install Go dependencies
   make deps
   
   # Install frontend dependencies
   cd client && ./setup.sh install
   ```

3. **Start the application**
   ```bash
   # Start both backend and frontend
   make dev
   ```

4. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8081
   - Admin Panel: http://localhost:5173/admin

## 🔧 Configuration

### Initial Setup
On first run, the application will guide you through a setup wizard to configure:
- Network settings (hostname, port, SSL)
- Authentication mode
- Admin account creation
- Optional default user account

### Admin Settings
Access the admin panel at `/admin` to configure:

#### Authentication Settings
- **Guest Mode**: Enable/disable access without authentication
- **Auto-Login**: Enable automatic login with default credentials
- **Default Username**: Username for auto-login
- **Default Password**: Password for auto-login

#### Security Notes
- Auto-login should only be used in development or controlled environments
- Default credentials are stored in the database and can be changed via admin panel
- Guest mode bypasses authentication entirely

### Default Credentials
- **Super Admin**: `superadmin` / `superadmin123!`
- **Auto-Login User**: `testuser` / `password123!` (configurable)

## 🎯 Usage

### For Users

#### Guest Access
1. Visit the application homepage
2. Click "Continue as Guest"
3. Automatically logged in with default credentials
4. Start chatting immediately

#### Regular Login
1. Visit the application homepage
2. Enter username and password
3. Click "Login"
4. Access chat interface

### For Admins

#### Access Admin Panel
1. Login with admin or super admin credentials
2. Navigate to `/admin`
3. Configure authentication settings
4. Manage users and servers

#### Configure Guest Mode
1. Go to Admin Panel → Authentication Settings
2. Enable "Guest Mode"
3. Enable "Auto Login" (optional)
4. Set default credentials if using auto-login
5. Save settings

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/guest` - Guest login (requires guest mode enabled)
- `GET /api/auth/me` - Get current user info

### Admin Settings
- `GET /api/settings` - Get all settings (admin only)
- `POST /api/settings` - Update settings (admin only)

### Servers & Channels
- `GET /api/servers` - List servers
- `POST /api/servers` - Create server
- `GET /api/servers/:id/channels` - List channels
- `POST /api/servers/:id/channels` - Create channel

### Messaging
- `GET /api/channels/:id/messages` - Get messages
- `POST /api/channels/:id/messages` - Send message
- `GET /ws` - WebSocket connection for real-time messaging

### System
- `GET /health` - Health check
- `GET /api/setup/status` - Setup status
- `POST /api/setup/configure` - Configure system

## 🏗️ Development

### Project Structure
```
Feathur/
├── server/                 # Go backend
│   ├── cmd/server/        # Main application entry
│   ├── internal/          # Internal packages
│   │   ├── auth/         # Authentication logic
│   │   ├── database/     # Database operations
│   │   ├── server/       # HTTP server and routes
│   │   ├── websocket/    # WebSocket handling
│   │   └── voice/        # Voice channel logic
│   └── data/             # SQLite database
├── client/                # SvelteKit frontend
│   └── web/
│       ├── src/
│       │   ├── lib/      # Shared libraries
│       │   │   ├── api/  # API client
│       │   │   ├── components/ # UI components
│       │   │   └── stores/     # State management
│       │   └── routes/   # Page routes
│       └── static/       # Static assets
└── docs/                 # Documentation
```

### Development Commands
```bash
# Start development servers
make dev

# Run tests
make test

# Build for production
make build

# Clean build artifacts
make clean
```

### Environment Variables
Create a `.env` file in `client/web/`:
```env
PUBLIC_API_URL=http://localhost:8081
PUBLIC_WS_URL=ws://localhost:8081
PUBLIC_DEV_MODE=true
PUBLIC_LOG_LEVEL=debug
```

## 🔒 Security

### Authentication
- JWT tokens with 24-hour expiration
- Password requirements: minimum 9 characters, numbers, and special characters
- Role-based access control (user, admin, super_admin)
- CORS configured for development and production

### Data Protection
- Passwords hashed with bcrypt
- SQL injection protection via parameterized queries
- XSS protection through proper input validation
- CSRF protection via token validation

## 🚀 Deployment

### Docker Deployment
```bash
# Build and run with Docker Compose
docker-compose up -d
```

### Manual Deployment
1. Build the application: `make build`
2. Set environment variables
3. Run the server: `./server/fethur-server`
4. Serve the frontend from `client/web/build/`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Issues**: Report bugs and feature requests on GitHub
- **Documentation**: Check the `/docs` folder for detailed guides
- **Discussions**: Use GitHub Discussions for questions and ideas

## 🔄 Recent Updates

### v1.1.0 - Authentication & Admin Features
- ✅ Added guest mode with admin controls
- ✅ Implemented auto-login functionality
- ✅ Created admin settings panel
- ✅ Fixed CORS issues
- ✅ Added real-time messaging
- ✅ Implemented proper authentication flow
- ✅ Added role-based access control
- ✅ Created comprehensive API documentation

### v1.0.0 - Initial Release
- ✅ Basic chat functionality
- ✅ User authentication
- ✅ Server and channel management
- ✅ WebSocket real-time communication
