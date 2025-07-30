# Local CI/CD Guide

This guide shows you how to run GitHub Actions-like tests locally to avoid usage limits and test your changes before pushing.

## 🚀 Quick Start

### Option 1: Quick Test (Fastest)
```bash
./scripts/quick-test.sh
```
- Runs essential backend and frontend tests
- Takes ~30 seconds
- Good for pre-commit checks

### Option 2: Full Local CI (Recommended)
```bash
./scripts/local-ci.sh
```
- Runs complete CI pipeline locally
- Includes linting, type checking, build, and tests
- Takes ~2-3 minutes
- Mimics GitHub Actions exactly

### Option 3: Makefile Commands
```bash
# Full CI pipeline
make ci

# Just backend tests
make ci-backend

# Just frontend tests
make ci-frontend

# Quick local tests
make test-local
```

## 🐳 GitHub Actions Local (Act)

### Install Act
```bash
brew install act
```

### Run All GitHub Actions Locally
```bash
# List available jobs
act --list

# Run all jobs
act --container-architecture linux/amd64

# Run specific job
act -j frontend-test --container-architecture linux/amd64
```

### Using Makefile with Act
```bash
# Run all GitHub Actions
make ci-act

# Run specific job
make ci-act-job job=frontend-test
```

## 🐳 Docker-Based CI

### Run with Docker Compose
```bash
docker-compose -f docker-compose.ci.yml --profile ci up --build --abort-on-container-exit
```

### Using Makefile
```bash
make ci-docker
```

## 📊 What Each Option Tests

### Quick Test (`./scripts/quick-test.sh`)
- ✅ Backend: Auth and database tests
- ✅ Frontend: Build verification
- ⏱️ Time: ~30 seconds

### Full Local CI (`./scripts/local-ci.sh`)
- ✅ Backend: All Go tests
- ✅ Frontend: Lint, type check, build, tests
- ✅ Integration: If available
- ⏱️ Time: ~2-3 minutes

### GitHub Actions Local (Act)
- ✅ Exact same environment as GitHub
- ✅ All jobs from `.github/workflows/`
- ✅ Container isolation
- ⏱️ Time: ~5-10 minutes

### Docker-Based CI
- ✅ Isolated environment
- ✅ Consistent across machines
- ✅ Full pipeline in containers
- ⏱️ Time: ~3-5 minutes

## 🔧 Troubleshooting

### Act Issues
```bash
# If you get Docker connection errors
docker --version
docker ps

# If you get architecture issues on M1/M2 Mac
act --container-architecture linux/amd64

# If you need to use a specific image
act --container-architecture linux/amd64 --image ubuntu:20.04
```

### Local Script Issues
```bash
# Make scripts executable
chmod +x scripts/*.sh

# Check if you're in the right directory
ls -la server/go.mod client/web/package.json

# Clean up if needed
make ci-clean
```

### Performance Tips
```bash
# Use quick test for frequent checks
./scripts/quick-test.sh

# Use full CI before pushing
./scripts/local-ci.sh

# Use Act for final verification
act -j frontend-test --container-architecture linux/amd64
```

## 🎯 When to Use Each Option

| Scenario | Recommended Tool | Why |
|----------|------------------|-----|
| Pre-commit | `./scripts/quick-test.sh` | Fast feedback |
| Before push | `./scripts/local-ci.sh` | Comprehensive check |
| Debug CI issues | `act -j <job-name>` | Exact GitHub environment |
| Team consistency | `make ci-docker` | Isolated environment |
| Final verification | `act --container-architecture linux/amd64` | GitHub-like environment |

## 📈 Benefits of Local CI

1. **Avoid Usage Limits**: No GitHub Actions minutes consumed
2. **Faster Feedback**: No waiting for GitHub runners
3. **Offline Work**: Test without internet connection
4. **Debug Easier**: Direct access to logs and environment
5. **Cost Effective**: No GitHub Actions costs
6. **Iterate Faster**: Quick feedback loop

## 🔄 Integration with Your Workflow

### Pre-commit Hook (Optional)
Add to `.git/hooks/pre-commit`:
```bash
#!/bin/bash
./scripts/quick-test.sh
```

### VS Code Tasks
Add to `.vscode/tasks.json`:
```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Quick Test",
      "type": "shell",
      "command": "./scripts/quick-test.sh",
      "group": "test"
    },
    {
      "label": "Full CI",
      "type": "shell", 
      "command": "./scripts/local-ci.sh",
      "group": "test"
    }
  ]
}
```

## 🎉 Success!

You now have multiple options for running CI tests locally. This will help you:
- Avoid GitHub Actions usage limits
- Get faster feedback on your changes
- Debug issues more easily
- Work offline when needed

Choose the tool that best fits your current needs! 