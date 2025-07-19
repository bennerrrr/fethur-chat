package server

import (
	"log"
	"net/http"
	"sync"

	"fethur/internal/auth"
	"fethur/internal/database"
	"fethur/internal/websocket"

	"github.com/gin-gonic/gin"
)

type Server struct {
	db         *database.Database
	auth       *auth.Service
	hub        *websocket.Hub
	router     *gin.Engine
	clients    map[int]*websocket.Client
	clientsMux sync.RWMutex
}

func New(db *database.Database, auth *auth.Service) *Server {
	hub := websocket.NewHub()
	
	server := &Server{
		db:      db,
		auth:    auth,
		hub:     hub,
		router:  gin.Default(),
		clients: make(map[int]*websocket.Client),
	}

	server.setupRoutes()
	
	// Start the WebSocket hub
	go hub.Run()

	return server
}

func (s *Server) setupRoutes() {
	// API routes
	api := s.router.Group("/api")
	{
		// Auth routes
		auth := api.Group("/auth")
		{
			auth.POST("/register", s.handleRegister)
			auth.POST("/login", s.handleLogin)
		}

		// Protected routes
		protected := api.Group("/")
		protected.Use(s.authMiddleware())
		{
			// User routes
			protected.GET("/user/profile", s.handleGetProfile)
			
			// Server routes
			protected.POST("/servers", s.handleCreateServer)
			protected.GET("/servers", s.handleGetServers)
			protected.GET("/servers/:id", s.handleGetServer)
			
			// Channel routes
			protected.POST("/servers/:id/channels", s.handleCreateChannel)
			protected.GET("/servers/:id/channels", s.handleGetChannels)
			
			// Message routes
			protected.GET("/channels/:channelId/messages", s.handleGetMessages)
		}
	}

	// WebSocket endpoint
	s.router.GET("/ws", s.authMiddleware(), s.handleWebSocket)
	
	// Health check
	s.router.GET("/health", s.handleHealth)
}

func (s *Server) Router() http.Handler {
	return s.router
}

func (s *Server) handleHealth(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status": "healthy",
		"message": "Fethur Server is running",
	})
}

func (s *Server) handleRegister(c *gin.Context) {
	var req struct {
		Username string `json:"username" binding:"required"`
		Email    string `json:"email" binding:"required,email"`
		Password string `json:"password" binding:"required,min=6"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Hash password
	hashedPassword, err := s.auth.HashPassword(req.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	// Insert user into database
	result, err := s.db.Exec(
		"INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
		req.Username, req.Email, hashedPassword,
	)
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Username or email already exists"})
		return
	}

	userID, _ := result.LastInsertId()

	// Generate token
	token, err := s.auth.GenerateToken(int(userID), req.Username)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"token": token,
		"user": gin.H{
			"id":       userID,
			"username": req.Username,
			"email":    req.Email,
		},
	})
}

func (s *Server) handleLogin(c *gin.Context) {
	var req struct {
		Username string `json:"username" binding:"required"`
		Password string `json:"password" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get user from database
	var user struct {
		ID           int    `json:"id"`
		Username     string `json:"username"`
		Email        string `json:"email"`
		PasswordHash string `json:"-"`
	}

	err := s.db.QueryRow(
		"SELECT id, username, email, password_hash FROM users WHERE username = ?",
		req.Username,
	).Scan(&user.ID, &user.Username, &user.Email, &user.PasswordHash)

	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	// Check password
	if !s.auth.CheckPassword(req.Password, user.PasswordHash) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	// Generate token
	token, err := s.auth.GenerateToken(user.ID, user.Username)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token": token,
		"user": gin.H{
			"id":       user.ID,
			"username": user.Username,
			"email":    user.Email,
		},
	})
}

func (s *Server) handleGetProfile(c *gin.Context) {
	userID := c.GetInt("user_id")
	username := c.GetString("username")

	c.JSON(http.StatusOK, gin.H{
		"id":       userID,
		"username": username,
	})
}

func (s *Server) handleCreateServer(c *gin.Context) {
	var req struct {
		Name        string `json:"name" binding:"required"`
		Description string `json:"description"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := c.GetInt("user_id")

	// Create server
	result, err := s.db.Exec(
		"INSERT INTO servers (name, description, owner_id) VALUES (?, ?, ?)",
		req.Name, req.Description, userID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create server"})
		return
	}

	serverID, _ := result.LastInsertId()

	// Add owner as member
	_, err = s.db.Exec(
		"INSERT INTO server_members (user_id, server_id, role) VALUES (?, ?, ?)",
		userID, serverID, "owner",
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add server member"})
		return
	}

	// Create default general channel
	_, err = s.db.Exec(
		"INSERT INTO channels (name, server_id, channel_type) VALUES (?, ?, ?)",
		"general", serverID, "text",
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create default channel"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"id":          serverID,
		"name":        req.Name,
		"description": req.Description,
		"owner_id":    userID,
	})
}

func (s *Server) handleGetServers(c *gin.Context) {
	userID := c.GetInt("user_id")

	rows, err := s.db.Query(`
		SELECT s.id, s.name, s.description, s.owner_id, s.created_at
		FROM servers s
		JOIN server_members sm ON s.id = sm.server_id
		WHERE sm.user_id = ?
		ORDER BY s.created_at DESC
	`, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get servers"})
		return
	}
	defer rows.Close()

	var servers []gin.H
	for rows.Next() {
		var server struct {
			ID          int    `json:"id"`
			Name        string `json:"name"`
			Description string `json:"description"`
			OwnerID     int    `json:"owner_id"`
			CreatedAt   string `json:"created_at"`
		}

		err := rows.Scan(&server.ID, &server.Name, &server.Description, &server.OwnerID, &server.CreatedAt)
		if err != nil {
			continue
		}

		servers = append(servers, gin.H{
			"id":          server.ID,
			"name":        server.Name,
			"description": server.Description,
			"owner_id":    server.OwnerID,
			"created_at":  server.CreatedAt,
		})
	}

	c.JSON(http.StatusOK, gin.H{"servers": servers})
}

func (s *Server) handleGetServer(c *gin.Context) {
	serverID := c.Param("id")
	userID := c.GetInt("user_id")

	// Check if user is member of server
	var exists bool
	err := s.db.QueryRow(
		"SELECT EXISTS(SELECT 1 FROM server_members WHERE user_id = ? AND server_id = ?)",
		userID, serverID,
	).Scan(&exists)

	if err != nil || !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "Server not found"})
		return
	}

	// Get server details
	var server struct {
		ID          int    `json:"id"`
		Name        string `json:"name"`
		Description string `json:"description"`
		OwnerID     int    `json:"owner_id"`
		CreatedAt   string `json:"created_at"`
	}

	err = s.db.QueryRow(
		"SELECT id, name, description, owner_id, created_at FROM servers WHERE id = ?",
		serverID,
	).Scan(&server.ID, &server.Name, &server.Description, &server.OwnerID, &server.CreatedAt)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Server not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":          server.ID,
		"name":        server.Name,
		"description": server.Description,
		"owner_id":    server.OwnerID,
		"created_at":  server.CreatedAt,
	})
}

func (s *Server) handleCreateChannel(c *gin.Context) {
	serverID := c.Param("id")
	userID := c.GetInt("user_id")

	var req struct {
		Name        string `json:"name" binding:"required"`
		ChannelType string `json:"channel_type"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.ChannelType == "" {
		req.ChannelType = "text"
	}

	// Check if user is owner or has permission
	var role string
	err := s.db.QueryRow(
		"SELECT role FROM server_members WHERE user_id = ? AND server_id = ?",
		userID, serverID,
	).Scan(&role)

	if err != nil || (role != "owner" && role != "admin") {
		c.JSON(http.StatusForbidden, gin.H{"error": "Insufficient permissions"})
		return
	}

	// Create channel
	result, err := s.db.Exec(
		"INSERT INTO channels (name, server_id, channel_type) VALUES (?, ?, ?)",
		req.Name, serverID, req.ChannelType,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create channel"})
		return
	}

	channelID, _ := result.LastInsertId()

	c.JSON(http.StatusCreated, gin.H{
		"id":           channelID,
		"name":         req.Name,
		"server_id":    serverID,
		"channel_type": req.ChannelType,
	})
}

func (s *Server) handleGetChannels(c *gin.Context) {
	serverID := c.Param("id")
	userID := c.GetInt("user_id")

	// Check if user is member of server
	var exists bool
	err := s.db.QueryRow(
		"SELECT EXISTS(SELECT 1 FROM server_members WHERE user_id = ? AND server_id = ?)",
		userID, serverID,
	).Scan(&exists)

	if err != nil || !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "Server not found"})
		return
	}

	// Get channels
	rows, err := s.db.Query(
		"SELECT id, name, channel_type, created_at FROM channels WHERE server_id = ? ORDER BY created_at ASC",
		serverID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get channels"})
		return
	}
	defer rows.Close()

	var channels []gin.H
	for rows.Next() {
		var channel struct {
			ID          int    `json:"id"`
			Name        string `json:"name"`
			ChannelType string `json:"channel_type"`
			CreatedAt   string `json:"created_at"`
		}

		err := rows.Scan(&channel.ID, &channel.Name, &channel.ChannelType, &channel.CreatedAt)
		if err != nil {
			continue
		}

		channels = append(channels, gin.H{
			"id":           channel.ID,
			"name":         channel.Name,
			"channel_type": channel.ChannelType,
			"created_at":   channel.CreatedAt,
		})
	}

	c.JSON(http.StatusOK, gin.H{"channels": channels})
}

func (s *Server) handleGetMessages(c *gin.Context) {
	channelID := c.Param("channelId")
	userID := c.GetInt("user_id")

	// Check if user has access to channel
	var exists bool
	err := s.db.QueryRow(`
		SELECT EXISTS(
			SELECT 1 FROM channels c
			JOIN server_members sm ON c.server_id = sm.server_id
			WHERE c.id = ? AND sm.user_id = ?
		)
	`, channelID, userID).Scan(&exists)

	if err != nil || !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "Channel not found"})
		return
	}

	// Get messages
	rows, err := s.db.Query(`
		SELECT m.id, m.content, m.created_at, u.username
		FROM messages m
		JOIN users u ON m.user_id = u.id
		WHERE m.channel_id = ?
		ORDER BY m.created_at DESC
		LIMIT 50
	`, channelID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get messages"})
		return
	}
	defer rows.Close()

	var messages []gin.H
	for rows.Next() {
		var message struct {
			ID        int    `json:"id"`
			Content   string `json:"content"`
			CreatedAt string `json:"created_at"`
			Username  string `json:"username"`
		}

		err := rows.Scan(&message.ID, &message.Content, &message.CreatedAt, &message.Username)
		if err != nil {
			continue
		}

		messages = append(messages, gin.H{
			"id":        message.ID,
			"content":   message.Content,
			"created_at": message.CreatedAt,
			"username":  message.Username,
		})
	}

	c.JSON(http.StatusOK, gin.H{"messages": messages})
}

func (s *Server) handleWebSocket(c *gin.Context) {
	userID := c.GetInt("user_id")
	username := c.GetString("username")

	// Upgrade HTTP connection to WebSocket
	conn, err := websocket.Upgrade(c.Writer, c.Request)
	if err != nil {
		log.Printf("WebSocket upgrade failed: %v", err)
		return
	}

	// Create new client
	client := websocket.NewClient(conn, s.hub, userID, username)
	
	// Register client
	s.clientsMux.Lock()
	s.clients[userID] = client
	s.clientsMux.Unlock()

	// Start client
	client.Start()
}

func (s *Server) authMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Skip auth for WebSocket upgrade
		if c.Request.URL.Path == "/ws" {
			// Extract token from query parameter for WebSocket
			token := c.Query("token")
			if token == "" {
				c.AbortWithStatus(http.StatusUnauthorized)
				return
			}

			claims, err := s.auth.ValidateToken(token)
			if err != nil {
				c.AbortWithStatus(http.StatusUnauthorized)
				return
			}

			c.Set("user_id", claims.UserID)
			c.Set("username", claims.Username)
			c.Next()
			return
		}

		// Extract token from Authorization header
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" || len(authHeader) < 7 || authHeader[:7] != "Bearer " {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Missing or invalid authorization header"})
			c.Abort()
			return
		}

		token := authHeader[7:]
		claims, err := s.auth.ValidateToken(token)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			c.Abort()
			return
		}

		c.Set("user_id", claims.UserID)
		c.Set("username", claims.Username)
		c.Next()
	}
} 