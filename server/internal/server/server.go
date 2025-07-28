package server

import (
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"fethur/internal/auth"
	"fethur/internal/database"
	"fethur/internal/websocket"

	"github.com/gin-contrib/cors"
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
	// Add CORS middleware
	config := cors.DefaultConfig()
	config.AllowOrigins = []string{"http://localhost:5173", "http://127.0.0.1:5173", "http://192.168.1.23:5173"}
	config.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
	config.AllowHeaders = []string{"Origin", "Content-Type", "Accept", "Authorization"}
	config.AllowCredentials = true

	s.router.Use(cors.New(config))

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
			auth.GET("/me", s.authMiddleware(), s.handleGetCurrentUser)
			auth.POST("/guest", s.handleGuestLogin)
		}

		// Protected routes
		protected := api.Group("/")
		protected.Use(s.authMiddleware())
		{
			// User routes
			protected.GET("/user/profile", s.handleGetProfile)

			// Settings routes (admin only)
			protected.GET("/settings", s.adminMiddleware(), s.handleGetSettings)
			protected.POST("/settings", s.adminMiddleware(), s.handleUpdateSettings)

			// Admin routes (admin only)
			admin := protected.Group("/admin")
			admin.Use(s.adminMiddleware())
			{
				// User management
				admin.GET("/users", s.handleGetUsers)
				admin.POST("/users", s.handleCreateUser)
				admin.PUT("/users/:id", s.handleUpdateUser)
				admin.DELETE("/users/:id", s.handleDeleteUser)
				admin.POST("/users/:id/role", s.handleUpdateUserRole)

				// Moderation
				admin.POST("/users/:id/kick", s.handleKickUser)
				admin.POST("/users/:id/ban", s.handleBanUser)
				admin.POST("/users/:id/mute", s.handleMuteUser)
				admin.POST("/users/:id/unban", s.handleUnbanUser)
				admin.POST("/users/:id/unmute", s.handleUnmuteUser)

				// System health
				admin.GET("/health", s.handleAdminHealth)
				admin.GET("/metrics", s.handleGetMetrics)
				admin.GET("/users/online", s.handleGetOnlineUsers)
				admin.GET("/users/latency", s.handleGetUserLatency)

				// Audit logs
				admin.GET("/logs", s.handleGetAuditLogs)
			}

			// Server routes
			protected.POST("/servers", s.handleCreateServer)
			protected.GET("/servers", s.handleGetServers)
			protected.GET("/servers/:id", s.handleGetServer)

			// Channel routes
			protected.POST("/servers/:id/channels", s.handleCreateChannel)
			protected.GET("/servers/:id/channels", s.handleGetChannels)

			// Message routes
			protected.GET("/channels/:channelId/messages", s.handleGetMessages)
			protected.POST("/channels/:channelId/messages", s.handleSendMessage)
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
	// Add CORS headers for health endpoint
	c.Header("Access-Control-Allow-Origin", "*")
	c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
	c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, Authorization")

	c.JSON(http.StatusOK, gin.H{
		"status":  "healthy",
		"message": "Fethur Server is running",
	})
}

func (s *Server) handleGetCurrentUser(c *gin.Context) {
	userID := c.GetInt("user_id")
	username := c.GetString("username")

	// Get user details from database
	var email, role string
	err := s.db.QueryRow(
		"SELECT email, role FROM users WHERE id = ?",
		userID,
	).Scan(&email, &role)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get user"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"id":       userID,
			"username": username,
			"email":    email,
			"role":     role,
		},
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

func (s *Server) handleGuestLogin(c *gin.Context) {
	// Check if guest mode is enabled
	guestModeEnabled, err := s.db.GetSetting("guest_mode_enabled")
	if err != nil || guestModeEnabled != "true" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Guest mode is not enabled"})
		return
	}

	// Check if auto login is enabled
	autoLoginEnabled, err := s.db.GetSetting("auto_login_enabled")
	if err != nil || autoLoginEnabled != "true" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Auto login is not enabled"})
		return
	}

	// Get default credentials
	defaultUsername, err := s.db.GetSetting("default_username")
	if err != nil || defaultUsername == "" {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Default username not configured"})
		return
	}

	defaultPassword, err := s.db.GetSetting("default_password")
	if err != nil || defaultPassword == "" {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Default password not configured"})
		return
	}

	// Get user from database
	var userID int
	var username, email, passwordHash, role string
	err = s.db.QueryRow(
		"SELECT id, username, email, password_hash, role FROM users WHERE username = ?",
		defaultUsername,
	).Scan(&userID, &username, &email, &passwordHash, &role)

	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Default user not found"})
		return
	}

	// Check password
	if !s.auth.CheckPassword(defaultPassword, passwordHash) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid default credentials"})
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
	defer func() {
		if err := rows.Close(); err != nil {
			log.Printf("Error closing rows: %v", err)
		}
	}()

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
	defer func() {
		if err := rows.Close(); err != nil {
			log.Printf("Error closing rows: %v", err)
		}
	}()

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
	defer func() {
		if err := rows.Close(); err != nil {
			log.Printf("Error closing rows: %v", err)
		}
	}()

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

func (s *Server) handleSendMessage(c *gin.Context) {
	channelID := c.Param("channelId")
	userID := c.GetInt("user_id")
	username := c.GetString("username")

	var req struct {
		Content string `json:"content" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Insert message into database
	result, err := s.db.Exec(
		"INSERT INTO messages (channel_id, user_id, content, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)",
		channelID, userID, req.Content,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send message"})
		return
	}

	messageID, _ := result.LastInsertId()

	// Convert channelID to int for WebSocket message
	channelIDInt := 0
	if _, err := fmt.Sscanf(channelID, "%d", &channelIDInt); err != nil {
		log.Printf("Error parsing channel ID: %v", err)
		channelIDInt = 0
	}

	// Broadcast message to all connected clients via WebSocket
	wsMessage := &websocket.Message{
		Type:      "message",
		ChannelID: channelIDInt,
		Content:   req.Content,
		UserID:    userID,
		Username:  username,
		Timestamp: time.Now(),
		Data: gin.H{
			"id":         messageID,
			"channel_id": channelID,
			"user_id":    userID,
			"username":   username,
			"content":    req.Content,
			"created_at": time.Now().Format(time.RFC3339),
		},
	}

	s.hub.BroadcastMessage(wsMessage)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Message sent successfully",
		"data": gin.H{
			"id":         messageID,
			"channel_id": channelID,
			"user_id":    userID,
			"username":   username,
			"content":    req.Content,
			"created_at": time.Now().Format(time.RFC3339),
		},
	})
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

func (s *Server) handleUpdateSettings(c *gin.Context) {
	var req struct {
		GuestModeEnabled bool   `json:"guest_mode_enabled"`
		AutoLoginEnabled bool   `json:"auto_login_enabled"`
		DefaultUsername  string `json:"default_username"`
		DefaultPassword  string `json:"default_password"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Update settings
	if err := s.db.SetSetting("guest_mode_enabled", fmt.Sprintf("%t", req.GuestModeEnabled), "Enable guest mode for unauthenticated users"); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update guest mode setting"})
		return
	}

	if err := s.db.SetSetting("auto_login_enabled", fmt.Sprintf("%t", req.AutoLoginEnabled), "Enable automatic login with default credentials"); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update auto login setting"})
		return
	}

	if req.DefaultUsername != "" {
		if err := s.db.SetSetting("default_username", req.DefaultUsername, "Default username for auto login"); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update default username"})
			return
		}
	}

	if req.DefaultPassword != "" {
		if err := s.db.SetSetting("default_password", req.DefaultPassword, "Default password for auto login"); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update default password"})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Settings updated successfully",
	})
}

// Admin User Management Handlers

func (s *Server) handleGetUsers(c *gin.Context) {
	rows, err := s.db.Query(`
		SELECT id, username, email, role, created_at, updated_at,
		       (SELECT COUNT(*) FROM messages WHERE user_id = users.id) as message_count,
		       (SELECT COUNT(*) FROM server_members WHERE user_id = users.id) as server_count
		FROM users 
		ORDER BY created_at DESC
	`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get users"})
		return
	}
	defer rows.Close()

	var users []gin.H
	for rows.Next() {
		var user struct {
			ID           int    `json:"id"`
			Username     string `json:"username"`
			Email        string `json:"email"`
			Role         string `json:"role"`
			CreatedAt    string `json:"created_at"`
			UpdatedAt    string `json:"updated_at"`
			MessageCount int    `json:"message_count"`
			ServerCount  int    `json:"server_count"`
		}

		err := rows.Scan(&user.ID, &user.Username, &user.Email, &user.Role, &user.CreatedAt, &user.UpdatedAt, &user.MessageCount, &user.ServerCount)
		if err != nil {
			continue
		}

		// Check if user is online
		s.clientsMux.RLock()
		_, isOnline := s.clients[user.ID]
		s.clientsMux.RUnlock()

		users = append(users, gin.H{
			"id":            user.ID,
			"username":      user.Username,
			"email":         user.Email,
			"role":          user.Role,
			"created_at":    user.CreatedAt,
			"updated_at":    user.UpdatedAt,
			"message_count": user.MessageCount,
			"server_count":  user.ServerCount,
			"is_online":     isOnline,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    users,
	})
}

func (s *Server) handleCreateUser(c *gin.Context) {
	var req struct {
		Username string `json:"username" binding:"required"`
		Email    string `json:"email"`
		Password string `json:"password" binding:"required"`
		Role     string `json:"role"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate password
	if err := s.auth.ValidatePassword(req.Password); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Set default role if not provided
	if req.Role == "" {
		req.Role = "user"
	}

	// Validate role
	if req.Role != "user" && req.Role != "admin" && req.Role != "super_admin" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid role"})
		return
	}

	// Hash password
	hashedPassword, err := s.auth.HashPassword(req.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	// Insert user
	result, err := s.db.Exec(
		"INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)",
		req.Username, req.Email, hashedPassword, req.Role,
	)
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Username already exists"})
		return
	}

	userID, _ := result.LastInsertId()

	// Log the action
	s.logAdminAction(c.GetInt("user_id"), "create_user", fmt.Sprintf("Created user %s with role %s", req.Username, req.Role))

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "User created successfully",
		"data": gin.H{
			"id":       userID,
			"username": req.Username,
			"email":    req.Email,
			"role":     req.Role,
		},
	})
}

func (s *Server) handleUpdateUser(c *gin.Context) {
	userID := c.Param("id")
	var req struct {
		Username string `json:"username"`
		Email    string `json:"email"`
		Password string `json:"password"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Build update query
	updates := []string{}
	args := []interface{}{}

	if req.Username != "" {
		updates = append(updates, "username = ?")
		args = append(args, req.Username)
	}

	if req.Email != "" {
		updates = append(updates, "email = ?")
		args = append(args, req.Email)
	}

	if req.Password != "" {
		if err := s.auth.ValidatePassword(req.Password); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		hashedPassword, err := s.auth.HashPassword(req.Password)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
			return
		}

		updates = append(updates, "password_hash = ?")
		args = append(args, hashedPassword)
	}

	if len(updates) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No fields to update"})
		return
	}

	updates = append(updates, "updated_at = CURRENT_TIMESTAMP")
	args = append(args, userID)

	query := fmt.Sprintf("UPDATE users SET %s WHERE id = ?", strings.Join(updates, ", "))
	_, err := s.db.Exec(query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user"})
		return
	}

	// Log the action
	s.logAdminAction(c.GetInt("user_id"), "update_user", fmt.Sprintf("Updated user ID %s", userID))

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "User updated successfully",
	})
}

func (s *Server) handleDeleteUser(c *gin.Context) {
	userID := c.Param("id")

	// Check if user exists
	var username string
	err := s.db.QueryRow("SELECT username FROM users WHERE id = ?", userID).Scan(&username)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Delete user (cascade will handle related data)
	_, err = s.db.Exec("DELETE FROM users WHERE id = ?", userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete user"})
		return
	}

	// Disconnect user if online
	s.clientsMux.Lock()
	if client, exists := s.clients[userID]; exists {
		client.Close()
		delete(s.clients, userID)
	}
	s.clientsMux.Unlock()

	// Log the action
	s.logAdminAction(c.GetInt("user_id"), "delete_user", fmt.Sprintf("Deleted user %s (ID: %s)", username, userID))

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "User deleted successfully",
	})
}

func (s *Server) handleUpdateUserRole(c *gin.Context) {
	userID := c.Param("id")
	var req struct {
		Role string `json:"role" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate role
	if req.Role != "user" && req.Role != "admin" && req.Role != "super_admin" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid role"})
		return
	}

	// Update role
	_, err := s.db.Exec("UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", req.Role, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user role"})
		return
	}

	// Log the action
	s.logAdminAction(c.GetInt("user_id"), "update_role", fmt.Sprintf("Updated user ID %s role to %s", userID, req.Role))

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "User role updated successfully",
	})
}

// Moderation Handlers

func (s *Server) handleKickUser(c *gin.Context) {
	userID := c.Param("id")
	var req struct {
		Reason string `json:"reason"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Disconnect user if online
	userIDInt, _ := strconv.Atoi(userID)
	s.clientsMux.Lock()
	if client, exists := s.clients[userIDInt]; exists {
		client.Close()
		delete(s.clients, userIDInt)
	}
	s.clientsMux.Unlock()

	// Log the action
	s.logAdminAction(c.GetInt("user_id"), "kick_user", fmt.Sprintf("Kicked user ID %s. Reason: %s", userID, req.Reason))

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "User kicked successfully",
	})
}

func (s *Server) handleBanUser(c *gin.Context) {
	userID := c.Param("id")
	var req struct {
		Reason   string `json:"reason"`
		Duration int    `json:"duration"` // Duration in hours, 0 for permanent
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Create ban record
	expiresAt := "NULL"
	if req.Duration > 0 {
		expiresAt = fmt.Sprintf("datetime('now', '+%d hours')", req.Duration)
	}

	_, err := s.db.Exec(`
		INSERT OR REPLACE INTO user_bans (user_id, reason, banned_by, expires_at, created_at) 
		VALUES (?, ?, ?, %s, CURRENT_TIMESTAMP)
	`, userID, req.Reason, c.GetInt("user_id"), expiresAt)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to ban user"})
		return
	}

	// Disconnect user if online
	s.clientsMux.Lock()
	if client, exists := s.clients[userID]; exists {
		client.Close()
		delete(s.clients, userID)
	}
	s.clientsMux.Unlock()

	// Log the action
	durationStr := "permanent"
	if req.Duration > 0 {
		durationStr = fmt.Sprintf("%d hours", req.Duration)
	}
	s.logAdminAction(c.GetInt("user_id"), "ban_user", fmt.Sprintf("Banned user ID %s for %s. Reason: %s", userID, durationStr, req.Reason))

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "User banned successfully",
	})
}

func (s *Server) handleUnbanUser(c *gin.Context) {
	userID := c.Param("id")

	_, err := s.db.Exec("DELETE FROM user_bans WHERE user_id = ?", userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to unban user"})
		return
	}

	// Log the action
	s.logAdminAction(c.GetInt("user_id"), "unban_user", fmt.Sprintf("Unbanned user ID %s", userID))

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "User unbanned successfully",
	})
}

func (s *Server) handleMuteUser(c *gin.Context) {
	userID := c.Param("id")
	var req struct {
		Reason   string `json:"reason"`
		Duration int    `json:"duration"` // Duration in minutes
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Create mute record
	expiresAt := "NULL"
	if req.Duration > 0 {
		expiresAt = fmt.Sprintf("datetime('now', '+%d minutes')", req.Duration)
	}

	_, err := s.db.Exec(`
		INSERT OR REPLACE INTO user_mutes (user_id, reason, muted_by, expires_at, created_at) 
		VALUES (?, ?, ?, %s, CURRENT_TIMESTAMP)
	`, userID, req.Reason, c.GetInt("user_id"), expiresAt)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to mute user"})
		return
	}

	// Log the action
	durationStr := "permanent"
	if req.Duration > 0 {
		durationStr = fmt.Sprintf("%d minutes", req.Duration)
	}
	s.logAdminAction(c.GetInt("user_id"), "mute_user", fmt.Sprintf("Muted user ID %s for %s. Reason: %s", userID, durationStr, req.Reason))

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "User muted successfully",
	})
}

func (s *Server) handleUnmuteUser(c *gin.Context) {
	userID := c.Param("id")

	_, err := s.db.Exec("DELETE FROM user_mutes WHERE user_id = ?", userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to unmute user"})
		return
	}

	// Log the action
	s.logAdminAction(c.GetInt("user_id"), "unmute_user", fmt.Sprintf("Unmuted user ID %s", userID))

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "User unmuted successfully",
	})
}

// System Health Handlers

func (s *Server) handleAdminHealth(c *gin.Context) {
	// Database health
	var dbStatus string
	err := s.db.Ping()
	if err != nil {
		dbStatus = "unhealthy"
	} else {
		dbStatus = "healthy"
	}

	// Get basic stats
	var userCount, messageCount, serverCount int
	s.db.QueryRow("SELECT COUNT(*) FROM users").Scan(&userCount)
	s.db.QueryRow("SELECT COUNT(*) FROM messages").Scan(&messageCount)
	s.db.QueryRow("SELECT COUNT(*) FROM servers").Scan(&serverCount)

	// Get online users count
	s.clientsMux.RLock()
	onlineCount := len(s.clients)
	s.clientsMux.RUnlock()

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"database": gin.H{
				"status": dbStatus,
				"type":   "sqlite3",
			},
			"server": gin.H{
				"status": "healthy",
				"uptime": time.Since(time.Now()).String(), // This will be negative, need to track start time
			},
			"websocket": gin.H{
				"status":      "healthy",
				"connections": onlineCount,
				"hub_running": true,
			},
			"statistics": gin.H{
				"total_users":    userCount,
				"online_users":   onlineCount,
				"total_messages": messageCount,
				"total_servers":  serverCount,
			},
		},
	})
}

func (s *Server) handleGetMetrics(c *gin.Context) {
	// Get user activity metrics
	var activeUsers, newUsersToday, messagesToday int

	s.db.QueryRow("SELECT COUNT(*) FROM users WHERE updated_at > datetime('now', '-1 day')").Scan(&activeUsers)
	s.db.QueryRow("SELECT COUNT(*) FROM users WHERE created_at > datetime('now', '-1 day')").Scan(&newUsersToday)
	s.db.QueryRow("SELECT COUNT(*) FROM messages WHERE created_at > datetime('now', '-1 day')").Scan(&messagesToday)

	// Get role distribution
	rows, err := s.db.Query("SELECT role, COUNT(*) FROM users GROUP BY role")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get role metrics"})
		return
	}
	defer rows.Close()

	roleDistribution := make(map[string]int)
	for rows.Next() {
		var role string
		var count int
		rows.Scan(&role, &count)
		roleDistribution[role] = count
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"user_activity": gin.H{
				"active_users_24h": activeUsers,
				"new_users_today":  newUsersToday,
				"messages_today":   messagesToday,
			},
			"role_distribution": roleDistribution,
			"online_users":      len(s.clients),
		},
	})
}

func (s *Server) handleGetOnlineUsers(c *gin.Context) {
	s.clientsMux.RLock()
	onlineUsers := make([]gin.H, 0, len(s.clients))
	for userID, client := range s.clients {
		onlineUsers = append(onlineUsers, gin.H{
			"id":           userID,
			"username":     client.GetUsername(),
			"ip":           client.GetConnection().RemoteAddr().String(),
			"connected_at": time.Now().Format(time.RFC3339), // We don't track connection time yet
		})
	}
	s.clientsMux.RUnlock()

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    onlineUsers,
	})
}

func (s *Server) handleGetUserLatency(c *gin.Context) {
	// This would require implementing ping/pong in WebSocket
	// For now, return placeholder data
	s.clientsMux.RLock()
	latencyData := make([]gin.H, 0, len(s.clients))
	for userID, client := range s.clients {
		latencyData = append(latencyData, gin.H{
			"id":       userID,
			"username": client.GetUsername(),
			"ip":       client.GetConnection().RemoteAddr().String(),
			"latency":  "N/A", // Would be calculated from ping/pong
		})
	}
	s.clientsMux.RUnlock()

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    latencyData,
	})
}

func (s *Server) handleGetAuditLogs(c *gin.Context) {
	limit := c.DefaultQuery("limit", "50")
	offset := c.DefaultQuery("offset", "0")

	rows, err := s.db.Query(`
		SELECT al.id, al.admin_id, u.username as admin_username, al.action, al.details, al.created_at
		FROM audit_logs al
		LEFT JOIN users u ON al.admin_id = u.id
		ORDER BY al.created_at DESC
		LIMIT ? OFFSET ?
	`, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get audit logs"})
		return
	}
	defer rows.Close()

	var logs []gin.H
	for rows.Next() {
		var log struct {
			ID            int    `json:"id"`
			AdminID       int    `json:"admin_id"`
			AdminUsername string `json:"admin_username"`
			Action        string `json:"action"`
			Details       string `json:"details"`
			CreatedAt     string `json:"created_at"`
		}

		err := rows.Scan(&log.ID, &log.AdminID, &log.AdminUsername, &log.Action, &log.Details, &log.CreatedAt)
		if err != nil {
			continue
		}

		logs = append(logs, gin.H{
			"id":             log.ID,
			"admin_id":       log.AdminID,
			"admin_username": log.AdminUsername,
			"action":         log.Action,
			"details":        log.Details,
			"created_at":     log.CreatedAt,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    logs,
	})
}

// Helper method to log admin actions
func (s *Server) logAdminAction(adminID int, action, details string) {
	_, err := s.db.Exec(`
		INSERT INTO audit_logs (admin_id, action, details, created_at) 
		VALUES (?, ?, ?, CURRENT_TIMESTAMP)
	`, adminID, action, details)
	if err != nil {
		log.Printf("Failed to log admin action: %v", err)
	}
}
