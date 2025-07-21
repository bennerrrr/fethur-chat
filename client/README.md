# 🌐 Fethur Client

Modern, lightweight web client for Fethur - a self-hostable Discord alternative built for performance and efficiency.

## Overview

The Fethur client is a minimal, intuitive web application that provides a clean interface for real-time communication. Built with modern web technologies, it emphasizes performance, usability, and resource efficiency.

### Key Features

- **🚀 Lightning Fast**: <2 second load time, <500KB bundle size
- **💬 Real-time Messaging**: WebSocket-powered instant messaging
- **🏠 Server Management**: Create and manage your own communication servers
- **📺 Channel Organization**: Text channels with voice support (coming soon)
- **🔐 Secure Authentication**: JWT-based authentication with local account support
- **📱 Responsive Design**: Works seamlessly on desktop, tablet, and mobile
- **🎨 Clean Interface**: Minimal design that's intuitive to use
- **⚡ Resource Efficient**: Optimized for low memory and CPU usage

## 📋 Requirements

### Client Requirements
- **Node.js**: 18.0.0 or higher
- **Package Manager**: npm, pnpm, or yarn
- **Browser Support**: Modern browsers with WebSocket support
  - Chrome 80+
  - Firefox 76+
  - Safari 13.1+
  - Edge 80+

### Server Requirements
- Running Fethur backend server (see `/server` directory)
- Network access to the backend API
- WebSocket connection capability

## 🚀 Quick Start

### Development Mode

```bash
# Navigate to web client directory
cd client/web

# Install dependencies
pnpm install

# Start development server
pnpm run dev

# Open in browser
# The client will be available at http://localhost:5173
```

### Production Build

```bash
# Build for production
pnpm run build

# Preview production build
pnpm run preview

# Or serve the build directory with any static file server
```

## 🏗️ Project Structure

```
client/
├── web/                    # SvelteKit web application
│   ├── src/
│   │   ├── lib/           # Shared utilities and components
│   │   │   ├── components/# Reusable UI components
│   │   │   ├── stores/    # Svelte stores for state management
│   │   │   ├── api/       # API client and utilities
│   │   │   └── utils/     # Helper functions
│   │   ├── routes/        # SvelteKit routes (pages)
│   │   │   ├── auth/      # Authentication pages
│   │   │   ├── servers/   # Server management
│   │   │   └── channels/  # Channel interface
│   │   └── app.html       # HTML template
│   ├── static/            # Static assets
│   ├── package.json       # Dependencies and scripts
│   └── README.md          # Web client specific docs
└── README.md              # This file
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the `client/web` directory:

```env
# Backend API Configuration
PUBLIC_API_URL=http://localhost:8080
PUBLIC_WS_URL=ws://localhost:8080

# Optional: Development settings
PUBLIC_DEV_MODE=true
PUBLIC_LOG_LEVEL=debug
```

### Production Configuration

For production deployment, update the environment variables:

```env
# Production API endpoints
PUBLIC_API_URL=https://your-fethur-server.com
PUBLIC_WS_URL=wss://your-fethur-server.com

# Production settings
PUBLIC_DEV_MODE=false
PUBLIC_LOG_LEVEL=warn
```

## 🚢 Deployment Options

### Option 1: Static File Hosting

Build and deploy as static files to any web server:

```bash
# Build the application
pnpm run build

# Deploy the 'build' directory to your web server
# Examples: Nginx, Apache, Caddy, etc.
```

### Option 2: Docker Deployment

```dockerfile
# Dockerfile for client
FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Option 3: Vercel/Netlify

Deploy directly to modern hosting platforms:

```bash
# For Vercel
npx vercel

# For Netlify
npm install -g netlify-cli
netlify deploy
```

### Option 4: Node.js Server

Use the SvelteKit Node adapter for server-side rendering:

```bash
# Install Node adapter
pnpm add -D @sveltejs/adapter-node

# Build and run
pnpm run build
node build
```

## 🔌 API Integration

The client connects to the Fethur backend server through:

- **REST API**: HTTP requests for authentication, server/channel management
- **WebSocket**: Real-time messaging and live updates
- **Authentication**: JWT tokens stored securely in localStorage

### API Endpoints Used

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth/register` | POST | User registration |
| `/api/auth/login` | POST | User login |
| `/api/servers` | GET/POST | Server management |
| `/api/servers/:id/channels` | GET/POST | Channel management |
| `/api/channels/:id/messages` | GET | Message history |
| `/ws` | WebSocket | Real-time messaging |

## 🎨 UI/UX Guidelines

### Design Principles

1. **Minimal & Clean**: No unnecessary visual clutter
2. **Performance First**: Every interaction should feel instant
3. **Accessibility**: WCAG 2.1 AA compliance
4. **Mobile Friendly**: Touch-first design approach
5. **Consistent**: Unified design language throughout

### Theme Support

- **Light Mode**: Default clean interface
- **Dark Mode**: Easy on the eyes for long sessions
- **Custom Themes**: Support for server-specific branding (Pro feature)

## 🔧 Development Commands

```bash
# Development
pnpm run dev          # Start dev server with hot reload
pnpm run dev --open   # Start dev server and open browser

# Building
pnpm run build        # Build for production
pnpm run preview      # Preview production build

# Code Quality
pnpm run lint         # Run ESLint
pnpm run format       # Format code with Prettier
pnpm run check        # TypeScript and Svelte checks

# Testing
pnpm run test         # Run unit tests
pnpm run test:watch   # Run tests in watch mode
pnpm run test:e2e     # Run end-to-end tests
```

## 📊 Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| First Paint | <1s | TBD |
| Time to Interactive | <2s | TBD |
| Bundle Size | <500KB | TBD |
| Memory Usage | <50MB | TBD |
| Lighthouse Score | >90 | TBD |

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **HTTPS Only**: Production deployments require SSL
- **CSP Headers**: Content Security Policy protection
- **XSS Protection**: Input sanitization and validation
- **Local Storage**: Secure token storage with expiration

## 🐛 Troubleshooting

### Common Issues

1. **Connection Failed**
   - Check if the backend server is running
   - Verify API_URL and WS_URL in environment config
   - Check browser console for network errors

2. **Authentication Errors**
   - Clear browser localStorage and try again
   - Verify backend JWT secret configuration
   - Check if user exists in backend database

3. **Build Failures**
   - Clear node_modules and reinstall dependencies
   - Check Node.js version compatibility
   - Verify all environment variables are set

### Debug Mode

Enable debug logging:

```env
PUBLIC_DEV_MODE=true
PUBLIC_LOG_LEVEL=debug
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Make your changes in the `client/web` directory
4. Test your changes: `pnpm run test`
5. Submit a pull request

### Code Standards

- **TypeScript**: Strongly typed code
- **ESLint**: Follow configured linting rules
- **Prettier**: Consistent code formatting
- **Testing**: Unit tests for components and utilities

## 📈 Roadmap

### Phase 1: Core Features (Current)
- [x] Basic SvelteKit setup
- [x] Authentication UI
- [x] Real-time messaging
- [x] Server/channel management
- [x] Responsive design

### Phase 2: Enhanced Features (Next 4-6 weeks)
- [ ] Voice channel interface
- [ ] WebRTC integration
- [ ] File upload support
- [ ] User avatars
- [ ] Typing indicators

### Phase 3: Advanced Features (Future)
- [ ] Screen sharing UI
- [ ] Plugin system interface
- [ ] Advanced moderation tools
- [ ] Mobile app (PWA)
- [ ] Desktop app (Electron)

## 📄 License

MIT License - see the main project LICENSE file for details.

## 🆘 Support

- **Documentation**: Check `/docs` directory for detailed guides
- **Issues**: Report bugs on GitHub Issues
- **Community**: Join discussions on GitHub Discussions
- **Technical Support**: See server README for backend issues

---

**Built with ❤️ using modern web technologies for the open source community**