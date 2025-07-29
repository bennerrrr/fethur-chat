# Fethur - Modern Chat Platform

A real-time chat platform built with Go (backend) and SvelteKit (frontend), featuring modern UI/UX, comprehensive admin tools, and robust authentication.

## 🚀 Recent Updates (Latest)

### ✅ **Admin System - Complete Overhaul**
- **Fixed Admin Page**: Completely rewrote admin page to resolve all syntax errors and structural issues
- **High-Contrast UI**: Implemented pure black/white color scheme for maximum readability
- **Comprehensive Admin Dashboard**: Full user management, moderation tools, system health, metrics, and server management
- **Real-time Features**: Live user monitoring, audit logs, and system metrics

### ✅ **UI/UX Improvements**
- **Text Readability**: Fixed all text visibility issues with high-contrast color scheme
- **Modern Design System**: Implemented CSS design tokens and Inter font
- **Responsive Layout**: Improved navigation and component layouts
- **Error Handling**: Comprehensive error boundaries and user feedback

### ✅ **Authentication & Security**
- **Role-Based Access**: `user`, `admin`, `super_admin` roles with proper permissions
- **Guest Mode**: Optional guest access with admin controls
- **JWT Authentication**: Secure token-based authentication
- **Admin Middleware**: Protected admin-only routes and features

## 🎯 Features

### **Core Chat Features**
- ✅ **Real-time Messaging**: WebSocket-powered live chat
- ✅ **Server & Channel Management**: Create and manage chat servers
- ✅ **User Authentication**: Secure login/register system
- ✅ **Guest Mode**: Optional anonymous access
- ✅ **Message History**: Persistent message storage
- ✅ **Typing Indicators**: Real-time typing status

### **Admin System** 🆕
- ✅ **User Management**: Create, edit, delete, and role management
- ✅ **Moderation Tools**: Kick, ban, mute, unban, unmute users
- ✅ **System Health**: Database, WebSocket, and API status monitoring
- ✅ **Metrics Dashboard**: User activity, role distribution, online users
- ✅ **Audit Logging**: Complete action tracking for admins
- ✅ **IP Tracking**: User IP address monitoring
- ✅ **Server Management**: Create and manage chat servers
- ✅ **User Latency**: Performance monitoring per user

### **Modern UI/UX** 🆕
- ✅ **High-Contrast Theme**: Pure black/white for maximum readability
- ✅ **Inter Font**: Modern typography throughout
- ✅ **CSS Design Tokens**: Consistent spacing, colors, and shadows
- ✅ **Responsive Design**: Works on all device sizes
- ✅ **Loading States**: Smooth loading indicators
- ✅ **Error Boundaries**: Graceful error handling
- ✅ **Accessibility**: ARIA labels and keyboard navigation

### **Technical Features**
- ✅ **WebSocket Real-time**: Live message updates
- ✅ **REST API**: Comprehensive backend API
- ✅ **SQLite Database**: Lightweight, persistent storage
- ✅ **CORS Support**: Cross-origin resource sharing
- ✅ **Environment Configuration**: Flexible deployment options
- ✅ **Docker Support**: Containerized deployment

## 🛠️ Tech Stack

### **Backend (Go)**
- **Framework**: Gin Web Framework
- **Database**: SQLite3
- **Authentication**: JWT + Bcrypt
- **Real-time**: WebSocket (Gorilla)
- **CORS**: Cross-origin support

### **Frontend (SvelteKit)**
- **Framework**: SvelteKit
- **Build Tool**: Vite
- **Package Manager**: pnpm
- **Styling**: CSS with design tokens
- **Font**: Inter (Google Fonts)
- **State Management**: Svelte stores

## 🚀 Quick Start

### **Prerequisites**
- Go 1.21+
- Node.js 18+
- pnpm

### **Backend Setup**
```bash
cd server
go mod download
go run cmd/server/main.go
```
Server runs on `http://localhost:8081`

### **Frontend Setup**
```bash
cd client/web
pnpm install
pnpm dev
```
Frontend runs on `http://localhost:5173` (or next available port)

### **Database**
- SQLite database automatically created at `server/data/fethur.db`
- Default admin user: `admin` / `password123!` (super_admin role)

## 📖 Usage Guide

### **For Users**
1. **Register/Login**: Create account or use guest mode
2. **Join Servers**: Browse and join available chat servers
3. **Chat**: Send messages in real-time with typing indicators
4. **User Management**: Update profile and settings

### **For Admins**
1. **Access Admin Panel**: Navigate to `/admin` (admin/super_admin only)
2. **User Management**: Create, edit, delete users and assign roles
3. **Moderation**: Kick, ban, mute users as needed
4. **System Monitoring**: Check health, metrics, and audit logs
5. **Server Management**: Create and manage chat servers

### **Admin Features**
- **User Management**: Full CRUD operations for users
- **Role Assignment**: Assign user, admin, or super_admin roles
- **Moderation Actions**: Kick, ban (temporary/permanent), mute users
- **System Health**: Monitor database, WebSocket, and API status
- **Real-time Metrics**: User activity, online users, message counts
- **Audit Logs**: Track all admin actions with timestamps
- **IP Tracking**: Monitor user connection IPs
- **Server Management**: Create, view, and manage chat servers

## 🔧 Configuration

### **Environment Variables**
```bash
# Frontend (.env)
PUBLIC_API_URL=http://localhost:8081
PUBLIC_WS_URL=ws://localhost:8081
PUBLIC_DEV_MODE=true
PUBLIC_LOG_LEVEL=debug
```

### **Database**
- **Location**: `server/data/fethur.db`
- **Schema**: Auto-created on first run
- **Tables**: users, servers, channels, messages, user_bans, user_mutes, audit_logs

## 🏗️ Project Structure

```
Feathur/
├── server/                 # Go backend
│   ├── cmd/server/        # Main application
│   ├── internal/          # Internal packages
│   │   ├── auth/          # Authentication
│   │   ├── database/      # Database operations
│   │   ├── server/        # HTTP server
│   │   ├── websocket/     # WebSocket handling
│   │   └── voice/         # Voice features
│   └── data/              # Database files
├── client/web/            # SvelteKit frontend
│   ├── src/
│   │   ├── lib/
│   │   │   ├── api/       # API client
│   │   │   ├── components/ui/  # UI components
│   │   │   ├── stores/    # State management
│   │   │   └── types/     # TypeScript types
│   │   └── routes/        # SvelteKit routes
│   └── static/            # Static assets
└── docs/                  # Documentation
```

## 🎨 UI/UX Design System

### **Color Palette**
- **Background**: Pure black (`#000000`)
- **Surface**: Dark gray (`#111111`)
- **Text**: Pure white (`#ffffff`)
- **Accent**: Blue (`#3b82f6`)
- **Success**: Green (`#10b981`)
- **Error**: Red (`#ef4444`)
- **Warning**: Orange (`#f59e0b`)

### **Typography**
- **Font Family**: Inter (Google Fonts)
- **Font Sizes**: xs, sm, base, lg, xl, 2xl, 3xl
- **Line Heights**: tight, normal, relaxed

### **Spacing & Layout**
- **Border Radius**: sm, md, lg, xl
- **Shadows**: sm, md, lg, xl
- **Transitions**: 0.2s ease

## 🔒 Security Features

### **Authentication**
- JWT tokens with expiration
- Bcrypt password hashing
- Role-based access control
- Admin middleware protection

### **Data Protection**
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CORS configuration

## 📊 Monitoring & Analytics

### **System Health**
- Database connection status
- WebSocket connection count
- API uptime monitoring
- Error rate tracking

### **User Metrics**
- Active users (24h)
- New user registrations
- Message activity
- Role distribution
- User latency tracking

### **Audit Logging**
- Admin action tracking
- User moderation events
- System configuration changes
- Security events

## 🚀 Deployment

### **Docker**
```bash
docker-compose up -d
```

### **Manual Deployment**
1. Build backend: `go build -o fethur-server cmd/server/main.go`
2. Build frontend: `pnpm build`
3. Serve static files and run backend

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Issues**: Create GitHub issues for bugs or feature requests
- **Documentation**: Check the `/docs` folder for detailed guides
- **Admin Guide**: See `/docs/USER_GUIDE.md` for admin features

---

**Fethur** - Modern, secure, and feature-rich chat platform for communities and teams.
