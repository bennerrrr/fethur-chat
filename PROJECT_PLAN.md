# Fethur - Lightweight Discord Alternative - Project Plan

## Project Overview

A self-hostable, efficient Discord alternative called "Fethur" with voice communication and screen sharing capabilities. Built with performance and resource efficiency as primary goals.

## Core Features

### 1. Real-time Communication
- Text messaging with binary protocol
- Voice channels with WebRTC
- Video calls (optional)
- Screen sharing
- Typing indicators
- Online/offline status

### 2. Server Management
- Easy self-hosting setup
- Web-based admin panel
- User management
- Channel/server creation
- Permission system

### 3. Voice Features
- Multiple voice channels
- Push-to-talk
- Voice activity detection
- Audio quality settings
- Echo cancellation
- Background noise suppression

### 4. Screen Sharing
- Full screen capture
- Application window capture
- Browser tab sharing
- Audio sharing
- Remote control (optional)

## Technical Architecture

### Server (Self-Hostable)
- **Runtime**: Go (efficient, single binary deployment)
- **Voice/Video**: WebRTC with TURN/STUN servers
- **Real-time**: Custom WebSocket server
- **Database**: SQLite (easy deployment)
- **File Storage**: Local filesystem initially
- **Deployment**: Single binary + config file

### Client
- **Desktop**: Electron with Svelte (cross-platform)
- **Web**: Svelte/SvelteKit (browser-based)
- **Mobile**: React Native (future consideration)

## Performance Targets

- **Initial Load**: <2 seconds
- **Message Send**: <100ms
- **Memory Usage**: <50MB per user (client), <100MB (server)
- **CPU Usage**: <5% average
- **Network**: <1KB per message
- **Bundle Size**: <500KB

## Development Phases

### Phase 1: Foundation (2-3 weeks)
1. **Server Core**
   - Basic Go server with WebSocket
   - SQLite database setup
   - User authentication
   - Channel management

2. **Client Core**
   - Svelte UI framework
   - Real-time messaging
   - Basic user interface
   - Connection management

### Phase 2: Voice Features (3-4 weeks)
1. **WebRTC Integration**
   - Voice channel implementation
   - Audio capture/playback
   - Echo cancellation
   - Voice activity detection

2. **Voice UI**
   - Voice channel interface
   - Audio controls
   - User voice indicators
   - Push-to-talk

### Phase 3: Screen Sharing (2-3 weeks)
1. **Screen Capture**
   - Desktop capture API
   - Window selection
   - Browser tab sharing
   - Audio sharing

2. **Sharing UI**
   - Screen share controls
   - Viewer interface
   - Quality settings

### Phase 4: Polish & Deployment (2-3 weeks)
1. **Self-Hosting**
   - Easy setup scripts
   - Configuration management
   - Admin panel
   - Documentation

2. **Performance**
   - Memory optimization
   - Network efficiency
   - Resource monitoring

## Technical Stack

### Frontend
```
Svelte/SvelteKit
- Ultra-fast reactivity
- Small bundle size
- No virtual DOM overhead
- Built-in state management
```

### Backend
```
Go
- Memory efficient
- Fast compilation
- Excellent concurrency
- Small binary size
```

### Database
```
SQLite (development) / PostgreSQL (production)
- Efficient queries
- Proper indexing
- Minimal overhead
```

### Real-time
```
Custom WebSocket server
- Binary protocol
- Efficient message routing
- Minimal latency
```

## Self-Hosting Requirements

### Server Requirements
- **OS**: Linux, Windows, macOS
- **RAM**: 512MB minimum, 2GB recommended
- **Storage**: 1GB minimum
- **Network**: Port 80/443 for web, 3478 for TURN
- **CPU**: Single core minimum

### Deployment Options
1. **Docker**: Easy containerized deployment
2. **Binary**: Single executable file
3. **Source**: Build from source
4. **Cloud**: Future cloud hosting option

## Efficiency Optimizations

### Performance Features
- **Binary WebSocket**: Smaller payloads
- **Message Batching**: Reduce network calls
- **Efficient Audio**: Opus codec, adaptive bitrate
- **Memory Management**: Proper cleanup, pooling
- **Network**: Compression, connection pooling

### Resource Usage Targets
- **Server**: <100MB RAM, <5% CPU
- **Client**: <50MB RAM, <2% CPU
- **Network**: <1KB per message, <50KB/s voice
- **Storage**: Efficient SQLite, minimal logs

## Project Structure

```
project/
├── server/                 # Go backend
│   ├── cmd/               # Main application
│   ├── internal/          # Private application code
│   ├── pkg/               # Public libraries
│   ├── web/               # Admin panel
│   └── configs/           # Configuration files
├── client/                # Frontend applications
│   ├── desktop/           # Electron app
│   ├── web/               # Svelte web app
│   └── shared/            # Shared components
├── docs/                  # Documentation
├── scripts/               # Build and deployment scripts
└── docker/                # Docker configurations
```

## Future Enhancements

### Phase 5: Cloud Hosting
- Multi-tenant architecture
- Load balancing
- Auto-scaling
- Managed database
- CDN integration

### Phase 6: Advanced Features
- Mobile apps (React Native)
- Advanced permissions
- Bot API
- Integration APIs
- Analytics dashboard

## Development Guidelines

### Code Quality
- Comprehensive testing
- Performance benchmarks
- Memory profiling
- Network optimization
- Security best practices

### Documentation
- API documentation
- Deployment guides
- User manuals
- Developer guides
- Troubleshooting guides

## Success Metrics

### Performance
- Sub-100ms message latency
- <50MB memory usage per client
- <100MB memory usage per server
- 99.9% uptime target

### User Experience
- Intuitive interface
- Fast startup time
- Reliable voice quality
- Smooth screen sharing
- Easy self-hosting setup

### Scalability
- Support for 100+ concurrent users
- Efficient resource usage
- Easy horizontal scaling
- Cloud-ready architecture

## Change Log

### [2024-01-XX] - Initial Project Plan Creation
- **What**: Created comprehensive project plan for lightweight Discord alternative
- **Why**: Establish clear roadmap and technical direction
- **Impact**: Provides foundation for all future development decisions

### [2024-07-18] - Phase 1 Foundation Implementation
- **What**: Implemented core Go server with authentication, database, and WebSocket support
- **Why**: Establish working foundation for real-time messaging
- **Impact**: Server is now functional with user registration, login, and basic API endpoints

### [2024-07-18] - GitHub Actions CI/CD Setup
- **What**: Implemented comprehensive CI/CD pipeline with testing, linting, Docker support, and automated releases
- **Why**: Ensure code quality, automated testing, and streamlined deployment process
- **Impact**: Professional development workflow with automated quality checks and deployment capabilities

### [2025-01-27] - WebRTC Performance Research and Planning
- **What**: Comprehensive research on efficient WebRTC communication methods and created implementation guide
- **Why**: Ensure high-quality, performant real-time communication that works reliably across all network conditions
- **Impact**: Clear roadmap for implementing simulcast, adaptive bitrate, and performance monitoring systems
- **Key Decisions**:
  - Primary codec: VP9 with VP8 fallback for better compression and compatibility
  - 3-layer simulcast configuration (100/300/900 kbps) for quality adaptation
  - Opus audio codec with 6-32 kbps adaptive bitrate
  - Target metrics: <150ms RTT, <1% packet loss, <30ms jitter
- **Documentation**: Created WEBRTC_PERFORMANCE_IMPLEMENTATION_GUIDE.md and WEBRTC_QUICK_REFERENCE.md

---

*This document serves as the primary reference for development priorities, technical decisions, and project milestones. See AGENT_COLLABORATION.md for guidelines on updating this document.* 