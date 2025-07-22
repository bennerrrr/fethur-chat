# Fethur Docker Build Guide

## Overview

This guide covers building and running Fethur using Docker, including the new UI components and layout system.

## Current Docker Setup

### Architecture
The Docker setup uses a multi-stage build process:
1. **Web Builder**: Builds the SvelteKit frontend
2. **Go Builder**: Builds the Go backend
3. **Final Stage**: Combines both with nginx for serving

### File Structure
```
docker/
├── Dockerfile          # Multi-stage build configuration
├── nginx.conf          # Nginx configuration for SPA
└── docker-compose.yml  # Development and production setup
```

## Building the Application

### Prerequisites
- Docker and Docker Compose installed
- Git repository cloned

### Quick Start
```bash
# Build and run with Docker Compose
docker-compose up --build

# Or build manually
docker build -f docker/Dockerfile -t fethur .
docker run -p 8080:8080 fethur
```

### Build Process Details

#### 1. Frontend Build (Node.js Stage)
```dockerfile
FROM node:18-alpine AS web-builder
WORKDIR /web
COPY client/web/package.json client/web/pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install
COPY client/web .
RUN pnpm build
```

**What this does**:
- Uses Node.js 18 Alpine for smaller image size
- Installs pnpm for faster package management
- Builds the SvelteKit application to `/web/build`
- Includes all new UI components (ServerList, ChannelList, etc.)

#### 2. Backend Build (Go Stage)
```dockerfile
FROM golang:1.24-alpine AS builder
RUN apk add --no-cache git gcc musl-dev sqlite-dev
WORKDIR /app
COPY server/go.mod server/go.sum ./
RUN go mod download
COPY server/ ./
RUN CGO_ENABLED=1 GOOS=linux go build -a -installsuffix cgo -ldflags="-s -w" -o fethur-server ./cmd/server
```

**What this does**:
- Uses Go 1.24 Alpine with CGO enabled for SQLite
- Builds a statically linked binary
- Includes all backend features (WebSocket, auth, etc.)

#### 3. Final Stage
```dockerfile
FROM alpine:latest
RUN apk --no-cache add ca-certificates sqlite wget nginx
RUN addgroup -g 1001 -S fethur && \
    adduser -u 1001 -S fethur -G fethur
WORKDIR /app
COPY --from=builder /app/fethur-server .
COPY --from=web-builder /web/build /app/web
RUN mkdir -p /app/data && \
    chown -R fethur:fethur /app
COPY docker/nginx.conf /etc/nginx/nginx.conf
EXPOSE 8080
```

**What this does**:
- Creates minimal Alpine Linux image
- Copies built frontend and backend
- Sets up nginx for serving the SPA
- Creates non-root user for security

## Nginx Configuration

The nginx configuration handles:
- **Static Assets**: Serves SvelteKit build files
- **API Proxy**: Routes `/api/*` to Go backend
- **WebSocket Proxy**: Routes `/ws/*` to Go backend
- **SPA Fallback**: Serves `index.html` for client-side routing

```nginx
# Serve SvelteKit static assets
location /_app/ {
    alias /app/web/_app/;
    try_files $uri $uri/ =404;
    access_log off;
    expires 1y;
    add_header Cache-Control "public, immutable";
}

# API proxy
location /api/ {
    proxy_pass http://127.0.0.1:8081;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

# SPA fallback
location / {
    try_files $uri $uri/ /index.html;
}
```

## Testing the Build

### 1. Build the Image
```bash
docker build -f docker/Dockerfile -t fethur:latest .
```

### 2. Run the Container
```bash
docker run -p 8080:8080 fethur:latest
```

### 3. Test the Application
- **Frontend**: http://localhost:8080
- **Health Check**: http://localhost:8080/health
- **API**: http://localhost:8080/api/health

### 4. Verify UI Components
Navigate to the application and verify:
- ✅ Login/registration pages load
- ✅ Configuration wizard works
- ✅ Dashboard displays correctly
- ✅ Chat interface renders (navigate to `/chat`)
- ✅ All UI components display properly

## Development vs Production

### Development
```bash
# Use docker-compose for development
docker-compose up --build

# Or run frontend separately for hot reload
cd client/web
npm run dev
```

### Production
```bash
# Build optimized production image
docker build -f docker/Dockerfile -t fethur:prod .

# Run with production settings
docker run -d -p 8080:8080 \
  -e GIN_MODE=release \
  -e PORT=8080 \
  --name fethur-prod \
  fethur:prod
```

## Troubleshooting

### Build Issues

#### Frontend Build Fails
```bash
# Check if all dependencies are installed
cd client/web
pnpm install

# Verify build works locally
pnpm build

# Check for TypeScript errors
pnpm check
```

#### Backend Build Fails
```bash
# Check Go dependencies
cd server
go mod tidy
go mod download

# Verify build works locally
go build ./cmd/server
```

### Runtime Issues

#### Frontend Not Loading
- Check nginx logs: `docker logs <container>`
- Verify build output exists: `docker exec <container> ls -la /app/web`
- Check nginx configuration: `docker exec <container> nginx -t`

#### API Not Responding
- Check if Go server is running: `docker exec <container> ps aux`
- Check Go server logs: `docker logs <container>`
- Verify port binding: `docker exec <container> netstat -tlnp`

#### WebSocket Issues
- Check WebSocket proxy configuration in nginx
- Verify WebSocket endpoint is accessible
- Check browser console for connection errors

## Performance Optimization

### Build Optimizations
- **Multi-stage builds**: Reduces final image size
- **Alpine Linux**: Minimal base image
- **Static linking**: No runtime dependencies
- **Asset compression**: Built-in nginx compression

### Runtime Optimizations
- **Asset caching**: Static assets cached for 1 year
- **Gzip compression**: Enabled for all text assets
- **Connection pooling**: nginx handles multiple connections
- **Health checks**: Automatic container monitoring

## Security Considerations

### Container Security
- **Non-root user**: Application runs as `fethur` user
- **Minimal base image**: Alpine Linux reduces attack surface
- **No unnecessary packages**: Only required dependencies
- **Read-only filesystem**: Data directory is writable

### Network Security
- **Internal communication**: Backend and nginx communicate locally
- **Port exposure**: Only port 8080 exposed
- **Proxy headers**: Proper forwarding headers set

## Monitoring and Logging

### Health Checks
```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1
```

### Logging
- **Nginx logs**: Access and error logs to stdout/stderr
- **Application logs**: Go server logs to stdout/stderr
- **Docker logs**: `docker logs <container>`

## Scaling Considerations

### Horizontal Scaling
- **Stateless design**: Multiple containers can run simultaneously
- **Database**: SQLite for single instance, PostgreSQL for multiple
- **Load balancer**: nginx can be replaced with external load balancer

### Resource Limits
```yaml
# docker-compose.yml
services:
  fethur-server:
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
        reservations:
          memory: 256M
          cpus: '0.25'
```

## Conclusion

The Docker setup is production-ready and includes:
- ✅ Multi-stage build for optimized images
- ✅ Nginx configuration for SPA serving
- ✅ Health checks and monitoring
- ✅ Security best practices
- ✅ Performance optimizations

The build process automatically includes all new UI components and the updated layout system. The application is ready for deployment in both development and production environments. 