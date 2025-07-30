# Self-Hosted CI/CD for Home Lab

This guide shows you how to set up a self-hosted CI/CD system in your home lab to avoid GitHub Actions usage limits.

## 🏠 Recommended Solutions

### **1. Drone CI (Recommended for Feathur)**
- **Pros**: Lightweight, simple, Docker-native
- **Cons**: Smaller community
- **Best for**: Small to medium projects

### **2. Jenkins**
- **Pros**: Massive ecosystem, very mature
- **Cons**: Resource heavy, complex
- **Best for**: Large projects, complex workflows

### **3. GitLab CI (Self-hosted)**
- **Pros**: Excellent integration, modern
- **Cons**: Resource intensive, full stack
- **Best for**: Teams wanting full GitLab experience

### **4. Concourse CI**
- **Pros**: Cloud-native, excellent visualization
- **Cons**: Steep learning curve
- **Best for**: Cloud-native teams

## 🚀 Drone CI Setup (Recommended)

### Step 1: Create GitHub OAuth App
1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Create new app:
   - **Application name**: Drone CI
   - **Homepage URL**: `http://your-server-ip:8080`
   - **Authorization callback URL**: `http://your-server-ip:8080/login`
3. Copy Client ID and Client Secret

### Step 2: Create Environment File
```bash
# Create .env file
cat > .env << EOF
DRONE_GITHUB_CLIENT_ID=your_github_client_id
DRONE_GITHUB_CLIENT_SECRET=your_github_client_secret
DRONE_RPC_SECRET=your_random_secret_key
DRONE_SERVER_HOST=your_server_ip:8080
DRONE_SERVER_PROTO=http
DRONE_RPC_PROTO=http
DRONE_RPC_HOST=drone-server
DRONE_RUNNER_NAME=feathur-runner
EOF
```

### Step 3: Start Drone CI
```bash
# Start Drone CI
docker-compose -f docker-compose.drone.yml up -d

# Check status
docker-compose -f docker-compose.drone.yml ps
```

### Step 4: Access Drone CI
1. Open browser to `http://your-server-ip:8080`
2. Login with GitHub
3. Activate your repository
4. Drone will automatically detect `.drone.yml`

## 🔧 Configuration Options

### **Drone CI with HTTPS**
```yaml
# Add to docker-compose.drone.yml
environment:
  - DRONE_SERVER_PROTO=https
  - DRONE_SERVER_HOST=your-domain.com
  - DRONE_SERVER_CERT=/etc/ssl/certs/drone.crt
  - DRONE_SERVER_KEY=/etc/ssl/private/drone.key
volumes:
  - ./ssl:/etc/ssl
```

### **Drone CI with Persistent Storage**
```yaml
# Add to docker-compose.drone.yml
volumes:
  - drone-data:/data
  - drone-cache:/cache
  - ./workspace:/workspace
```

### **Multiple Runners**
```yaml
# Add additional runners
drone-runner-2:
  image: drone/drone-runner-docker:1
  environment:
    - DRONE_RPC_SECRET=${DRONE_RPC_SECRET}
    - DRONE_RUNNER_NAME=runner-2
    - DRONE_RUNNER_CAPACITY=1
```

## 📊 Comparison Table

| Feature | Drone CI | Jenkins | GitLab CI | Concourse |
|---------|----------|---------|-----------|-----------|
| **Setup Time** | 5 min | 30 min | 15 min | 45 min |
| **Resource Usage** | Low | High | Medium | Medium |
| **Learning Curve** | Easy | Hard | Medium | Hard |
| **GitHub Integration** | Excellent | Good | Good | Good |
| **Docker Support** | Native | Plugin | Native | Native |
| **Community** | Small | Large | Large | Medium |
| **Cost** | Free | Free | Free | Free |

## 🎯 Drone CI Pipeline Examples

### **Basic Pipeline** (`.drone.yml`)
```yaml
kind: pipeline
type: docker
name: basic

steps:
  - name: test
    image: node:18
    commands:
      - npm install
      - npm test
```

### **Multi-Stage Pipeline**
```yaml
kind: pipeline
type: docker
name: multi-stage

steps:
  - name: build
    image: node:18
    commands:
      - npm install
      - npm run build

  - name: test
    image: node:18
    depends_on: [build]
    commands:
      - npm test

  - name: deploy
    image: alpine
    depends_on: [test]
    commands:
      - echo "Deploy to production"
```

### **Parallel Execution**
```yaml
kind: pipeline
type: docker
name: parallel

steps:
  - name: backend-tests
    image: golang:1.21
    commands:
      - go test ./...

  - name: frontend-tests
    image: node:18
    commands:
      - npm test

  - name: integration-tests
    image: node:18
    depends_on: [backend-tests, frontend-tests]
    commands:
      - npm run integration
```

## 🔄 Migration from GitHub Actions

### **GitHub Actions → Drone CI**
```yaml
# GitHub Actions
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm test

# Drone CI equivalent
kind: pipeline
type: docker
name: ci
trigger:
  event: [push, pull_request]
steps:
  - name: test
    image: node:18
    commands:
      - npm test
```

## 🛠️ Advanced Features

### **Secrets Management**
```yaml
# In Drone CI web interface, add secrets:
# DOCKER_USERNAME
# DOCKER_PASSWORD

kind: pipeline
type: docker
name: with-secrets

steps:
  - name: deploy
    image: alpine
    environment:
      DOCKER_USERNAME:
        from_secret: DOCKER_USERNAME
      DOCKER_PASSWORD:
        from_secret: DOCKER_PASSWORD
    commands:
      - echo "Using secrets"
```

### **Conditional Execution**
```yaml
kind: pipeline
type: docker
name: conditional

steps:
  - name: deploy-staging
    image: alpine
    when:
      branch: develop
    commands:
      - echo "Deploy to staging"

  - name: deploy-production
    image: alpine
    when:
      branch: main
    commands:
      - echo "Deploy to production"
```

### **Matrix Builds**
```yaml
kind: pipeline
type: docker
name: matrix

platform:
  os: linux
  arch: amd64

matrix:
  node_version:
    - 16
    - 18
    - 20

steps:
  - name: test
    image: node:${node_version}
    commands:
      - npm test
```

## 🔍 Monitoring and Logs

### **Drone CI Logs**
```bash
# View logs
docker-compose -f docker-compose.drone.yml logs drone-server
docker-compose -f docker-compose.drone.yml logs drone-runner

# Follow logs
docker-compose -f docker-compose.drone.yml logs -f drone-server
```

### **Health Checks**
```bash
# Check Drone CI health
curl http://your-server-ip:8080/healthz

# Check runner status
curl http://your-server-ip:8080/api/runners
```

## 🎉 Benefits of Self-Hosted CI/CD

1. **No Usage Limits**: Unlimited builds
2. **Cost Effective**: No per-minute charges
3. **Privacy**: Code stays on your infrastructure
4. **Customization**: Full control over environment
5. **Offline Work**: Can work without internet
6. **Learning**: Understand CI/CD internals

## 🚨 Considerations

### **Hardware Requirements**
- **Minimum**: 2GB RAM, 1 CPU core
- **Recommended**: 4GB RAM, 2 CPU cores
- **Storage**: 10GB+ for builds and cache

### **Security**
- Use HTTPS in production
- Regular security updates
- Network isolation
- Access control

### **Backup**
- Backup Drone data volume
- Backup configuration files
- Test restore procedures

## 🎯 Next Steps

1. **Choose your solution** (Drone CI recommended)
2. **Set up the infrastructure**
3. **Configure GitHub integration**
4. **Create your first pipeline**
5. **Migrate existing workflows**
6. **Monitor and optimize**

This setup will give you a powerful, self-hosted CI/CD system that can handle all your development needs without any usage limits! 