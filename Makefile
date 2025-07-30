# Fethur Project Makefile
.PHONY: help build test clean lint format install dev setup docker-build docker-run docker-stop

# Default target
.DEFAULT_GOAL := help

# Colors for output
RED := \033[0;31m
GREEN := \033[0;32m
YELLOW := \033[0;33m
BLUE := \033[0;34m
MAGENTA := \033[0;35m
CYAN := \033[0;36m
WHITE := \033[0;37m
RESET := \033[0m

# Project configuration
GO_VERSION := 1.24
NODE_VERSION := 20
PROJECT_NAME := fethur
BINARY_NAME := fethur-server

# Directories
SERVER_DIR := server
CLIENT_DIR := client/web
DOCKER_DIR := docker

## help: Show this help message
help:
	@echo "$(CYAN)$(PROJECT_NAME) - Development Commands$(RESET)"
	@echo ""
	@echo "$(GREEN)Available commands:$(RESET)"
	@sed -n 's/^##//p' $(MAKEFILE_LIST) | column -t -s ':' | sed -e 's/^/ /'

## setup: Install all dependencies and tools
setup: setup-go setup-frontend
	@echo "$(GREEN)✅ Setup complete!$(RESET)"

## setup-go: Install Go dependencies and tools
setup-go:
	@echo "$(BLUE)📦 Installing Go dependencies...$(RESET)"
	cd $(SERVER_DIR) && go mod download
	cd $(SERVER_DIR) && go mod verify
	@echo "$(BLUE)🔧 Installing Go tools...$(RESET)"
	go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest
	go install mvdan.cc/gofumpt@latest
	go install golang.org/x/tools/cmd/goimports@latest
	go install github.com/fzipp/gocyclo/cmd/gocyclo@latest
	go install github.com/client9/misspell/cmd/misspell@latest

## setup-frontend: Install frontend dependencies
setup-frontend:
	@echo "$(BLUE)📦 Installing frontend dependencies...$(RESET)"
	cd $(CLIENT_DIR) && pnpm install --frozen-lockfile

## build: Build all components
build: build-server build-frontend
	@echo "$(GREEN)✅ Build complete!$(RESET)"

## build-server: Build Go server
build-server:
	@echo "$(BLUE)🔨 Building Go server...$(RESET)"
	cd $(SERVER_DIR) && go build -ldflags="-s -w" -o $(BINARY_NAME) ./cmd/server

## build-frontend: Build frontend application
build-frontend:
	@echo "$(BLUE)🔨 Building frontend...$(RESET)"
	cd $(CLIENT_DIR) && pnpm build

## test: Run all tests
test: test-server test-frontend
	@echo "$(GREEN)✅ All tests passed!$(RESET)"

## test-server: Run Go tests
test-server:
	@echo "$(BLUE)🧪 Running Go tests...$(RESET)"
	cd $(SERVER_DIR) && go test -v ./...
	cd $(SERVER_DIR) && go test -race -v ./...

## test-frontend: Run frontend tests
test-frontend:
	@echo "$(BLUE)🧪 Running frontend tests...$(RESET)"
	cd $(CLIENT_DIR) && pnpm test --run

## test-coverage: Run tests with coverage
test-coverage:
	@echo "$(BLUE)📊 Running tests with coverage...$(RESET)"
	cd $(SERVER_DIR) && go test -coverprofile=coverage.out -covermode=atomic ./...
	cd $(SERVER_DIR) && go tool cover -html=coverage.out -o coverage.html
	cd $(CLIENT_DIR) && pnpm test --run --coverage

## lint: Run all linting
lint: lint-server lint-frontend
	@echo "$(GREEN)✅ Linting complete!$(RESET)"

## lint-server: Run Go linting
lint-server:
	@echo "$(BLUE)🔍 Linting Go code...$(RESET)"
	cd $(SERVER_DIR) && golangci-lint run --timeout=10m
	@echo "$(BLUE)📊 Checking code complexity...$(RESET)"
	cd $(SERVER_DIR) && gocyclo -over 15 . || echo "$(YELLOW)⚠️  High complexity functions found$(RESET)"
	@echo "$(BLUE)📝 Checking spelling...$(RESET)"
	cd $(SERVER_DIR) && misspell -error . || echo "$(YELLOW)⚠️  Spelling errors found$(RESET)"

## lint-frontend: Run frontend linting
lint-frontend:
	@echo "$(BLUE)🔍 Linting frontend code...$(RESET)"
	cd $(CLIENT_DIR) && pnpm lint
	cd $(CLIENT_DIR) && pnpm check
	cd $(CLIENT_DIR) && pnpm type-check

## format: Format all code
format: format-server format-frontend
	@echo "$(GREEN)✅ Formatting complete!$(RESET)"

## format-server: Format Go code
format-server:
	@echo "$(BLUE)💅 Formatting Go code...$(RESET)"
	cd $(SERVER_DIR) && gofumpt -w .
	cd $(SERVER_DIR) && goimports -w .

## format-frontend: Format frontend code
format-frontend:
	@echo "$(BLUE)💅 Formatting frontend code...$(RESET)"
	cd $(CLIENT_DIR) && pnpm format

## fix: Auto-fix linting issues
fix: fix-server fix-frontend
	@echo "$(GREEN)✅ Auto-fix complete!$(RESET)"

## fix-server: Auto-fix Go linting issues
fix-server:
	@echo "$(BLUE)🔧 Auto-fixing Go code...$(RESET)"
	cd $(SERVER_DIR) && golangci-lint run --fix --timeout=10m
	$(MAKE) format-server

## fix-frontend: Auto-fix frontend linting issues
fix-frontend:
	@echo "$(BLUE)🔧 Auto-fixing frontend code...$(RESET)"
	cd $(CLIENT_DIR) && pnpm lint:fix
	$(MAKE) format-frontend

## dev: Start development servers
dev:
	@echo "$(BLUE)🚀 Starting development servers...$(RESET)"
	@echo "$(YELLOW)Starting Go server in background...$(RESET)"
	cd $(SERVER_DIR) && go run ./cmd/server &
	@echo "$(YELLOW)Starting frontend dev server...$(RESET)"
	cd $(CLIENT_DIR) && pnpm dev

## clean: Clean build artifacts
clean:
	@echo "$(BLUE)🧹 Cleaning build artifacts...$(RESET)"
	cd $(SERVER_DIR) && rm -f $(BINARY_NAME) coverage.out coverage.html
	cd $(CLIENT_DIR) && rm -rf build dist .svelte-kit
	docker system prune -f || true

## install: Install the binary
install: build-server
	@echo "$(BLUE)📦 Installing binary...$(RESET)"
	cd $(SERVER_DIR) && go install ./cmd/server

## docker-build: Build Docker image
docker-build:
	@echo "$(BLUE)🐳 Building Docker image...$(RESET)"
	docker build -t $(PROJECT_NAME):latest -f $(DOCKER_DIR)/Dockerfile .

## docker-run: Run Docker container
docker-run: docker-build
	@echo "$(BLUE)🐳 Running Docker container...$(RESET)"
	docker run -d --name $(PROJECT_NAME) -p 8080:8080 $(PROJECT_NAME):latest

## docker-stop: Stop Docker container
docker-stop:
	@echo "$(BLUE)🐳 Stopping Docker container...$(RESET)"
	docker stop $(PROJECT_NAME) || true
	docker rm $(PROJECT_NAME) || true

## security: Run security scans
security:
	@echo "$(BLUE)🔒 Running security scans...$(RESET)"
	@echo "$(BLUE)📊 Go security scan...$(RESET)"
	cd $(SERVER_DIR) && gosec ./... || echo "$(YELLOW)⚠️  Security issues found$(RESET)"
	@echo "$(BLUE)📊 Container security scan...$(RESET)"
	docker run --rm -v $(PWD):/app aquasec/trivy fs /app || echo "$(YELLOW)⚠️  Security vulnerabilities found$(RESET)"

## benchmark: Run performance benchmarks
benchmark:
	@echo "$(BLUE)⚡ Running benchmarks...$(RESET)"
	cd $(SERVER_DIR) && go test -bench=. -benchmem ./... || echo "$(YELLOW)⚠️  No benchmarks found$(RESET)"

## deps: Update dependencies
deps:
	@echo "$(BLUE)📦 Updating dependencies...$(RESET)"
	cd $(SERVER_DIR) && go get -u ./...
	cd $(SERVER_DIR) && go mod tidy
	cd $(CLIENT_DIR) && pnpm update

## check: Run comprehensive quality checks
check: lint test security
	@echo "$(GREEN)✅ All quality checks passed!$(RESET)"

## ci: Run CI pipeline locally
ci: setup check build
	@echo "$(GREEN)✅ CI pipeline completed successfully!$(RESET)"

## info: Show project information
info:
	@echo "$(CYAN)$(PROJECT_NAME) Project Information$(RESET)"
	@echo ""
	@echo "$(GREEN)Go Version:$(RESET) $(GO_VERSION)"
	@echo "$(GREEN)Node Version:$(RESET) $(NODE_VERSION)"
	@echo "$(GREEN)Binary Name:$(RESET) $(BINARY_NAME)"
	@echo ""
	@echo "$(GREEN)Directories:$(RESET)"
	@echo "  Server: $(SERVER_DIR)"
	@echo "  Client: $(CLIENT_DIR)"
	@echo "  Docker: $(DOCKER_DIR)" 