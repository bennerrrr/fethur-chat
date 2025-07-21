# Fethur Deployment Guide

This guide covers different deployment options for Fethur, from local development to production environments.

## Quick Deploy Options

### 1. Docker Compose (Recommended for small deployments)

```bash
# Clone the repository
git clone https://github.com/bennerrrr/fethur-chat.git
cd fethur-chat

# Start with Docker Compose
make docker-run

# Check status
docker-compose ps

# View logs
docker-compose logs -f fethur-server
```

### 2. Docker (Standalone)

```bash
# Build the image
make docker-build

# Run the container
docker run -d \
  --name fethur-server \
  -p 8080:8080 \
  -v fethur_data:/app/data \
  fethur-server:latest

# Check logs
docker logs fethur-server
```

### 3. Binary Deployment

```bash
# Build binary
make build

# Run server
./server/fethur-server
```

## Production Deployment

### Environment Variables

Create a `.env` file for production:

```env
# Server Configuration
PORT=8080
GIN_MODE=release

# Database (for future PostgreSQL support)
DATABASE_URL=sqlite:///app/data/fethur.db

# Security
JWT_SECRET=your-super-secret-jwt-key-here
CORS_ORIGIN=https://yourdomain.com

# Optional: Redis for caching
REDIS_URL=redis://localhost:6379
```

### Docker Production

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  fethur-server:
    image: ghcr.io/bennerrrr/fethur-chat:latest
    ports:
      - "8080:8080"
    volumes:
      - fethur_data:/app/data
    environment:
      - PORT=8080
      - GIN_MODE=release
      - JWT_SECRET=${JWT_SECRET}
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  # Optional: Nginx reverse proxy
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - fethur-server
    restart: unless-stopped

volumes:
  fethur_data:
    driver: local
```

### Nginx Configuration

```nginx
# nginx.conf
events {
    worker_connections 1024;
}

http {
    upstream fethur_backend {
        server fethur-server:8080;
    }

    server {
        listen 80;
        server_name yourdomain.com;
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name yourdomain.com;

        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;

        location / {
            proxy_pass http://fethur_backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }
    }
}
```

## Cloud Deployment

### AWS ECS

```yaml
# task-definition.json
{
  "family": "fethur",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::123456789012:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "fethur-server",
      "image": "ghcr.io/bennerrrr/fethur-chat:latest",
      "portMappings": [
        {
          "containerPort": 8080,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "PORT",
          "value": "8080"
        },
        {
          "name": "GIN_MODE",
          "value": "release"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/fethur",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
```

### Google Cloud Run

```bash
# Deploy to Cloud Run
gcloud run deploy fethur-server \
  --image ghcr.io/bennerrrr/fethur-chat:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --max-instances 10
```

### DigitalOcean App Platform

```yaml
# .do/app.yaml
name: fethur-server
services:
  - name: fethur
    source_dir: /
    github:
      repo: bennerrrr/fethur-chat
      branch: main
    dockerfile_path: docker/Dockerfile
    http_port: 8080
    instance_count: 1
    instance_size_slug: basic-xxs
    health_check:
      http_path: /health
```

## Monitoring & Logging

### Health Checks

The server provides a health endpoint:

```bash
curl http://localhost:8080/health
```

Expected response:
```json
{
  "status": "healthy",
  "message": "Fethur Server is running"
}
```

### Logging

Fethur uses structured logging. In production, consider:

- **ELK Stack**: Elasticsearch, Logstash, Kibana
- **Fluentd**: Log aggregation
- **CloudWatch**: AWS logging
- **Stackdriver**: Google Cloud logging

### Metrics

Monitor these key metrics:

- **Response Time**: <100ms average
- **Memory Usage**: <100MB per instance
- **CPU Usage**: <10% average
- **Active Connections**: WebSocket connections
- **Error Rate**: <1% of requests

## Security Considerations

### Production Checklist

- [ ] Use HTTPS with valid SSL certificates
- [ ] Set strong JWT secrets
- [ ] Configure CORS properly
- [ ] Use non-root Docker containers
- [ ] Regular security updates
- [ ] Database backups
- [ ] Rate limiting
- [ ] Input validation

### SSL/TLS Setup

```bash
# Using Let's Encrypt with Certbot
certbot certonly --standalone -d yourdomain.com

# Copy certificates to nginx
cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ./ssl/cert.pem
cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ./ssl/key.pem
```

## Backup & Recovery

### Database Backup

```bash
# SQLite backup
sqlite3 fethur.db ".backup backup_$(date +%Y%m%d_%H%M%S).db"

# Automated backup script
#!/bin/bash
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
sqlite3 /app/data/fethur.db ".backup $BACKUP_DIR/fethur_$DATE.db"
find $BACKUP_DIR -name "fethur_*.db" -mtime +7 -delete
```

### Disaster Recovery

1. **Stop the service**
2. **Restore database from backup**
3. **Verify data integrity**
4. **Restart the service**
5. **Test functionality**

## Scaling

### Horizontal Scaling

For high-traffic deployments:

1. **Load Balancer**: Use nginx, HAProxy, or cloud load balancers
2. **Multiple Instances**: Deploy multiple Fethur instances
3. **Database**: Consider PostgreSQL for better concurrency
4. **Caching**: Add Redis for session storage
5. **CDN**: For static assets (future)

### Performance Tuning

```bash
# Increase file descriptors
ulimit -n 65536

# Optimize kernel parameters
echo 'net.core.somaxconn = 65536' >> /etc/sysctl.conf
echo 'net.ipv4.tcp_max_syn_backlog = 65536' >> /etc/sysctl.conf
sysctl -p
```

## Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   lsof -ti:8080 | xargs kill -9
   ```

2. **Database locked**
   ```bash
   # Check for other processes
   lsof fethur.db
   ```

3. **Memory issues**
   ```bash
   # Monitor memory usage
   docker stats fethur-server
   ```

4. **WebSocket connection issues**
   - Check firewall settings
   - Verify proxy configuration
   - Check CORS settings

### Debug Mode

```bash
# Run in debug mode
GIN_MODE=debug make dev

# Check logs
docker-compose logs -f fethur-server
```

## Support

For deployment issues:

- [GitHub Issues](https://github.com/bennerrrr/fethur-chat/issues)
- [GitHub Discussions](https://github.com/bennerrrr/fethur-chat/discussions)
- [Documentation](https://github.com/bennerrrr/fethur-chat/tree/main/docs) 