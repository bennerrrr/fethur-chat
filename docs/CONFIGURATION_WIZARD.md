# Feathur Configuration Wizard Documentation

## Overview

The Feathur Configuration Wizard is a first-time setup interface that guides administrators through the initial configuration of their self-hosted chat server. It appears automatically when the application detects no existing users in the database.

## First-Time Detection

The wizard is triggered when the application detects an empty database (no users exist). This is determined by:

```go
func (db *Database) IsFirstTime() (bool, error) {
    var count int
    err := db.QueryRow("SELECT COUNT(*) FROM users").Scan(&count)
    if err != nil {
        return false, err
    }
    return count == 0, nil
}
```

**Best Practice**: This method checks for existing users as the primary indicator. Alternative detection methods could include:
- Checking for a `setup_complete` flag in settings
- Verifying if the database file is newly created
- Looking for default configuration files

## Multi-Step Configuration Process

### Step 1: Network Settings

#### Hostname
- **Purpose**: The domain name or IP address where your server will be accessible
- **Default**: `localhost`
- **Usage**: Used for generating invitation links and WebRTC connections
- **Example**: `chat.mydomain.com` or `192.168.1.100`

#### Port
- **Purpose**: The port number on which the server will listen
- **Default**: `8080`
- **Range**: 1-65535 (avoid ports 80, 443 if using reverse proxy)
- **Note**: Must be available and not blocked by firewall

#### SSL/HTTPS Toggle
- **Purpose**: Enables secure HTTPS connections
- **How it works**: 
  - When enabled, the server will attempt to use SSL certificates
  - Requires valid SSL certificates (Let's Encrypt, self-signed, or commercial)
  - Automatically redirects HTTP to HTTPS
  - Essential for WebRTC connections in production
- **Security Impact**: Encrypts all data in transit
- **Performance**: Minimal overhead with modern hardware

#### External Domain
- **Purpose**: The public domain name for external access
- **Optional**: Can be left empty for local-only deployments
- **Usage**: 
  - Used for WebRTC signaling server configuration
  - Generates proper invitation links
  - Required for mobile app connectivity
- **Example**: `feathur.mydomain.com`

#### mDNS (feathur.local)
- **Purpose**: Enables local network discovery via mDNS
- **How it works**:
  - Broadcasts the server as `feathur.local` on the local network
  - Allows clients to discover the server without knowing the IP address
  - Works automatically on most modern operating systems
  - Requires no additional configuration
- **Benefits**:
  - Easy local network discovery
  - No need to remember IP addresses
  - Works with mobile devices on same network
- **Limitations**: Only works on local network, not over internet

### Step 2: Authentication Mode

#### Public Mode
- **Description**: Anyone can register without any password
- **Use Case**: Open communities, public servers
- **Security Level**: Low (no registration control)
- **Best For**: Public communities, testing environments

#### Open Registration
- **Description**: Anyone with the registration password can create accounts
- **Use Case**: Semi-private communities, organizations
- **Security Level**: Medium (password-protected registration)
- **Configuration**: Requires setting a registration password
- **Best For**: Work teams, private communities

#### Admin Only
- **Description**: Only pre-created accounts by administrators can join
- **Use Case**: Highly secure environments, enterprise deployments
- **Security Level**: High (full control over user creation)
- **User Management**: Admins must create all user accounts manually
- **Best For**: Corporate environments, high-security requirements

### Step 3: Super Admin Account

#### Username
- **Requirements**: Must be unique, alphanumeric characters recommended
- **Purpose**: Primary administrator account with full system access
- **Security**: This account has complete control over the system

#### Password Requirements
- **Minimum Length**: 9 characters
- **Required Elements**:
  - At least one number (0-9)
  - At least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)
- **Security Rationale**: Prevents common password attacks
- **Storage**: Passwords are hashed using bcrypt with cost factor 12

#### Role System
- **Super Admin**: Complete system control, can manage all settings and users
- **Admin**: Can manage users and servers, limited system settings access
- **User**: Standard user with basic permissions

### Step 4: Normal User (Optional)

#### Purpose
- Create an additional user account during setup
- Useful for testing or creating a secondary admin account
- Can be skipped and users created later through admin interface

#### Same Requirements
- Username must be unique
- Password must meet same security requirements
- Role defaults to "user" (can be promoted to admin later)

### Step 5: Configuration Summary

#### Review Process
- Displays all configured settings for final review
- Allows administrator to verify configuration before applying
- Shows network settings, authentication mode, and user accounts

#### Completion
- Saves all settings to database
- Creates user accounts with proper role assignments
- Initializes the system for normal operation
- Redirects to login page after successful configuration

## Technical Implementation

### Database Schema

#### Settings Table
```sql
CREATE TABLE settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL,
    description TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### Users Table
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT, -- Optional field
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'user' CHECK (role IN ('super_admin', 'admin', 'user')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### API Endpoints

#### Setup Status
- **Endpoint**: `GET /api/setup/status`
- **Response**: `{"isFirstTime": true/false}`
- **Purpose**: Determines if wizard should be shown

#### Configuration
- **Endpoint**: `POST /api/setup/configure`
- **Purpose**: Saves all configuration settings
- **Security**: No authentication required (first-time setup only)

### Security Features

#### Password Validation
```go
func (s *Service) ValidatePassword(password string) error {
    if len(password) < 9 {
        return fmt.Errorf("password must be at least 9 characters long")
    }
    
    hasNumber := false
    hasSpecial := false
    
    for _, char := range password {
        if char >= '0' && char <= '9' {
            hasNumber = true
        }
        if (char >= '!' && char <= '/') || (char >= ':' && char <= '@') || 
           (char >= '[' && char <= '`') || (char >= '{' && char <= '~') {
            hasSpecial = true
        }
    }
    
    if !hasNumber {
        return fmt.Errorf("password must contain at least one number")
    }
    if !hasSpecial {
        return fmt.Errorf("password must contain at least one special character")
    }
    
    return nil
}
```

#### JWT Token Management
- Tokens include user role information
- 24-hour expiration by default
- Secure random secret generation
- Role-based access control

## UI/UX Design

### Visual Theme
- **Background**: Animated gradient blobs with subtle movement
- **Design**: Glassmorphism with backdrop blur effects
- **Colors**: Dark theme with blue accent colors
- **Border Radius**: Consistent 12px/16px/20px system
- **Typography**: Inter font family for modern readability

### Animation System
- **Blob Animation**: 25-second cycles with rotation and scaling
- **Progress Bar**: Smooth transitions between steps
- **Loading States**: Spinning indicators for async operations
- **Transitions**: Smooth hover and focus effects

### Responsive Design
- **Mobile**: Optimized for touch interfaces
- **Desktop**: Full-featured interface with hover states
- **Tablet**: Adaptive layout for medium screens

## Troubleshooting

### Common Issues

#### "This account is not available"
- **Cause**: Permission issues with the fethur user in Docker
- **Solution**: Run the backend server as root in Docker container

#### Database Connection Errors
- **Cause**: SQLite file permissions or corruption
- **Solution**: Check file permissions and database integrity

#### Network Configuration Issues
- **Cause**: Port conflicts or firewall blocking
- **Solution**: Verify port availability and firewall settings

#### SSL Certificate Problems
- **Cause**: Invalid or expired certificates
- **Solution**: Update certificates or use HTTP for testing

### Debug Mode
- Enable verbose logging in server configuration
- Check Docker container logs: `docker logs fethur-server`
- Monitor network connectivity and port availability

## Future Enhancements

### Planned Features
- **Import/Export Configuration**: Backup and restore settings
- **Advanced SSL Configuration**: Custom certificate management
- **LDAP Integration**: Enterprise directory service support
- **OAuth Providers**: Google, GitHub, Microsoft authentication
- **Multi-Language Support**: Internationalization for global use

### Performance Optimizations
- **Database Indexing**: Optimize query performance
- **Caching Layer**: Redis integration for session management
- **CDN Integration**: Static asset delivery optimization
- **Load Balancing**: Multiple server instance support

## Support and Maintenance

### Configuration Backup
- Database file: `/app/data/fethur.db`
- Settings table contains all configuration
- Regular backups recommended

### Updates and Migration
- Database schema migrations handled automatically
- Settings preserved during updates
- User accounts and data maintained

### Monitoring
- Health check endpoint: `GET /health`
- Log monitoring for error detection
- Performance metrics collection

---

*This documentation serves as the foundation for the Feathur wiki and support system. Regular updates will be made as new features are added and existing functionality is enhanced.* 