package voice

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // In production, implement proper origin checking
	},
}

// VoiceMessage represents a WebRTC signaling message
type VoiceMessage struct {
	Type      string      `json:"type"`
	ChannelID int64       `json:"channel_id"`
	ServerID  int64       `json:"server_id"`
	UserID    int64       `json:"user_id"`
	Username  string      `json:"username"`
	TargetID  *int64      `json:"target_id,omitempty"`
	Data      interface{} `json:"data,omitempty"`
	Timestamp time.Time   `json:"timestamp"`
}

// VoiceClient represents a connected voice client
type VoiceClient struct {
	ID         int64
	Username   string
	conn       *websocket.Conn
	send       chan []byte
	channelID  int64
	serverID   int64
	isMuted    bool
	isDeafened bool
	isSpeaking bool
	lastSeen   time.Time
	closed     bool
	hub        *VoiceHub
	mutex      sync.RWMutex
}

// VoiceChannel represents a voice channel
type VoiceChannel struct {
	ID       int64
	ServerID int64
	Name     string
	Clients  map[int64]*VoiceClient // userID -> client
	mutex    sync.RWMutex
}

// VoiceHub manages all voice connections
type VoiceHub struct {
	clients    map[int64]*VoiceClient  // userID -> client
	channels   map[int64]*VoiceChannel // channelID -> channel
	register   chan *VoiceClient
	unregister chan *VoiceClient
	messages   chan *VoiceMessage
	mutex      sync.RWMutex
}

// NewVoiceHub creates a new voice hub
func NewVoiceHub() *VoiceHub {
	return &VoiceHub{
		clients:    make(map[int64]*VoiceClient),
		channels:   make(map[int64]*VoiceChannel),
		register:   make(chan *VoiceClient, 100),
		unregister: make(chan *VoiceClient, 100),
		messages:   make(chan *VoiceMessage, 1000),
	}
}

// Run starts the voice hub
func (h *VoiceHub) Run() {
	log.Printf("Voice hub started")
	for {
		select {
		case client := <-h.register:
			log.Printf("Voice hub: processing register for user %d", client.ID)
			h.handleRegister(client)
		case client := <-h.unregister:
			log.Printf("Voice hub: processing unregister for user %d", client.ID)
			h.handleUnregister(client)
		case message := <-h.messages:
			log.Printf("Voice hub: processing message type=%s from user=%d", message.Type, message.UserID)
			h.handleMessage(message)
		}
	}
}

// HandleWebSocket handles WebSocket connections for voice
func (h *VoiceHub) HandleWebSocket(c *gin.Context) {
	log.Printf("Voice WebSocket connection attempt from %s", c.Request.RemoteAddr)

	// Extract user info from JWT token
	userID := c.GetInt("user_id")
	username := c.GetString("username")

	log.Printf("Voice WebSocket auth - UserID: %d, Username: %s", userID, username)

	if userID == 0 {
		log.Printf("Voice WebSocket unauthorized - no user ID")
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// Upgrade to WebSocket
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("Failed to upgrade voice WebSocket: %v", err)
		return
	}

	log.Printf("Voice WebSocket upgraded successfully for user %d", userID)

	// Create voice client
	client := &VoiceClient{
		ID:         int64(userID),
		Username:   username,
		conn:       conn,
		send:       make(chan []byte, 256),
		lastSeen:   time.Now(),
		hub:        h,
		isMuted:    false,
		isDeafened: false,
		isSpeaking: false,
	}

	// Register client
	log.Printf("Attempting to register voice client for user %d", userID)
	select {
	case h.register <- client:
		log.Printf("Successfully sent register message for user %d", userID)
	default:
		log.Printf("ERROR: Register channel full for user %d", userID)
	}

	// Start client goroutines
	go client.readPump()
	go client.writePump()
}

// handleRegister registers a new voice client
func (h *VoiceHub) handleRegister(client *VoiceClient) {
	// Check for an existing client outside the lock to avoid deadlock
	h.mutex.Lock()
	existing := h.clients[client.ID]
	h.mutex.Unlock()

	if existing != nil {
		log.Printf("Replacing existing voice client for user %d", client.ID)
		// Send unregister message to avoid deadlock
		select {
		case h.unregister <- existing:
		default:
			log.Printf("Warning: unregister channel full for user %d", client.ID)
		}
	}

	h.mutex.Lock()
	h.clients[client.ID] = client
	h.mutex.Unlock()
	log.Printf("Voice client registered: user %d (%s)", client.ID, client.Username)

	// Send welcome message
	client.sendMessage(&VoiceMessage{
		Type:      "connected",
		UserID:    client.ID,
		Username:  client.Username,
		Timestamp: time.Now(),
	})
}

// handleUnregister unregisters a voice client
func (h *VoiceHub) handleUnregister(client *VoiceClient) {
	h.mutex.Lock()
	if client.closed {
		h.mutex.Unlock()
		return
	}
	client.closed = true

	// Remove from clients
	delete(h.clients, client.ID)

	// Get channel info before releasing hub lock
	var channel *VoiceChannel
	var channelExists bool
	if client.channelID != 0 {
		channel, channelExists = h.channels[client.channelID]
	}
	h.mutex.Unlock()

	// Handle channel operations outside of hub lock to prevent deadlock
	if channelExists && channel != nil {
		channel.mutex.Lock()
		delete(channel.Clients, client.ID)
		clientCount := len(channel.Clients)
		channel.mutex.Unlock()

		// Notify other clients in channel
		h.broadcastToChannel(client.channelID, &VoiceMessage{
			Type:      "user-left",
			ChannelID: client.channelID,
			UserID:    client.ID,
			Username:  client.Username,
			Timestamp: time.Now(),
		}, client.ID)

		// Remove empty channels
		if clientCount == 0 {
			h.mutex.Lock()
			delete(h.channels, client.channelID)
			h.mutex.Unlock()
			log.Printf("Removed empty voice channel %d", client.channelID)
		}
	}

	// Close connection
	close(client.send)
	if err := client.conn.Close(); err != nil {
		log.Printf("Error closing voice client connection: %v", err)
	}

	log.Printf("Voice client unregistered: user %d (%s)", client.ID, client.Username)
}

// handleMessage handles incoming voice messages
func (h *VoiceHub) handleMessage(message *VoiceMessage) {
	log.Printf("Processing voice message: type=%s, user=%d, channel=%d", message.Type, message.UserID, message.ChannelID)

	switch message.Type {
	case "join-channel":
		log.Printf("Handling join-channel for user %d, channel %d", message.UserID, message.ChannelID)
		h.handleJoinChannel(message)
	case "leave-channel":
		log.Printf("Handling leave-channel for user %d, channel %d", message.UserID, message.ChannelID)
		h.handleLeaveChannel(message)
	case "offer", "answer", "ice-candidate":
		h.relayToTarget(message)
	case "mute", "unmute", "deafen", "undeafen":
		h.handleVoiceStateChange(message)
	case "speaking":
		h.handleSpeaking(message)
	case "ping":
		h.handlePing(message)
	case "pong":
		// Handle pong response (no action needed, just acknowledge)
		break
	default:
		log.Printf("Unknown voice message type: %s", message.Type)
	}
}

// handleJoinChannel handles joining a voice channel
func (h *VoiceHub) handleJoinChannel(message *VoiceMessage) {
	log.Printf("handleJoinChannel: Starting for user %d, channel %d", message.UserID, message.ChannelID)

	// Get client without locking the hub mutex
	h.mutex.RLock()
	client, exists := h.clients[message.UserID]
	h.mutex.RUnlock()

	if !exists {
		log.Printf("handleJoinChannel: ERROR - Client %d not found in hub", message.UserID)
		return
	}

	log.Printf("handleJoinChannel: Found client %d, proceeding with join", message.UserID)

	// Leave current channel if any (without hub mutex lock)
	if client.channelID != 0 {
		log.Printf("handleJoinChannel: User %d leaving current channel %d", message.UserID, client.channelID)
		h.handleLeaveChannelDirectly(client)
	}

	// Get or create channel
	h.mutex.Lock()
	channel, exists := h.channels[message.ChannelID]
	if !exists {
		channel = &VoiceChannel{
			ID:       message.ChannelID,
			ServerID: message.ServerID,
			Name:     fmt.Sprintf("Voice Channel %d", message.ChannelID),
			Clients:  make(map[int64]*VoiceClient),
		}
		h.channels[message.ChannelID] = channel
		log.Printf("Created voice channel %d", message.ChannelID)
	}
	h.mutex.Unlock()

	// Add client to channel
	channel.mutex.Lock()
	channel.Clients[client.ID] = client
	channel.mutex.Unlock()

	// Update client
	client.mutex.Lock()
	client.channelID = message.ChannelID
	client.serverID = message.ServerID
	client.mutex.Unlock()

	// Notify other clients in channel
	h.broadcastToChannel(message.ChannelID, &VoiceMessage{
		Type:      "user-joined",
		ChannelID: message.ChannelID,
		UserID:    message.UserID,
		Username:  message.Username,
		Timestamp: time.Now(),
	}, message.UserID)

	// Send channel info to joining client
	channelJoinedMessage := &VoiceMessage{
		Type:      "channel-joined",
		ChannelID: message.ChannelID,
		UserID:    message.UserID,
		Username:  message.Username,
		Data: gin.H{
			"channel_id":   message.ChannelID,
			"server_id":    message.ServerID,
			"channel_name": channel.Name,
			"clients":      h.getChannelClients(message.ChannelID),
		},
		Timestamp: time.Now(),
	}

	log.Printf("Sending channel-joined message to user %d: %+v", message.UserID, channelJoinedMessage)
	client.sendMessage(channelJoinedMessage)

	log.Printf("User %d joined voice channel %d", message.UserID, message.ChannelID)
}

// handleLeaveChannelDirectly handles leaving a channel without using the message channel (to avoid deadlocks)
func (h *VoiceHub) handleLeaveChannelDirectly(client *VoiceClient) {
	if client.channelID == 0 {
		return
	}

	// Lock hub mutex to access channels
	h.mutex.Lock()
	channel, exists := h.channels[client.channelID]
	h.mutex.Unlock()

	if !exists {
		return
	}

	// Remove client from channel
	channel.mutex.Lock()
	delete(channel.Clients, client.ID)
	channel.mutex.Unlock()

	// Notify other clients in channel
	h.broadcastToChannel(client.channelID, &VoiceMessage{
		Type:      "user-left",
		ChannelID: client.channelID,
		UserID:    client.ID,
		Username:  client.Username,
		Timestamp: time.Now(),
	}, client.ID)

	// Remove empty channels
	if len(channel.Clients) == 0 {
		delete(h.channels, client.channelID)
		log.Printf("Removed empty voice channel %d", client.channelID)
	}

	// Clear client's channel info
	client.mutex.Lock()
	client.channelID = 0
	client.serverID = 0
	client.mutex.Unlock()

	log.Printf("User %d left voice channel %d", client.ID, client.channelID)
}

// handleLeaveChannel handles leaving a voice channel
func (h *VoiceHub) handleLeaveChannel(message *VoiceMessage) {
	h.mutex.Lock()
	defer h.mutex.Unlock()

	client, exists := h.clients[message.UserID]
	if !exists {
		return
	}

	if client.channelID == 0 {
		return
	}

	channel, exists := h.channels[client.channelID]
	if !exists {
		return
	}

	// Remove from channel
	channel.mutex.Lock()
	delete(channel.Clients, client.ID)
	clientCount := len(channel.Clients)
	channel.mutex.Unlock()

	// Update client
	client.mutex.Lock()
	client.channelID = 0
	client.serverID = 0
	client.mutex.Unlock()

	// Notify other clients
	h.broadcastToChannel(message.ChannelID, &VoiceMessage{
		Type:      "user-left",
		ChannelID: message.ChannelID,
		UserID:    message.UserID,
		Username:  message.Username,
		Timestamp: time.Now(),
	}, message.UserID)

	// Remove empty channels
	if clientCount == 0 {
		delete(h.channels, message.ChannelID)
		log.Printf("Removed empty voice channel %d", message.ChannelID)
	}

	log.Printf("User %d left voice channel %d", message.UserID, message.ChannelID)
}

// handleVoiceStateChange handles mute/deafen state changes
func (h *VoiceHub) handleVoiceStateChange(message *VoiceMessage) {
	h.mutex.RLock()
	client, exists := h.clients[message.UserID]
	h.mutex.RUnlock()

	if !exists {
		return
	}

	client.mutex.Lock()
	switch message.Type {
	case "mute":
		client.isMuted = true
	case "unmute":
		client.isMuted = false
	case "deafen":
		client.isDeafened = true
	case "undeafen":
		client.isDeafened = false
	}
	client.mutex.Unlock()

	// Broadcast state change to channel
	if client.channelID != 0 {
		h.broadcastToChannel(client.channelID, message, message.UserID)
	}

	log.Printf("User %d %s", message.UserID, message.Type)
}

// handleSpeaking handles speaking state changes
func (h *VoiceHub) handleSpeaking(message *VoiceMessage) {
	h.mutex.RLock()
	client, exists := h.clients[message.UserID]
	h.mutex.RUnlock()

	if !exists {
		return
	}

	client.mutex.Lock()
	client.isSpeaking = message.Data.(bool)
	client.mutex.Unlock()

	// Broadcast speaking state to channel
	if client.channelID != 0 {
		h.broadcastToChannel(client.channelID, message, message.UserID)
	}
}

// handlePing handles ping messages for connection health
func (h *VoiceHub) handlePing(message *VoiceMessage) {
	h.mutex.RLock()
	client, exists := h.clients[message.UserID]
	h.mutex.RUnlock()

	if !exists {
		return
	}

	client.mutex.Lock()
	client.lastSeen = time.Now()
	channelID := client.channelID
	serverID := client.serverID
	client.mutex.Unlock()

	// Send pong response
	client.sendMessage(&VoiceMessage{
		Type:      "pong",
		ChannelID: channelID,
		ServerID:  serverID,
		UserID:    message.UserID,
		Username:  client.Username,
		Timestamp: time.Now(),
	})
}

// relayToTarget relays WebRTC signaling messages to specific targets
func (h *VoiceHub) relayToTarget(message *VoiceMessage) {
	if message.TargetID == nil {
		log.Printf("WebRTC message missing target_id: %s", message.Type)
		return
	}

	h.mutex.RLock()
	targetClient, exists := h.clients[*message.TargetID]
	h.mutex.RUnlock()

	if !exists {
		log.Printf("WebRTC target client %d not found for %s message", *message.TargetID, message.Type)
		return
	}

	log.Printf("Relaying %s message from user %d to user %d", message.Type, message.UserID, *message.TargetID)
	targetClient.sendMessage(message)
}

// broadcastToChannel broadcasts a message to all clients in a channel
func (h *VoiceHub) broadcastToChannel(channelID int64, message *VoiceMessage, excludeUserID int64) {
	h.mutex.RLock()
	channel, exists := h.channels[channelID]
	h.mutex.RUnlock()

	if !exists {
		return
	}

	channel.mutex.RLock()
	defer channel.mutex.RUnlock()

	for userID, client := range channel.Clients {
		if userID == excludeUserID {
			continue
		}
		client.sendMessage(message)
	}
}

// getChannelClients returns client info for a channel
func (h *VoiceHub) getChannelClients(channelID int64) []gin.H {
	h.mutex.RLock()
	channel, exists := h.channels[channelID]
	h.mutex.RUnlock()

	if !exists {
		return []gin.H{}
	}

	channel.mutex.RLock()
	defer channel.mutex.RUnlock()

	clients := make([]gin.H, 0, len(channel.Clients))
	for userID, client := range channel.Clients {
		client.mutex.RLock()
		clients = append(clients, gin.H{
			"user_id":     userID,
			"username":    client.Username,
			"is_muted":    client.isMuted,
			"is_deafened": client.isDeafened,
			"is_speaking": client.isSpeaking,
		})
		client.mutex.RUnlock()
	}

	return clients
}

// readPump reads messages from the WebSocket connection
func (c *VoiceClient) readPump() {
	defer func() {
		c.hub.unregister <- c
	}()

	for {
		_, messageBytes, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("Voice client read error: %v", err)
			}
			break
		}

		log.Printf("Voice client %d received message: %s", c.ID, string(messageBytes))

		var message VoiceMessage
		if err := json.Unmarshal(messageBytes, &message); err != nil {
			log.Printf("Failed to unmarshal voice message: %v", err)
			continue
		}

		// Set message metadata
		message.UserID = c.ID
		message.Username = c.Username
		message.Timestamp = time.Now()

		log.Printf("Voice client %d sending message to hub: type=%s, channel=%d", c.ID, message.Type, message.ChannelID)

		// Send to hub for processing
		select {
		case c.hub.messages <- &message:
			log.Printf("Voice client %d: message sent to hub successfully", c.ID)
		default:
			log.Printf("ERROR: Voice client %d: hub messages channel full", c.ID)
		}
	}
}

// writePump writes messages to the WebSocket connection
func (c *VoiceClient) writePump() {
	ticker := time.NewTicker(30 * time.Second) // Send ping every 30 seconds
	defer func() {
		ticker.Stop()
		c.hub.unregister <- c
	}()

	for {
		select {
		case message, ok := <-c.send:
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			if err := c.conn.WriteMessage(websocket.TextMessage, message); err != nil {
				log.Printf("Voice client write error: %v", err)
				return
			}
		case <-ticker.C:
			// Send ping to keep connection alive
			c.mutex.RLock()
			channelID := c.channelID
			c.mutex.RUnlock()

			pingMessage := &VoiceMessage{
				Type:      "ping",
				ChannelID: channelID,
				ServerID:  c.serverID,
				UserID:    c.ID,
				Username:  c.Username,
				Timestamp: time.Now(),
			}
			c.sendMessage(pingMessage)
		}
	}
}

// sendMessage sends a message to this client
func (c *VoiceClient) sendMessage(message *VoiceMessage) {
	messageBytes, err := json.Marshal(message)
	if err != nil {
		log.Printf("Failed to marshal voice message: %v", err)
		return
	}

	log.Printf("Sending message to voice client %d: type=%s, data=%s", c.ID, message.Type, string(messageBytes))

	select {
	case c.send <- messageBytes:
		log.Printf("Message queued for voice client %d: type=%s", c.ID, message.Type)
	default:
		log.Printf("Voice client send buffer full for user %d", c.ID)
	}
}

// GetVoiceStats returns voice statistics
func (h *VoiceHub) GetVoiceStats() gin.H {
	h.mutex.RLock()
	defer h.mutex.RUnlock()

	stats := gin.H{
		"total_clients":  len(h.clients),
		"total_channels": len(h.channels),
		"channels":       make([]gin.H, 0, len(h.channels)),
	}

	for channelID, channel := range h.channels {
		channel.mutex.RLock()
		channelStats := gin.H{
			"channel_id":   channelID,
			"server_id":    channel.ServerID,
			"name":         channel.Name,
			"client_count": len(channel.Clients),
			"clients":      make([]gin.H, 0, len(channel.Clients)),
		}

		for userID, client := range channel.Clients {
			client.mutex.RLock()
			channelStats["clients"] = append(channelStats["clients"].([]gin.H), gin.H{
				"user_id":     userID,
				"username":    client.Username,
				"is_muted":    client.isMuted,
				"is_deafened": client.isDeafened,
				"is_speaking": client.isSpeaking,
				"last_seen":   client.lastSeen,
			})
			client.mutex.RUnlock()
		}
		channel.mutex.RUnlock()

		stats["channels"] = append(stats["channels"].([]gin.H), channelStats)
	}

	return stats
}
