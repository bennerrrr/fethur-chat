# Contributing to Fethur

Thank you for your interest in contributing to Fethur! This guide will help you get started with development and contributing to the project.

## Getting Started

### Prerequisites

- Go 1.21 or later
- Docker & Docker Compose (optional)
- Git
- Make (for development commands)

### Development Setup

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/fethur-chat.git
   cd fethur-chat
   ```

2. **Install dependencies**
   ```bash
   make deps
   ```

3. **Run the server**
   ```bash
   make dev
   ```

4. **Run tests**
   ```bash
   make test
   ```

## Development Workflow

### 1. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
```

### 2. Make Your Changes

Follow the coding standards and add tests for new functionality.

### 3. Run Quality Checks

```bash
# Run tests
make test

# Run linter
make lint

# Format code
make fmt

# Run security scan
make security
```

### 4. Commit Your Changes

```bash
git add .
git commit -m "feat: add new feature description"
```

### 5. Push and Create a Pull Request

```bash
git push origin feature/your-feature-name
```

Then create a pull request on GitHub.

## Code Standards

### Go Code Style

- Follow [Effective Go](https://golang.org/doc/effective_go.html)
- Use `gofmt` for formatting
- Use `goimports` for import organization
- Follow the project's `.golangci.yml` configuration

### Commit Message Format

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

Examples:
```
feat(auth): add OAuth2 support
fix(websocket): handle connection timeouts
docs(api): update authentication examples
test(database): add migration tests
```

### Testing

- Write tests for all new functionality
- Maintain test coverage above 80%
- Use table-driven tests where appropriate
- Mock external dependencies

Example test structure:
```go
func TestFunctionName(t *testing.T) {
    tests := []struct {
        name     string
        input    string
        expected string
    }{
        {
            name:     "normal case",
            input:    "test",
            expected: "expected",
        },
        {
            name:     "edge case",
            input:    "",
            expected: "",
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            result := FunctionName(tt.input)
            if result != tt.expected {
                t.Errorf("FunctionName(%s) = %s, want %s", tt.input, result, tt.expected)
            }
        })
    }
}
```

## Project Structure

```
fethur/
├── server/                 # Go backend
│   ├── cmd/server/        # Application entry point
│   ├── internal/          # Private application code
│   │   ├── auth/         # Authentication
│   │   ├── database/     # Database operations
│   │   ├── server/       # HTTP server
│   │   └── websocket/    # WebSocket handling
│   ├── pkg/              # Public libraries (future)
│   └── .golangci.yml     # Linting configuration
├── client/               # Frontend (future)
├── docs/                 # Documentation
├── docker/               # Docker configurations
├── .github/workflows/    # CI/CD pipelines
└── Makefile             # Development commands
```

## API Development

### Adding New Endpoints

1. **Define the route** in `server/internal/server/server.go`
2. **Create the handler function**
3. **Add tests** for the endpoint
4. **Update documentation**

Example:
```go
func (s *Server) handleNewEndpoint(c *gin.Context) {
    // Validate input
    var req struct {
        Field string `json:"field" binding:"required"`
    }
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    // Process request
    result, err := s.processRequest(req)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }

    // Return response
    c.JSON(http.StatusOK, gin.H{"result": result})
}
```

### Database Changes

1. **Create migration** if needed
2. **Update schema** in `database.go`
3. **Add tests** for new queries
4. **Update documentation**

## WebSocket Development

### Adding New Message Types

1. **Define the message type** in `websocket.go`
2. **Add handler** in the `readPump` function
3. **Add tests** for the new functionality

Example:
```go
const (
    MessageTypeNewFeature = "new_feature"
)

func (c *Client) handleNewFeature(message *Message) {
    // Process the new feature
    c.hub.broadcast <- message
}
```

## Documentation

### Updating Documentation

- Keep README files up to date
- Document new API endpoints
- Update deployment guides
- Add code comments for complex logic

### API Documentation

Use clear examples and include:
- Request/response formats
- Error codes
- Authentication requirements
- Rate limits (if applicable)

## Testing Guidelines

### Unit Tests

- Test individual functions and methods
- Use descriptive test names
- Test both success and failure cases
- Mock external dependencies

### Integration Tests

- Test API endpoints
- Test database operations
- Test WebSocket connections
- Use test databases

### Performance Tests

- Benchmark critical functions
- Test with realistic data volumes
- Monitor memory usage
- Test concurrent operations

## Pull Request Process

### Before Submitting

1. **Ensure all tests pass**
   ```bash
   make test
   ```

2. **Run the linter**
   ```bash
   make lint
   ```

3. **Check code coverage**
   ```bash
   make test-coverage
   ```

4. **Update documentation** if needed

### Pull Request Template

```markdown
## Description
Brief description of the changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Checklist
- [ ] Code follows project style
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
```

## Code Review

### Review Process

1. **Automated checks** must pass
2. **At least one approval** required
3. **Address review comments**
4. **Squash commits** if requested

### Review Guidelines

- Check for security issues
- Verify test coverage
- Ensure documentation is updated
- Look for performance implications
- Check for breaking changes

## Release Process

### Creating a Release

1. **Update version** in relevant files
2. **Create a tag**
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```
3. **GitHub Actions** will automatically:
   - Build binaries
   - Create GitHub release
   - Publish Docker images

### Release Checklist

- [ ] All tests passing
- [ ] Documentation updated
- [ ] Changelog updated
- [ ] Version numbers updated
- [ ] Release notes written

## Getting Help

### Resources

- [GitHub Issues](https://github.com/bennerrrr/fethur-chat/issues)
- [GitHub Discussions](https://github.com/bennerrrr/fethur-chat/discussions)
- [Project Documentation](https://github.com/bennerrrr/fethur-chat/tree/main/docs)

### Communication

- Use GitHub Issues for bug reports
- Use GitHub Discussions for questions
- Be respectful and constructive
- Provide clear, reproducible examples

## Recognition

Contributors will be recognized in:
- GitHub contributors list
- Release notes
- Project documentation

Thank you for contributing to Fethur! 🚀 