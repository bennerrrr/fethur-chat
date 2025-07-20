# Build stage
FROM golang:1.21-alpine AS builder

# Install build dependencies
RUN apk add --no-cache git gcc musl-dev sqlite-dev

# Set working directory
WORKDIR /app

# Copy go mod files
COPY server/go.mod server/go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY server/ ./

# Build the application
RUN CGO_ENABLED=1 GOOS=linux go build -a -installsuffix cgo -ldflags="-s -w" -o fethur-server ./cmd/server

# Final stage
FROM alpine:latest

# Install runtime dependencies
RUN apk --no-cache add ca-certificates sqlite wget

# Create non-root user
RUN addgroup -g 1001 -S fethur && \
    adduser -u 1001 -S fethur -G fethur

# Set working directory
WORKDIR /app

# Copy binary from builder stage
COPY --from=builder /app/fethur-server .

# Create data directory
RUN mkdir -p /app/data && \
    chown -R fethur:fethur /app

# Switch to non-root user
USER fethur

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Run the application
CMD ["./fethur-server"] 