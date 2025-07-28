# Changelog

All notable changes to Feathur will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-07-28

### Added
- **Guest Mode**: Allow users to access chat without authentication (admin-controlled)
- **Auto-Login**: Automatic authentication with default credentials (admin-controlled)
- **Admin Settings Panel**: Web-based configuration interface at `/admin`
- **Role-Based Access Control**: User, Admin, and Super Admin roles
- **Real-time Messaging**: Complete message sending and receiving functionality
- **WebSocket Integration**: Real-time message broadcasting to all connected clients
- **CORS Support**: Proper cross-origin request handling
- **API Documentation**: Comprehensive API documentation with examples
- **User Guide**: Complete user guide with troubleshooting and best practices

### Changed
- **Authentication Flow**: Improved authentication with proper token management
- **Frontend Architecture**: Updated to use proper API client with authentication
- **Backend API**: Enhanced with new endpoints for admin settings and guest access
- **Database Schema**: Added settings table for admin configuration
- **Error Handling**: Improved error messages and handling throughout the application

### Fixed
- **CORS Issues**: Fixed cross-origin request blocking between frontend and backend
- **Authentication Endpoints**: Fixed missing `/api/auth/me` endpoint
- **Port Configuration**: Updated default backend port from 8080 to 8081
- **Frontend-Backend Communication**: Fixed API client configuration and token handling
- **Message Sending**: Implemented proper message storage and retrieval
- **WebSocket Connection**: Fixed WebSocket authentication and message broadcasting

### Security
- **JWT Token Management**: Proper token validation and expiration handling
- **Password Requirements**: Enforced strong password requirements (9+ chars, numbers, special chars)
- **Admin Access Control**: Role-based access to admin features
- **Guest Mode Security**: Admin-controlled guest access with security warnings
- **CORS Configuration**: Secure cross-origin request handling

### Technical Details

#### New API Endpoints
- `POST /api/auth/guest` - Guest login (requires guest mode enabled)
- `GET /api/auth/me` - Get current user information
- `GET /api/settings` - Get admin settings (admin only)
- `POST /api/settings` - Update admin settings (admin only)
- `POST /api/channels/:id/messages` - Send message to channel

#### Database Changes
- Added `settings` table for storing admin configuration
- Enhanced user roles with `super_admin` support
- Improved message storage with proper indexing

#### Frontend Enhancements
- Added admin settings panel with beautiful UI
- Implemented guest login button on homepage
- Enhanced chat interface with real-time messaging
- Added proper error handling and user feedback
- Improved authentication flow with token management

#### Backend Improvements
- Added CORS middleware for cross-origin requests
- Implemented proper JWT token validation
- Enhanced WebSocket message broadcasting
- Added comprehensive error handling
- Improved database operations with proper transactions

### Breaking Changes
- **Port Change**: Backend now runs on port 8081 instead of 8080
- **API Response Format**: Some endpoints now return standardized response format with `success` and `data` fields
- **Authentication**: All authenticated endpoints now require proper JWT tokens

### Migration Guide
1. **Update Frontend Configuration**: Change backend URL from port 8080 to 8081
2. **Database Migration**: New settings table will be created automatically
3. **Admin Setup**: Create super admin account and configure guest mode settings
4. **API Updates**: Update any external API clients to use new response formats

## [1.0.0] - 2025-07-27

### Added
- **Basic Chat Functionality**: Real-time messaging with WebSocket support
- **User Authentication**: JWT-based user registration and login
- **Server Management**: Create and manage chat servers
- **Channel Management**: Create text and voice channels within servers
- **SQLite Database**: Local data storage with proper schema
- **RESTful API**: Complete API for all chat operations
- **SvelteKit Frontend**: Modern web interface with TypeScript
- **Docker Support**: Containerized deployment with Docker Compose
- **Development Tools**: Makefile with common development commands

### Technical Features
- **WebSocket Communication**: Real-time message delivery
- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt password security
- **CORS Support**: Cross-origin request handling
- **Error Handling**: Comprehensive error management
- **Logging**: Structured logging throughout the application

### Project Structure
- **Go Backend**: Clean architecture with internal packages
- **SvelteKit Frontend**: Modern reactive web interface
- **Documentation**: Comprehensive project documentation
- **CI/CD**: GitHub Actions for automated testing and deployment

---

## Version History

### Version Numbering
- **Major Version**: Breaking changes or major feature additions
- **Minor Version**: New features or significant improvements
- **Patch Version**: Bug fixes and minor improvements

### Release Schedule
- **Development**: Continuous development with regular commits
- **Beta Releases**: Feature-complete releases for testing
- **Stable Releases**: Production-ready releases with full documentation

### Support Policy
- **Current Version**: Full support and bug fixes
- **Previous Version**: Security updates only
- **Older Versions**: No official support

---

## Contributing

When contributing to this project, please update the changelog to reflect your changes. Follow the existing format and include:

1. **Type of Change**: Added, Changed, Deprecated, Removed, Fixed, Security
2. **Description**: Clear description of what was changed
3. **Technical Details**: Any important technical information
4. **Breaking Changes**: Any changes that require user action
5. **Migration Guide**: Steps to upgrade from previous version

### Changelog Format
```markdown
## [Version] - YYYY-MM-DD

### Added
- New features

### Changed
- Changes to existing functionality

### Deprecated
- Soon-to-be removed features

### Removed
- Removed features

### Fixed
- Bug fixes

### Security
- Security improvements
``` 