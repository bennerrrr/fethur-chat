.PHONY: help build test lint clean docker-build docker-run docker-stop dev

# Default target
help:
	@echo "Fethur - Available commands:"
	@echo "  build        - Build the server binary"
	@echo "  test         - Run tests"
	@echo "  lint         - Run linter"
	@echo "  clean        - Clean build artifacts"
	@echo "  docker-build - Build Docker image"
	@echo "  docker-run   - Run with Docker Compose"
	@echo "  docker-stop  - Stop Docker Compose"
	@echo "  dev          - Run in development mode"
	@echo "  release      - Create a new release"

# Build the server binary
build:
	@echo "Building Fethur server..."
	cd server && go build -o fethur-server ./cmd/server

# Run tests
test:
	@echo "Running tests..."
	cd server && go test -v ./...

# Run tests with coverage
test-coverage:
	@echo "Running tests with coverage..."
	cd server && go test -coverprofile=coverage.out -covermode=atomic ./...
	cd server && go tool cover -html=coverage.out -o coverage.html
	@echo "Coverage report generated: server/coverage.html"

# Run linter
lint:
	@echo "Running linter..."
	cd server && golangci-lint run

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	rm -f server/fethur-server
	rm -f server/coverage.out
	rm -f server/coverage.html
	rm -f server/*.db

# Build Docker image
docker-build:
	@echo "Building Docker image..."
	docker build -t fethur-server:latest -f docker/Dockerfile .

# Run with Docker Compose
docker-run:
	@echo "Starting Fethur with Docker Compose..."
	docker-compose up -d

# Stop Docker Compose
docker-stop:
	@echo "Stopping Docker Compose..."
	docker-compose down

# Development mode
dev:
	@echo "Starting Fethur in development mode..."
	cd server && go run cmd/server/main.go

# Create a new release
release:
	@echo "Creating release..."
	@read -p "Enter version (e.g., v1.0.0): " version; \
	git tag $$version; \
	git push origin $$version

# Install dependencies
deps:
	@echo "Installing dependencies..."
	cd server && go mod tidy
	cd server && go mod download

# Format code
fmt:
	@echo "Formatting code..."
	cd server && go fmt ./...
	cd server && goimports -w .

# Generate documentation
docs:
	@echo "Generating documentation..."
	cd server && godoc -http=:6060 &
	@echo "Documentation available at http://localhost:6060"

# Security scan
security:
	@echo "Running security scan..."
	trivy fs .

# Performance benchmark
bench:
	@echo "Running benchmarks..."
	cd server && go test -bench=. ./... 