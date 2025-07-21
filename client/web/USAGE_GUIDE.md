# Fethur Web Client Usage Guide

This guide explains how to use the improved Fethur web client, from initial setup to deployment. The client has been transformed from a basic template into a production-ready foundation for a real-time chat application.

## Quick Start

### Prerequisites

- **Node.js** 18.0.0 or higher
- **pnpm** (recommended) or npm/yarn
- **Running Fethur backend server** (see `/server` directory)

### Installation

```bash
# Navigate to the web client directory
cd client/web

# Install dependencies
pnpm install

# Create environment file from template
cp .env.example .env

# Start development server
pnpm run dev
```

The application will be available at `http://localhost:5173`

## Project Structure

The web client follows a well-organized structure for scalability and maintainability:

```
client/web/
├── src/
│   ├── lib/                  # Shared library code
│   │   ├── api/             # API clients (HTTP & WebSocket)
│   │   ├── components/      # Reusable UI components
│   │   │   └── ui/          # Base UI components
│   │   ├── stores/          # Svelte state management
│   │   ├── types/           # TypeScript type definitions
│   │   └── utils/           # Utility functions
│   ├── routes/              # SvelteKit pages/routes
│   ├── test/                # Test configuration
│   └── app.css              # Global styles
├── static/                  # Static assets
├── tailwind.config.js       # Tailwind CSS configuration
├── vite.config.ts          # Vite build configuration
└── package.json            # Dependencies and scripts
```

## Configuration

### Environment Variables

Configure the application by editing the `.env` file:

```env
# Backend API Configuration
PUBLIC_API_URL=http://localhost:8080
PUBLIC_WS_URL=ws://localhost:8080

# Development Settings
PUBLIC_DEV_MODE=true
PUBLIC_LOG_LEVEL=debug
```

### Available Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PUBLIC_API_URL` | Backend API endpoint | `http://localhost:8080` | Yes |
| `PUBLIC_WS_URL` | WebSocket endpoint | `ws://localhost:8080` | Yes |
| `PUBLIC_DEV_MODE` | Enable development features | `true` | No |
| `PUBLIC_LOG_LEVEL` | Logging level (debug/info/warn/error) | `debug` | No |

## Development Workflow

### Available Scripts

```bash
# Development
pnpm run dev          # Start development server with hot reload
pnpm run dev --open   # Start dev server and open browser

# Building
pnpm run build        # Build for production
pnpm run preview      # Preview production build

# Code Quality
pnpm run lint         # Run ESLint
pnpm run lint:fix     # Fix ESLint issues automatically
pnpm run format       # Format code with Prettier
pnpm run check        # TypeScript and Svelte checks

# Testing
pnpm run test         # Run unit tests
pnpm run test:watch   # Run tests in watch mode
```

### Development Server

The development server includes:
- **Hot reload** for instant updates
- **TypeScript checking** in real-time
- **Error overlay** for debugging
- **Network access** (accessible from other devices)

### Code Quality Tools

The project includes comprehensive tooling for code quality:

- **ESLint**: Catches errors and enforces coding standards
- **Prettier**: Ensures consistent code formatting
- **TypeScript**: Provides type safety and better IDE support
- **Svelte Check**: Validates Svelte components

## Architecture Overview

### API Layer

The application uses a layered architecture for API communication:

#### HTTP Client (`src/lib/api/client.ts`)

```typescript
import { apiClient } from '$lib/api/client';

// Authentication
await apiClient.login({ username, password });
await apiClient.register({ username, email, password });
await apiClient.logout();

// Servers and channels
const servers = await apiClient.getServers();
const channels = await apiClient.getChannels(serverId);

// Messages
const messages = await apiClient.getMessages(channelId);
await apiClient.sendMessage(channelId, content);
```

#### WebSocket Client (`src/lib/api/websocket.ts`)

```typescript
import { wsClient } from '$lib/api/websocket';

// Connection management
await wsClient.connect(token);
wsClient.disconnect();

// Real-time messaging
wsClient.sendMessage(channelId, content);
wsClient.startTyping(channelId);
wsClient.stopTyping(channelId);

// Event handling
wsClient.on('message', (event) => {
  // Handle incoming messages
});

wsClient.on('typing', (event) => {
  // Handle typing indicators
});
```

### State Management

The application uses Svelte stores for reactive state management:

#### Authentication Store (`src/lib/stores/auth.ts`)

```typescript
import { authActions, isAuthenticated, currentUser } from '$lib/stores/auth';

// Actions
await authActions.login(username, password);
await authActions.register(username, email, password);
await authActions.logout();

// Reactive values
$: if ($isAuthenticated) {
  // User is logged in
}

$: console.log('Current user:', $currentUser);
```

#### Application Store (`src/lib/stores/app.ts`)

```typescript
import { 
  appActions, 
  chatActions, 
  currentServer, 
  currentChannel, 
  messages 
} from '$lib/stores/app';

// Server management
await appActions.loadServers();
await appActions.setCurrentServer(server);
await appActions.setCurrentChannel(channel);

// Chat functionality
await chatActions.sendMessage(channelId, content);
await chatActions.loadMessages(channelId);

// Reactive values
$: console.log('Current server:', $currentServer);
$: console.log('Messages:', $messages);
```

## Component Usage

### UI Components

The application includes reusable UI components:

#### Button Component

```svelte
<script>
  import { Button } from '$lib/components/ui';
</script>

<!-- Basic button -->
<Button on:click={handleClick}>Click me</Button>

<!-- Button variants -->
<Button variant="primary">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="danger">Danger</Button>

<!-- Button sizes -->
<Button size="sm">Small</Button>
<Button size="md">Medium</Button>
<Button size="lg">Large</Button>

<!-- Button states -->
<Button loading={isLoading}>Loading...</Button>
<Button disabled>Disabled</Button>
```

#### Input Component

```svelte
<script>
  import { Input } from '$lib/components/ui';
  
  let username = '';
  let email = '';
  let errors = {};
</script>

<!-- Basic input -->
<Input 
  bind:value={username}
  label="Username"
  placeholder="Enter your username"
  error={errors.username}
  required
/>

<!-- Email input with validation -->
<Input 
  bind:value={email}
  type="email"
  label="Email Address"
  placeholder="Enter your email"
  error={errors.email}
  autocomplete="email"
/>
```

### Creating Custom Components

Follow these patterns when creating new components:

```svelte
<!-- src/lib/components/MyComponent.svelte -->
<script lang="ts">
  import { cn } from '$lib/utils';
  import type { MyComponentProps } from '$lib/types';
  
  // Export props with types
  export let variant: 'primary' | 'secondary' = 'primary';
  export let disabled = false;
  
  // Computed classes
  $: classes = cn(
    'base-classes',
    variant === 'primary' && 'primary-classes',
    disabled && 'disabled-classes'
  );
</script>

<div class={classes} on:click on:keydown>
  <slot />
</div>
```

## Styling and Themes

### Tailwind CSS

The application uses Tailwind CSS with a custom configuration:

```typescript
// Custom color palette
const colors = {
  primary: { /* blue shades */ },
  secondary: { /* gray shades */ },
  accent: { /* green shades */ }
};

// Usage in components
<div class="bg-primary-600 text-white rounded-lg p-4">
  Primary colored card
</div>
```

### Custom CSS Classes

The application provides utility classes for common patterns:

```css
/* Button styles */
.btn-primary { /* Primary button styling */ }
.btn-secondary { /* Secondary button styling */ }

/* Chat-specific styles */
.message-bubble { /* Message bubble base */ }
.message-bubble-sent { /* Sent message styling */ }
.message-bubble-received { /* Received message styling */ }

/* Loading states */
.spinner { /* Loading spinner animation */ }
```

### Dark Mode Support

The application supports automatic dark mode:

```svelte
<!-- Automatically switches based on system preference -->
<div class="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
  Content that adapts to theme
</div>
```

## Testing

### Running Tests

```bash
# Run all tests
pnpm run test

# Run tests in watch mode
pnpm run test:watch

# Run tests with coverage
pnpm run test -- --coverage
```

### Writing Tests

Example test file structure:

```typescript
// src/lib/utils/validation.test.ts
import { describe, it, expect } from 'vitest';
import { validateEmail, validateUsername } from './validation';

describe('Validation Functions', () => {
  describe('validateEmail', () => {
    it('should validate correct email addresses', () => {
      expect(validateEmail('test@example.com')).toBe(true);
    });
    
    it('should reject invalid email addresses', () => {
      expect(validateEmail('invalid-email')).toBe(false);
    });
  });
});
```

### Component Testing

```typescript
// src/lib/components/Button.test.ts
import { render, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import Button from './Button.svelte';

describe('Button Component', () => {
  it('should render with correct text', () => {
    const { getByText } = render(Button, { 
      props: { children: 'Click me' } 
    });
    
    expect(getByText('Click me')).toBeInTheDocument();
  });
  
  it('should handle click events', async () => {
    const handleClick = vi.fn();
    const { getByRole } = render(Button, { 
      props: { onclick: handleClick } 
    });
    
    await fireEvent.click(getByRole('button'));
    expect(handleClick).toHaveBeenCalled();
  });
});
```

## Building and Deployment

### Production Build

```bash
# Build for production
pnpm run build

# Preview production build locally
pnpm run preview
```

### Deployment Options

#### 1. Static File Hosting

Deploy to any static hosting service:

```bash
# Build the application
pnpm run build

# Deploy the 'build' directory
# Examples: Vercel, Netlify, GitHub Pages, etc.
```

#### 2. Docker Deployment

```dockerfile
# Dockerfile
FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### 3. SvelteKit Adapters

Configure different deployment targets:

```typescript
// svelte.config.js
import adapter from '@sveltejs/adapter-node'; // Node.js server
// import adapter from '@sveltejs/adapter-static'; // Static files
// import adapter from '@sveltejs/adapter-vercel'; // Vercel

export default {
  kit: {
    adapter: adapter()
  }
};
```

### Environment-Specific Configuration

#### Development
```env
PUBLIC_API_URL=http://localhost:8080
PUBLIC_WS_URL=ws://localhost:8080
PUBLIC_DEV_MODE=true
PUBLIC_LOG_LEVEL=debug
```

#### Production
```env
PUBLIC_API_URL=https://your-fethur-server.com
PUBLIC_WS_URL=wss://your-fethur-server.com
PUBLIC_DEV_MODE=false
PUBLIC_LOG_LEVEL=warn
```

## Performance Optimization

### Bundle Size Optimization

The configuration includes several optimizations:

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['svelte', '@sveltejs/kit'],
          ui: ['lucide-svelte', 'clsx', 'tailwind-merge']
        }
      }
    }
  }
});
```

### Runtime Performance

Best practices for optimal performance:

1. **Lazy Loading**: Load components only when needed
2. **Debouncing**: Use utility functions for input handling
3. **Efficient Updates**: Leverage Svelte's reactivity
4. **Memory Management**: Clean up WebSocket connections

```typescript
// Example: Debounced search
import { debounce } from '$lib/utils';

const debouncedSearch = debounce((query: string) => {
  // Perform search
}, 300);
```

## Troubleshooting

### Common Issues

#### 1. Connection Problems

```typescript
// Check WebSocket connection
wsClient.on('error', (error) => {
  console.error('WebSocket error:', error);
  // Handle connection issues
});

wsClient.on('disconnected', () => {
  // Show offline indicator
  // Attempt manual reconnection
});
```

#### 2. Authentication Issues

```typescript
// Handle authentication errors
try {
  await authActions.login(username, password);
} catch (error) {
  if (error.status === 401) {
    // Invalid credentials
  } else if (error.status === 0) {
    // Network error
  }
}
```

#### 3. Build Issues

```bash
# Clear cache and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install

# Check TypeScript errors
pnpm run check

# Fix formatting issues
pnpm run format
```

### Debug Mode

Enable debug mode for detailed logging:

```env
PUBLIC_DEV_MODE=true
PUBLIC_LOG_LEVEL=debug
```

This enables:
- Detailed API request/response logging
- WebSocket message logging
- State change debugging
- Performance metrics

## Browser Support

The application supports modern browsers:

- **Chrome** 80+
- **Firefox** 76+
- **Safari** 13.1+
- **Edge** 80+

### Feature Requirements

- **WebSocket** support for real-time messaging
- **ES2022** features (async/await, modules)
- **CSS Grid & Flexbox** for layout
- **localStorage** for persistent authentication

## Security Considerations

### Client-Side Security

1. **Input Sanitization**: All user input is sanitized
2. **XSS Prevention**: Proper escaping and validation
3. **Token Storage**: Secure localStorage usage
4. **Network Security**: HTTPS enforcement in production

### Best Practices

```typescript
// Sanitize user input
import { sanitizeInput } from '$lib/utils';

const safeContent = sanitizeInput(userInput);

// Validate before sending
if (validateMessage(content)) {
  await chatActions.sendMessage(channelId, content);
}
```

## Contributing

### Development Setup

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

### Code Standards

- **TypeScript** for type safety
- **ESLint** for code quality
- **Prettier** for formatting
- **Conventional Commits** for commit messages

### Testing Requirements

- Unit tests for utilities and services
- Component tests for UI components
- Integration tests for user flows
- Minimum 80% code coverage

## Support and Resources

### Documentation

- **SvelteKit**: https://kit.svelte.dev/
- **Tailwind CSS**: https://tailwindcss.com/
- **Vite**: https://vitejs.dev/

### Getting Help

- **GitHub Issues**: Report bugs and request features
- **GitHub Discussions**: Ask questions and share ideas
- **Documentation**: Check the `/docs` directory for detailed guides

---

This guide provides everything you need to effectively use and develop with the Fethur web client. The application is designed to be developer-friendly while maintaining production-ready standards for performance, security, and user experience.