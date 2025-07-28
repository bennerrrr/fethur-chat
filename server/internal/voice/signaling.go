package voice

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

type SignalingMessage struct {
	Type     string      `json:"type"`
	RoomID   int64       `json:"room_id"`
	UserID   int64       `json:"user_id"`
	TargetID *int64      `json:"target_id,omitempty"`
	Data     interface{} `json:"data,omitempty"`
}

type VoiceHub struct {
	clients    map[*VoiceClient]bool
	rooms      map[int64]*VoiceRoom
	register   chan *VoiceClient
	unregister chan *VoiceClient
	signal     chan *SignalingMessage
	mutex      sync.RWMutex
}

type VoiceRoom struct {
	ID      int64
	Clients map[*VoiceClient]bool
	mutex   sync.RWMutex
}

type VoiceClient struct {
	hub    *VoiceHub
	conn   *websocket.Conn
	send   chan []byte
	userID int64
	roomID int64
	mutex  sync.RWMutex
}

func NewVoiceHub() *VoiceHub {
	return &VoiceHub{
		clients:    make(map[*VoiceClient]bool),
		rooms:      make(map[int64]*VoiceRoom),
		register:   make(chan *VoiceClient),
		unregister: make(chan *VoiceClient),
		signal:     make(chan *SignalingMessage),
	}
}

func (h *VoiceHub) Run() {
	//nolint:staticcheck // This is the correct pattern for a WebSocket hub with multiple channels
	for {
		select {
		case client := <-h.register:
			h.mutex.Lock()
			h.clients[client] = true
			h.mutex.Unlock()
			log.Printf("Voice client connected: user %d", client.userID)

		case client := <-h.unregister:
			h.mutex.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
				h.removeClientFromRoom(client)
			}
			h.mutex.Unlock()

		case message := <-h.signal:
			h.handleSignaling(message)
		}
	}
}

func (h *VoiceHub) HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}

	userID := int64(1) // TODO: Extract from JWT

	client := &VoiceClient{
		hub:    h,
		conn:   conn,
		send:   make(chan []byte, 256),
		userID: userID,
	}

	h.register <- client
	go client.writePump()
	go client.readPump()
}

func (h *VoiceHub) handleSignaling(message *SignalingMessage) {
	switch message.Type {
	case "join-room":
		h.handleJoinRoom(message)
	case "leave-room":
		h.handleLeaveRoom(message)
	case "offer", "answer", "ice-candidate":
		h.relayToTarget(message)
	}
}

func (h *VoiceHub) handleJoinRoom(message *SignalingMessage) {
	h.mutex.Lock()
	defer h.mutex.Unlock()

	roomID := message.RoomID
	userID := message.UserID

	var client *VoiceClient
	for c := range h.clients {
		if c.userID == userID {
			client = c
			break
		}
	}

	if client == nil {
		return
	}

	room, exists := h.rooms[roomID]
	if !exists {
		room = &VoiceRoom{
			ID:      roomID,
			Clients: make(map[*VoiceClient]bool),
		}
		h.rooms[roomID] = room
	}

	h.removeClientFromRoom(client)

	room.mutex.Lock()
	room.Clients[client] = true
	room.mutex.Unlock()

	client.mutex.Lock()
	client.roomID = roomID
	client.mutex.Unlock()

	h.broadcastToRoom(roomID, &SignalingMessage{
		Type:   "user-joined",
		RoomID: roomID,
		UserID: userID,
	}, client)
}

func (h *VoiceHub) handleLeaveRoom(message *SignalingMessage) {
	h.mutex.Lock()
	defer h.mutex.Unlock()

	userID := message.UserID
	var client *VoiceClient
	for c := range h.clients {
		if c.userID == userID {
			client = c
			break
		}
	}

	if client != nil {
		h.removeClientFromRoom(client)
	}
}

func (h *VoiceHub) removeClientFromRoom(client *VoiceClient) {
	client.mutex.RLock()
	roomID := client.roomID
	client.mutex.RUnlock()

	if roomID == 0 {
		return
	}

	room, exists := h.rooms[roomID]
	if !exists {
		return
	}

	room.mutex.Lock()
	delete(room.Clients, client)
	clientCount := len(room.Clients)
	room.mutex.Unlock()

	h.broadcastToRoom(roomID, &SignalingMessage{
		Type:   "user-left",
		RoomID: roomID,
		UserID: client.userID,
	}, nil)

	client.mutex.Lock()
	client.roomID = 0
	client.mutex.Unlock()

	if clientCount == 0 {
		delete(h.rooms, roomID)
	}
}

func (h *VoiceHub) relayToTarget(message *SignalingMessage) {
	if message.TargetID == nil {
		return
	}

	targetID := *message.TargetID
	h.mutex.RLock()
	defer h.mutex.RUnlock()

	for client := range h.clients {
		if client.userID == targetID {
			select {
			case client.send <- messageToBytes(message):
			default:
				close(client.send)
				delete(h.clients, client)
			}
			return
		}
	}
}

func (h *VoiceHub) broadcastToRoom(roomID int64, message *SignalingMessage, exclude *VoiceClient) {
	room, exists := h.rooms[roomID]
	if !exists {
		return
	}

	room.mutex.RLock()
	defer room.mutex.RUnlock()

	data := messageToBytes(message)
	for client := range room.Clients {
		if client == exclude {
			continue
		}

		select {
		case client.send <- data:
		default:
			close(client.send)
			delete(room.Clients, client)
		}
	}
}

func (c *VoiceClient) readPump() {
	defer func() {
		c.hub.unregister <- c
		if err := c.conn.Close(); err != nil {
			log.Printf("Error closing voice client connection: %v", err)
		}
	}()

	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			break
		}

		var signalingMsg SignalingMessage
		if err := json.Unmarshal(message, &signalingMsg); err != nil {
			continue
		}

		signalingMsg.UserID = c.userID
		c.hub.signal <- &signalingMsg
	}
}

func (c *VoiceClient) writePump() {
	defer func() {
		if err := c.conn.Close(); err != nil {
			log.Printf("Error closing voice client connection: %v", err)
		}
	}()

	for {
		select {
		case message, ok := <-c.send:
			if !ok {
				if err := c.conn.WriteMessage(websocket.CloseMessage, []byte{}); err != nil {
					log.Printf("Error writing close message: %v", err)
				}
				return
			}
			if err := c.conn.WriteMessage(websocket.TextMessage, message); err != nil {
				log.Printf("Error writing message: %v", err)
				return
			}
		}
	}
}

func messageToBytes(message *SignalingMessage) []byte {
	data, err := json.Marshal(message)
	if err != nil {
		return []byte("{}")
	}
	return data
}
