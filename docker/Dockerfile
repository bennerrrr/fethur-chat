# Build frontend
FROM node:24-alpine AS web-builder
WORKDIR /web
COPY client/web/package.json client/web/pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install
COPY client/web .
RUN pnpm build

# Build Go backend
FROM golang:1.24-alpine AS builder
RUN apk add --no-cache git gcc musl-dev sqlite-dev
WORKDIR /app
COPY server/go.mod server/go.sum ./
RUN go mod download
COPY server/ ./
RUN CGO_ENABLED=1 GOOS=linux go build -a -installsuffix cgo -ldflags="-s -w" -o fethur-server ./cmd/server

# Final stage
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
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1
CMD ["/bin/sh", "-c", "./fethur-server & nginx -g 'daemon off;'"] 