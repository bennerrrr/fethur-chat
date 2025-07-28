# Feathur User Guide

## Getting Started

### First Time Setup

When you first access Feathur, you'll be guided through a setup wizard to configure your server:

1. **Network Configuration**
   - Set your server hostname (default: localhost)
   - Choose a port (default: 8081)
   - Enable SSL if needed
   - Set external domain (optional)

2. **Authentication Mode**
   - **Open Registration**: Anyone can create an account
   - **Invite Only**: Users need an invitation code
   - **Closed**: Only admins can create accounts

3. **Admin Account**
   - Create your first admin account
   - This will be your super admin account

4. **Default User** (Optional)
   - Create a default user for guest access
   - This user will be used for auto-login

## User Authentication

### Regular Login

1. Visit the Feathur homepage
2. Enter your username and password
3. Click "Login"
4. You'll be redirected to the chat interface

### Guest Access

If guest mode is enabled by an admin:

1. Visit the Feathur homepage
2. Click "Continue as Guest"
3. You'll be automatically logged in with default credentials
4. Start chatting immediately

**Note**: Guest access uses a shared account, so messages will appear under the default username.

### Registration

If registration is open:

1. Click "Need an account? Register here" on the login page
2. Fill in your username, email, and password
3. Click "Register"
4. You'll be automatically logged in

**Password Requirements**:
- Minimum 9 characters
- Must contain at least one number
- Must contain at least one special character

## Chat Interface

### Navigation

The chat interface consists of several panels:

- **Server List**: Left sidebar showing available servers
- **Channel List**: Middle panel showing channels in the selected server
- **Chat Area**: Main area showing messages and chat input
- **User List**: Right sidebar showing online users

### Sending Messages

1. Select a channel from the channel list
2. Type your message in the input field at the bottom
3. Press Enter or click the send button
4. Your message will appear in the chat and be sent to all users in the channel

### Real-time Features

- **Live Updates**: Messages appear instantly for all users
- **Typing Indicators**: See when other users are typing
- **Online Status**: View who's currently online
- **Message History**: Scroll up to see previous messages

## Admin Features

### Accessing Admin Panel

1. Login with an admin or super admin account
2. Navigate to `/admin` in your browser
3. You'll see the admin settings panel

### Authentication Settings

#### Guest Mode
- **Enable Guest Mode**: Allows users to access chat without authentication
- **Security Note**: Use carefully in production environments

#### Auto Login
- **Enable Auto Login**: Automatically logs users in with default credentials
- **Default Username**: Username for auto-login
- **Default Password**: Password for auto-login

#### Security Considerations
- Auto-login should only be used in development or controlled environments
- Default credentials are stored in the database
- Change default credentials regularly in production

### Managing Servers

#### Creating a Server
1. Go to the chat interface
2. Click the "+" button in the server list
3. Enter server name and description
4. Click "Create Server"

#### Managing Channels
1. Select a server
2. Click the "+" button in the channel list
3. Enter channel name and type (text/voice)
4. Click "Create Channel"

#### Server Settings
- **Name**: Display name for the server
- **Description**: Server description
- **Owner**: Server owner (can manage channels and members)

### User Management

#### Viewing Users
- User list shows all users in the current server
- Online status is indicated by green dots
- User roles are displayed (user, admin, super_admin)

#### User Roles
- **User**: Can send messages and join channels
- **Admin**: Can manage channels and moderate users
- **Super Admin**: Full system access including admin panel

## Troubleshooting

### Common Issues

#### Can't Connect to Server
1. Check if the backend is running on port 8081
2. Verify the frontend is running on port 5173
3. Check browser console for error messages
4. Ensure CORS is properly configured

#### Authentication Issues
1. Verify your username and password
2. Check if your account is active
3. Try logging out and back in
4. Clear browser cache and cookies

#### Guest Mode Not Working
1. Ensure guest mode is enabled in admin settings
2. Check if auto-login is enabled
3. Verify default credentials are configured
4. Contact an admin if issues persist

#### Messages Not Sending
1. Check your internet connection
2. Verify you're in the correct channel
3. Check if the channel is active
4. Try refreshing the page

### Error Messages

#### "Backend Server Offline"
- The backend server is not running
- Start the server with `make dev`
- Check server logs for errors

#### "Guest mode is not enabled"
- Guest mode needs to be enabled by an admin
- Contact an admin to enable guest mode
- Or use regular login instead

#### "Invalid username or password"
- Double-check your credentials
- Ensure caps lock is off
- Try resetting your password

#### "Only admins can access this endpoint"
- You need admin privileges for this action
- Contact a super admin to grant permissions
- Or use a different account with admin access

## Keyboard Shortcuts

- **Enter**: Send message
- **Shift + Enter**: New line in message
- **Ctrl/Cmd + K**: Focus search
- **Escape**: Close modals or cancel actions
- **Tab**: Navigate between elements

## Best Practices

### For Users
- Use descriptive usernames
- Be respectful in chat
- Don't share sensitive information
- Report inappropriate behavior to admins

### For Admins
- Regularly review and update settings
- Monitor user activity
- Keep default credentials secure
- Backup important data regularly

### For Super Admins
- Limit admin access to trusted users
- Regularly audit user permissions
- Monitor system logs
- Keep the system updated

## Security Tips

### Password Security
- Use strong, unique passwords
- Don't reuse passwords from other services
- Enable two-factor authentication if available
- Change passwords regularly

### Account Security
- Don't share your login credentials
- Log out when using shared computers
- Be cautious of phishing attempts
- Report suspicious activity

### Guest Mode Security
- Only enable guest mode when necessary
- Use strong default credentials
- Monitor guest activity
- Disable guest mode in production if not needed

## Support

### Getting Help
- Check this user guide first
- Look for error messages in the browser console
- Contact your system administrator
- Check the project documentation

### Reporting Issues
- Provide detailed error messages
- Include steps to reproduce the issue
- Mention your browser and operating system
- Include any relevant logs

### Feature Requests
- Check if the feature already exists
- Provide clear use case descriptions
- Consider contributing to the project
- Follow the project's contribution guidelines 