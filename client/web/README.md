# 🌐 Fethur Web Client

Modern SvelteKit-based web client for Fethur - a lightweight, self-hostable Discord alternative.

## Overview

This is the primary web interface for Fethur, built with SvelteKit and TypeScript. It provides a clean, minimal design focused on performance and usability for real-time communication.

## ⚡ Performance Goals

- **Load Time**: <2 seconds first paint
- **Bundle Size**: <500KB gzipped
- **Memory Usage**: <50MB runtime
- **Lighthouse Score**: >90 across all metrics

## 🚀 Quick Start

### Prerequisites

- Node.js 18.0.0 or higher
- pnpm (recommended) or npm
- Running Fethur backend server

### Development Setup

```bash
# Install dependencies
pnpm install

# Start development server
pnpm run dev

# Open in browser (auto-opens at http://localhost:5173)
pnpm run dev --open
```

### Environment Configuration

Create a `.env` file in this directory:

```env
# Backend Configuration
PUBLIC_API_URL=http://localhost:8080
PUBLIC_WS_URL=ws://localhost:8080

# Development Settings
PUBLIC_DEV_MODE=true
PUBLIC_LOG_LEVEL=debug
```

## 🏗️ Architecture

### Tech Stack

- **Framework**: SvelteKit with TypeScript
- **Styling**: CSS with CSS variables for theming
- **State Management**: Svelte stores
- **API Client**: Fetch API with WebSocket integration
- **Build Tool**: Vite
- **Package Manager**: pnpm

### Project Structure

```
src/
├── lib/
│   ├── components/          # Reusable UI components
│   │   ├── Chat/           # Chat-related components
│   │   ├── Auth/           # Authentication components
│   │   ├── Navigation/     # Navigation and sidebar
│   │   └── Common/         # Shared UI components
│   ├── stores/             # Svelte stores for state management
│   │   ├── auth.ts         # Authentication state
│   │   ├── websocket.ts    # WebSocket connection
│   │   ├── servers.ts      # Server management
│   │   └── messages.ts     # Message handling
│   ├── api/                # API client and utilities
│   │   ├── client.ts       # HTTP API client
│   │   ├── websocket.ts    # WebSocket client
│   │   └── types.ts        # TypeScript interfaces
│   └── utils/              # Helper functions
├── routes/                 # SvelteKit routes (pages)
│   ├── +layout.svelte      # Root layout
│   ├── +page.svelte        # Home page
│   ├── auth/               # Authentication pages
│   │   ├── login/          # Login page
│   │   └── register/       # Registration page
│   ├── servers/            # Server management
│   │   └── [id]/           # Server detail pages
│   └── channels/           # Channel interface
└── app.html                # HTML template
```

## 🎨 UI Design Principles

### Design Philosophy

1. **Minimal & Clean**: Focus on content, reduce visual noise
2. **Performance First**: Every component optimized for speed
3. **Accessibility**: WCAG 2.1 AA compliance
4. **Mobile-First**: Responsive design from the ground up
5. **Consistent**: Unified design language

### Theme System

- **CSS Variables**: Easy theme customization
- **Light/Dark Mode**: System preference detection
- **Server Themes**: Custom branding support (planned)

### Component Guidelines

- **Single Responsibility**: Each component has one clear purpose
- **Composition**: Build complex UIs from simple components
- **Props Over Slots**: Prefer explicit props for better TypeScript support
- **Reactive**: Embrace Svelte's reactivity

## 🔌 API Integration

### HTTP API

```typescript
// Authentication
POST /api/auth/register
POST /api/auth/login

// Server Management
GET  /api/servers
POST /api/servers
GET  /api/servers/:id

// Channel Management
GET  /api/servers/:id/channels
POST /api/servers/:id/channels
GET  /api/channels/:id/messages
```

### WebSocket Events

```typescript
// Message Types
type MessageType = 
  | 'text'           // Chat message
  | 'join'           // User joined channel
  | 'leave'          // User left channel
  | 'typing'         // User typing indicator
  | 'stop_typing'    // Stop typing indicator
```

### Authentication Flow

1. User logs in via `/api/auth/login`
2. JWT token stored in localStorage
3. Token included in API requests and WebSocket connection
4. Automatic token refresh on expiration

## 🧪 Development Commands

```bash
# Development
pnpm run dev                # Start dev server
pnpm run dev --open         # Start dev server and open browser

# Building
pnpm run build              # Build for production
pnpm run preview            # Preview production build

# Code Quality
pnpm run check              # TypeScript and Svelte checks
pnpm run lint               # ESLint linting
pnpm run format             # Prettier formatting

# Testing (when implemented)
pnpm run test               # Unit tests
pnpm run test:e2e           # End-to-end tests
```

## 🚢 Deployment

### Static Hosting

```bash
# Build the application
pnpm run build

# The 'build' directory contains static files
# Deploy to any static hosting service:
# - Vercel, Netlify, GitHub Pages
# - AWS S3, Google Cloud Storage
# - Traditional web servers (Nginx, Apache)
```

### Docker Deployment

```dockerfile
FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install
COPY . .
RUN pnpm run build

FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Environment Variables for Production

```env
PUBLIC_API_URL=https://your-fethur-server.com
PUBLIC_WS_URL=wss://your-fethur-server.com
PUBLIC_DEV_MODE=false
PUBLIC_LOG_LEVEL=warn
```

## 🔒 Security Considerations

- **JWT Storage**: Tokens stored in localStorage with expiration
- **XSS Protection**: Input sanitization and CSP headers
- **HTTPS Only**: All production deployments must use SSL
- **WebSocket Security**: Authenticated connections only

## 🐛 Troubleshooting

### Common Issues

1. **Cannot connect to backend**
   - Check if backend server is running on port 8080
   - Verify `PUBLIC_API_URL` and `PUBLIC_WS_URL` in `.env`
   - Check browser console for CORS errors

2. **WebSocket connection fails**
   - Ensure WebSocket URL uses correct protocol (`ws://` or `wss://`)
   - Check if firewall blocks WebSocket connections
   - Verify authentication token is valid

3. **Build failures**
   - Clear `node_modules` and reinstall: `rm -rf node_modules && pnpm install`
   - Check Node.js version: `node --version` (should be 18+)
   - Verify all environment variables are set

### Development Debug Mode

```env
PUBLIC_DEV_MODE=true
PUBLIC_LOG_LEVEL=debug
```

This enables detailed logging in browser console.

## 🤝 Contributing

1. Follow the existing code style and component patterns
2. Add TypeScript types for all new functionality
3. Test components in different screen sizes
4. Update documentation for new features

### Code Standards

- **TypeScript**: All code must be properly typed
- **ESLint**: Follow configured linting rules
- **Prettier**: Code formatting is enforced
- **Svelte**: Follow Svelte best practices

## 📈 Roadmap

### Current Features (Phase 1)
- [x] SvelteKit setup with TypeScript
- [x] Basic routing structure
- [x] Component architecture
- [x] Development environment

### Next Phase (4-6 weeks)
- [ ] Authentication UI (login/register)
- [ ] Real-time messaging interface
- [ ] Server/channel management
- [ ] WebSocket integration
- [ ] Responsive design
- [ ] Dark/light theme toggle

### Future Features
- [ ] Voice channel UI
- [ ] File upload interface
- [ ] User avatars
- [ ] Advanced moderation tools
- [ ] Plugin system interface

## 📄 License

MIT License - see the main project LICENSE file for details.

## 🆘 Support

- **Backend Issues**: See `/server/README.md`
- **General Project**: See `/docs` directory
- **Client-Specific**: Create issue with "client" label
