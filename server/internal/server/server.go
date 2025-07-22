package server

import (
	"fmt"
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
		// Setup routes (no auth required)
		setup := api.Group("/setup")
		{
			setup.GET("/status", s.handleSetupStatus)
			setup.POST("/configure", s.handleSetupConfigure)
		}

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

			// Settings routes (admin only)
			protected.GET("/settings", s.adminMiddleware(), s.handleGetSettings)

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
		"status":  "healthy",
		"message": "Fethur Server is running",
	})
}

func (s *Server) handleSetupStatus(c *gin.Context) {
	isFirstTime, err := s.db.IsFirstTime()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check setup status"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"isFirstTime": isFirstTime,
	})
}

func (s *Server) handleSetupConfigure(c *gin.Context) {
	var req struct {
		Network struct {
			Hostname       string `json:"hostname"`
			Port           string `json:"port"`
			SSL            bool   `json:"ssl"`
			ExternalDomain string `json:"externalDomain"`
			MDNS           bool   `json:"mdns"`
		} `json:"network"`
		Auth struct {
			Mode                 string `json:"mode"`
			RegistrationPassword string `json:"registrationPassword"`
		} `json:"auth"`
		Admin struct {
			Username string `json:"username"`
			Password string `json:"password"`
		} `json:"admin"`
		User struct {
			Username string `json:"username"`
			Password string `json:"password"`
		} `json:"user"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate admin password
	if err := s.auth.ValidatePassword(req.Admin.Password); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Save settings
	settings := map[string]string{
		"hostname":              req.Network.Hostname,
		"port":                  req.Network.Port,
		"ssl_enabled":           fmt.Sprintf("%t", req.Network.SSL),
		"external_domain":       req.Network.ExternalDomain,
		"mdns_enabled":          fmt.Sprintf("%t", req.Network.MDNS),
		"auth_mode":             req.Auth.Mode,
		"registration_password": req.Auth.RegistrationPassword,
	}

	for key, value := range settings {
		if err := s.db.SetSetting(key, value, ""); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save settings"})
			return
		}
	}

	// Create super admin user
	hashedPassword, err := s.auth.HashPassword(req.Admin.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	_, err = s.db.Exec(
		"INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)",
		req.Admin.Username, "", hashedPassword, "super_admin",
	)
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Admin user already exists"})
		return
	}

	// Create normal user if provided
	if req.User.Username != "" && req.User.Password != "" {
		if err := s.auth.ValidatePassword(req.User.Password); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "User password: " + err.Error()})
			return
		}

		userHashedPassword, err := s.auth.HashPassword(req.User.Password)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash user password"})
			return
		}

		_, err = s.db.Exec(
			"INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)",
			req.User.Username, "", userHashedPassword, "user",
		)
		if err != nil {
			c.JSON(http.StatusConflict, gin.H{"error": "User already exists"})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Configuration completed successfully",
	})
}

func (s *Server) handleRegister(c *gin.Context) {
	var req struct {
		Username             string `json:"username" binding:"required"`
		Password             string `json:"password" binding:"required,min=6"`
		RegistrationPassword string `json:"registrationPassword"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check authentication mode
	authMode, err := s.db.GetSetting("auth_mode")
	if err != nil {
		authMode = "public" // Default to public
	}

	// Validate registration based on auth mode
	switch authMode {
	case "admin_only":
		c.JSON(http.StatusForbidden, gin.H{"error": "Registration is disabled. Only admins can create accounts."})
		return
	case "open_registration":
		regPassword, err := s.db.GetSetting("registration_password")
		if err != nil || regPassword != req.RegistrationPassword {
			c.JSON(http.StatusForbidden, gin.H{"error": "Invalid registration password"})
			return
		}
	}

	// Validate password
	if err := s.auth.ValidatePassword(req.Password); err != nil {
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
		"INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)",
		req.Username, "", hashedPassword, "user",
	)
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Username or email already exists"})
		return
	}

	userID, _ := result.LastInsertId()

	// Generate token
	token, err := s.auth.GenerateToken(int(userID), req.Username, "user")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"token": token,
		"user": gin.H{
			"id":       userID,
			"username": req.Username,
			"email":    "", // Email is now optional
			"role":     "user",
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
	var userID int
	var username, email, passwordHash, role string
	err := s.db.QueryRow(
		"SELECT id, username, email, password_hash, role FROM users WHERE username = ?",
		req.Username,
	).Scan(&userID, &username, &email, &passwordHash, &role)

	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid username or password"})
		return
	}

	// Check password
	if !s.auth.CheckPassword(req.Password, passwordHash) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid username or password"})
		return
	}

	// Generate token
	token, err := s.auth.GenerateToken(userID, username, role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token": token,
		"user": gin.H{
			"id":       userID,
			"username": username,
			"email":    email,
			"role":     role,
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
			"id":         message.ID,
			"content":    message.Content,
			"created_at": message.CreatedAt,
			"username":   message.Username,
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

func (s *Server) adminMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetInt("user_id")
		var role string
		err := s.db.QueryRow("SELECT role FROM users WHERE id = ?", userID).Scan(&role)
		if err != nil || (role != "super_admin" && role != "admin") {
			c.JSON(http.StatusForbidden, gin.H{"error": "Only admins can access this endpoint"})
			c.Abort()
			return
		}
		c.Next()
	}
}

func (s *Server) handleGetSettings(c *gin.Context) {
	settings, err := s.db.GetAllSettings()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get settings"})
		return
	}
	c.JSON(http.StatusOK, settings)
}
