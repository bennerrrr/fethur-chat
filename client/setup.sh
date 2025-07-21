#!/bin/bash
# Fethur Client Setup Script
# This script helps set up the Fethur web client for development or production

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "web/package.json" ]; then
    print_error "This script must be run from the client/ directory"
    exit 1
fi

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check Node.js version
check_node() {
    print_status "Checking Node.js version..."
    
    if ! command_exists node; then
        print_error "Node.js is not installed. Please install Node.js 18.0.0 or higher."
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2)
    REQUIRED_VERSION="18.0.0"
    
    if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
        print_error "Node.js version $NODE_VERSION is too old. Please install version $REQUIRED_VERSION or higher."
        exit 1
    fi
    
    print_success "Node.js version $NODE_VERSION is compatible"
}

# Check package manager
check_package_manager() {
    print_status "Checking package manager..."
    
    if command_exists pnpm; then
        PACKAGE_MANAGER="pnpm"
        print_success "Using pnpm"
    elif command_exists npm; then
        PACKAGE_MANAGER="npm"
        print_warning "Using npm (pnpm is recommended for better performance)"
    else
        print_error "No package manager found. Please install npm or pnpm."
        exit 1
    fi
}

# Setup environment file
setup_env() {
    print_status "Setting up environment configuration..."
    
    cd web
    
    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            cp .env.example .env
            print_success "Created .env file from .env.example"
            print_warning "Please edit .env file to configure your backend URLs"
        else
            # Create basic .env file
            cat > .env << EOF
# Fethur Web Client Configuration
PUBLIC_API_URL=http://localhost:8080
PUBLIC_WS_URL=ws://localhost:8080
PUBLIC_DEV_MODE=true
PUBLIC_LOG_LEVEL=debug
EOF
            print_success "Created basic .env file"
        fi
    else
        print_success ".env file already exists"
    fi
    
    cd ..
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    
    cd web
    
    if [ "$PACKAGE_MANAGER" = "pnpm" ]; then
        pnpm install
    else
        npm install
    fi
    
    print_success "Dependencies installed successfully"
    cd ..
}

# Start development server
start_dev() {
    print_status "Starting development server..."
    
    cd web
    
    print_success "Development server starting..."
    print_status "The client will be available at: http://localhost:5173"
    print_status "Make sure your Fethur backend server is running on port 8080"
    print_status "Press Ctrl+C to stop the server"
    
    if [ "$PACKAGE_MANAGER" = "pnpm" ]; then
        pnpm run dev --open
    else
        npm run dev -- --open
    fi
}

# Build for production
build_production() {
    print_status "Building for production..."
    
    cd web
    
    if [ "$PACKAGE_MANAGER" = "pnpm" ]; then
        pnpm run build
    else
        npm run build
    fi
    
    print_success "Production build completed"
    print_status "Build files are in the 'build' directory"
    print_status "Deploy the 'build' directory to your web server"
    
    cd ..
}

# Main script logic
main() {
    echo -e "${BLUE}"
    echo "=================================================="
    echo "           Fethur Web Client Setup"
    echo "=================================================="
    echo -e "${NC}"
    
    # Parse command line arguments
    case "${1:-}" in
        "dev"|"development"|"")
            check_node
            check_package_manager
            setup_env
            install_dependencies
            start_dev
            ;;
        "build"|"production")
            check_node
            check_package_manager
            setup_env
            install_dependencies
            build_production
            ;;
        "install"|"setup")
            check_node
            check_package_manager
            setup_env
            install_dependencies
            print_success "Setup completed successfully!"
            print_status "Run './setup.sh dev' to start development server"
            print_status "Run './setup.sh build' to build for production"
            ;;
        "help"|"-h"|"--help")
            echo "Fethur Client Setup Script"
            echo ""
            echo "Usage: $0 [command]"
            echo ""
            echo "Commands:"
            echo "  dev, development    Setup and start development server (default)"
            echo "  build, production   Setup and build for production"
            echo "  install, setup      Setup dependencies and environment only"
            echo "  help                Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                  # Start development server"
            echo "  $0 dev              # Start development server"
            echo "  $0 build            # Build for production"
            echo "  $0 install          # Setup only, don't start server"
            ;;
        *)
            print_error "Unknown command: $1"
            print_status "Run '$0 help' for usage information"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"