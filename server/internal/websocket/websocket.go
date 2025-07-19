package websocket

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for development
	},
}

// Message types
const (
	MessageTypeText     = "text"
	MessageTypeJoin     = "join"
	MessageTypeLeave    = "leave"
	MessageTypeTyping   = "typing"
	MessageTypeStopTyping = "stop_typing"
)

// Message represents a WebSocket message
type Message struct {
	Type      string      `json:"type"`
	ChannelID int         `json:"channel_id,omitempty"`
	Content   string      `json:"content,omitempty"`
	UserID    int         `json:"user_id,omitempty"`
	Username  string      `json:"username,omitempty"`
	Timestamp time.Time   `json:"timestamp,omitempty"`
	Data      interface{} `json:"data,omitempty"`
}

// Hub manages all WebSocket connections
type Hub struct {
	clients    map[*Client]bool
	broadcast  chan *Message
	register   chan *Client
	unregister chan *Client
	mutex      sync.RWMutex
}

// Client represents a WebSocket client connection
type Client struct {
	hub      *Hub
	conn     *websocket.Conn
	send     chan []byte
	userID   int
	username string
	channels map[int]bool // channels the user is subscribed to
	mutex    sync.RWMutex
}

func NewHub() *Hub {
	return &Hub{
		clients:    make(map[*Client]bool),
		broadcast:  make(chan *Message),
		register:   make(chan *Client),
		unregister: make(chan *Client),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mutex.Lock()
			h.clients[client] = true
			h.mutex.Unlock()
			log.Printf("Client registered: %s (ID: %d)", client.username, client.userID)

		case client := <-h.unregister:
			h.mutex.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
			}
			h.mutex.Unlock()
			log.Printf("Client unregistered: %s (ID: %d)", client.username, client.userID)

		case message := <-h.broadcast:
			h.mutex.RLock()
			for client := range h.clients {
				// Check if client is subscribed to the channel
				client.mutex.RLock()
				if client.channels[message.ChannelID] {
					select {
					case client.send <- messageToBytes(message):
					default:
						close(client.send)
						delete(h.clients, client)
					}
				}
				client.mutex.RUnlock()
			}
			h.mutex.RUnlock()
		}
	}
}

func NewClient(conn *websocket.Conn, hub *Hub, userID int, username string) *Client {
	return &Client{
		hub:      hub,
		conn:     conn,
		send:     make(chan []byte, 256),
		userID:   userID,
		username: username,
		channels: make(map[int]bool),
	}
}

func (c *Client) Start() {
	// Register client with hub
	c.hub.register <- c

	// Start goroutines for reading and writing
	go c.readPump()
	go c.writePump()
}

func (c *Client) readPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()

	c.conn.SetReadLimit(512) // 512 bytes max message size
	c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		_, messageBytes, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket read error: %v", err)
			}
			break
		}

		// Parse message
		var message Message
		if err := json.Unmarshal(messageBytes, &message); err != nil {
			log.Printf("Failed to parse message: %v", err)
			continue
		}

		// Add user info to message
		message.UserID = c.userID
		message.Username = c.username
		message.Timestamp = time.Now()

		// Handle different message types
		switch message.Type {
		case MessageTypeJoin:
			c.handleJoinChannel(message.ChannelID)
		case MessageTypeLeave:
			c.handleLeaveChannel(message.ChannelID)
		case MessageTypeText:
			c.handleTextMessage(&message)
		case MessageTypeTyping:
			c.handleTyping(message.ChannelID, true)
		case MessageTypeStopTyping:
			c.handleTyping(message.ChannelID, false)
		default:
			log.Printf("Unknown message type: %s", message.Type)
		}
	}
}

func (c *Client) writePump() {
	ticker := time.NewTicker(54 * time.Second)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			if err := w.Close(); err != nil {
				return
			}
		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func (c *Client) handleJoinChannel(channelID int) {
	c.mutex.Lock()
	c.channels[channelID] = true
	c.mutex.Unlock()

	// Send join notification
	message := &Message{
		Type:      MessageTypeJoin,
		ChannelID: channelID,
		UserID:    c.userID,
		Username:  c.username,
		Timestamp: time.Now(),
	}

	c.hub.broadcast <- message
	log.Printf("User %s joined channel %d", c.username, channelID)
}

func (c *Client) handleLeaveChannel(channelID int) {
	c.mutex.Lock()
	delete(c.channels, channelID)
	c.mutex.Unlock()

	// Send leave notification
	message := &Message{
		Type:      MessageTypeLeave,
		ChannelID: channelID,
		UserID:    c.userID,
		Username:  c.username,
		Timestamp: time.Now(),
	}

	c.hub.broadcast <- message
	log.Printf("User %s left channel %d", c.username, channelID)
}

func (c *Client) handleTextMessage(message *Message) {
	// Broadcast text message to channel
	c.hub.broadcast <- message
	log.Printf("Message from %s in channel %d: %s", c.username, message.ChannelID, message.Content)
}

func (c *Client) handleTyping(channelID int, isTyping bool) {
	messageType := MessageTypeStopTyping
	if isTyping {
		messageType = MessageTypeTyping
	}

	message := &Message{
		Type:      messageType,
		ChannelID: channelID,
		UserID:    c.userID,
		Username:  c.username,
		Timestamp: time.Now(),
	}

	c.hub.broadcast <- message
}

func (c *Client) SubscribeToChannel(channelID int) {
	c.mutex.Lock()
	c.channels[channelID] = true
	c.mutex.Unlock()
}

func (c *Client) UnsubscribeFromChannel(channelID int) {
	c.mutex.Lock()
	delete(c.channels, channelID)
	c.mutex.Unlock()
}

func messageToBytes(message *Message) []byte {
	bytes, err := json.Marshal(message)
	if err != nil {
		log.Printf("Failed to marshal message: %v", err)
		return nil
	}
	return bytes
}

// Upgrade upgrades an HTTP connection to WebSocket
func Upgrade(w http.ResponseWriter, r *http.Request) (*websocket.Conn, error) {
	return upgrader.Upgrade(w, r, nil)
}

// BroadcastMessage sends a message to all clients subscribed to a channel
func (h *Hub) BroadcastMessage(message *Message) {
	h.broadcast <- message
} 