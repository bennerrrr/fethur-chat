package plugins

import (
	"context"
	"time"
)

// Plugin represents the base interface that all plugins must implement
type Plugin interface {
	// Name returns the unique name of the plugin
	Name() string
	
	// Version returns the version of the plugin
	Version() string
	
	// Initialize initializes the plugin with the given context and config
	Initialize(ctx context.Context, config PluginConfig) error
	
	// Shutdown gracefully shuts down the plugin
	Shutdown(ctx context.Context) error
	
	// Health returns the health status of the plugin
	Health() PluginHealth
}

// MessageProcessor interface for plugins that process messages
type MessageProcessor interface {
	Plugin
	
	// ProcessMessage processes an incoming message and returns the modified message
	ProcessMessage(ctx context.Context, msg *Message) (*Message, error)
	
	// Priority returns the execution priority (lower numbers execute first)
	Priority() int
}

// CommandHandler interface for plugins that handle slash commands
type CommandHandler interface {
	Plugin
	
	// HandleCommand handles a command and returns a response
	HandleCommand(ctx context.Context, cmd *Command) (*Response, error)
	
	// Commands returns the list of commands this plugin handles
	Commands() []CommandDefinition
}

// EventListener interface for plugins that listen to events
type EventListener interface {
	Plugin
	
	// HandleEvent handles an event
	HandleEvent(ctx context.Context, event Event) error
	
	// EventTypes returns the list of event types this plugin listens to
	EventTypes() []EventType
}

// APIExtension interface for plugins that add HTTP endpoints
type APIExtension interface {
	Plugin
	
	// BasePath returns the base path for the extension's routes
	BasePath() string
	
	// RegisterRoutes registers the extension's routes with the given router
	RegisterRoutes(router Router) error
}

// Bot interface extends Plugin with bot-specific capabilities
type Bot interface {
	Plugin
	MessageProcessor
	CommandHandler
	EventListener
	
	// GetInfo returns bot information
	GetInfo() BotInfo
	
	// HandleDirectMessage handles a direct message to the bot
	HandleDirectMessage(ctx context.Context, msg *DirectMessage) error
}

// Permission represents a permission that a plugin can request
type Permission string

const (
	PermissionReadMessages   Permission = "messages:read"
	PermissionWriteMessages  Permission = "messages:write"
	PermissionManageChannels Permission = "channels:manage"
	PermissionAccessDB       Permission = "database:access"
	PermissionNetworkAccess  Permission = "network:access"
	PermissionFileSystem     Permission = "filesystem:access"
	PermissionUserData       Permission = "user:data"
	PermissionServerManage   Permission = "server:manage"
)

// PluginManifest contains metadata about a plugin
type PluginManifest struct {
	Name         string       `json:"name" yaml:"name"`
	Version      string       `json:"version" yaml:"version"`
	Description  string       `json:"description" yaml:"description"`
	Author       string       `json:"author" yaml:"author"`
	License      string       `json:"license" yaml:"license"`
	Permissions  []Permission `json:"permissions" yaml:"permissions"`
	Dependencies []string     `json:"dependencies" yaml:"dependencies"`
	EntryPoint   string       `json:"entry_point" yaml:"entry_point"`
	Resources    ResourceLimits `json:"resources" yaml:"resources"`
	Commands     []CommandDefinition `json:"commands" yaml:"commands"`
	Events       []EventType  `json:"events" yaml:"events"`
}

// ResourceLimits defines resource constraints for a plugin
type ResourceLimits struct {
	MaxMemoryMB      int           `json:"max_memory_mb" yaml:"max_memory_mb"`
	MaxCPUPercent    float64       `json:"max_cpu_percent" yaml:"max_cpu_percent"`
	MaxExecutionTime time.Duration `json:"max_execution_time" yaml:"max_execution_time"`
	MaxGoroutines    int           `json:"max_goroutines" yaml:"max_goroutines"`
	MaxConnections   int           `json:"max_connections" yaml:"max_connections"`
}

// PluginConfig contains configuration passed to plugins during initialization
type PluginConfig struct {
	ServerID    string                 `json:"server_id"`
	Data        map[string]interface{} `json:"data"`
	Permissions []Permission           `json:"permissions"`
	Logger      Logger                 `json:"-"`
	Database    Database               `json:"-"`
}

// PluginHealth represents the health status of a plugin
type PluginHealth struct {
	Status  HealthStatus `json:"status"`
	Message string       `json:"message"`
	Details map[string]interface{} `json:"details,omitempty"`
}

// HealthStatus represents plugin health status
type HealthStatus string

const (
	HealthStatusHealthy   HealthStatus = "healthy"
	HealthStatusDegraded  HealthStatus = "degraded"
	HealthStatusUnhealthy HealthStatus = "unhealthy"
	HealthStatusUnknown   HealthStatus = "unknown"
)

// Message represents a chat message
type Message struct {
	ID        string    `json:"id"`
	Content   string    `json:"content"`
	UserID    string    `json:"user_id"`
	Username  string    `json:"username"`
	ChannelID string    `json:"channel_id"`
	ServerID  string    `json:"server_id"`
	Timestamp time.Time `json:"timestamp"`
	Edited    bool      `json:"edited"`
	Type      MessageType `json:"type"`
	Metadata  map[string]interface{} `json:"metadata,omitempty"`
}

// MessageType represents the type of message
type MessageType string

const (
	MessageTypeText    MessageType = "text"
	MessageTypeSystem  MessageType = "system"
	MessageTypeCommand MessageType = "command"
)

// Command represents a slash command
type Command struct {
	Name      string            `json:"name"`
	Args      []string          `json:"args"`
	Options   map[string]string `json:"options"`
	UserID    string            `json:"user_id"`
	Username  string            `json:"username"`
	ChannelID string            `json:"channel_id"`
	ServerID  string            `json:"server_id"`
	Timestamp time.Time         `json:"timestamp"`
}

// CommandDefinition defines a command that a plugin can handle
type CommandDefinition struct {
	Name        string                    `json:"name" yaml:"name"`
	Description string                    `json:"description" yaml:"description"`
	Usage       string                    `json:"usage" yaml:"usage"`
	Options     []CommandOption           `json:"options" yaml:"options"`
	Permissions []Permission              `json:"permissions" yaml:"permissions"`
}

// CommandOption defines an option for a command
type CommandOption struct {
	Name        string      `json:"name" yaml:"name"`
	Description string      `json:"description" yaml:"description"`
	Type        OptionType  `json:"type" yaml:"type"`
	Required    bool        `json:"required" yaml:"required"`
	Default     interface{} `json:"default" yaml:"default"`
}

// OptionType represents the type of a command option
type OptionType string

const (
	OptionTypeString  OptionType = "string"
	OptionTypeInteger OptionType = "integer"
	OptionTypeBoolean OptionType = "boolean"
	OptionTypeUser    OptionType = "user"
	OptionTypeChannel OptionType = "channel"
)

// Response represents a plugin's response to a command
type Response struct {
	Content   string                 `json:"content"`
	Type      ResponseType           `json:"type"`
	Ephemeral bool                   `json:"ephemeral"`
	Embeds    []Embed                `json:"embeds,omitempty"`
	Metadata  map[string]interface{} `json:"metadata,omitempty"`
}

// ResponseType represents the type of response
type ResponseType string

const (
	ResponseTypeMessage ResponseType = "message"
	ResponseTypeEmbed   ResponseType = "embed"
	ResponseTypeError   ResponseType = "error"
)

// Embed represents a rich embed in a response
type Embed struct {
	Title       string      `json:"title,omitempty"`
	Description string      `json:"description,omitempty"`
	Color       int         `json:"color,omitempty"`
	Fields      []EmbedField `json:"fields,omitempty"`
	Footer      *EmbedFooter `json:"footer,omitempty"`
	Timestamp   *time.Time  `json:"timestamp,omitempty"`
}

// EmbedField represents a field in an embed
type EmbedField struct {
	Name   string `json:"name"`
	Value  string `json:"value"`
	Inline bool   `json:"inline"`
}

// EmbedFooter represents a footer in an embed
type EmbedFooter struct {
	Text string `json:"text"`
}

// Event represents a system event
type Event struct {
	Type      EventType              `json:"type"`
	Data      map[string]interface{} `json:"data"`
	UserID    string                 `json:"user_id,omitempty"`
	ChannelID string                 `json:"channel_id,omitempty"`
	ServerID  string                 `json:"server_id,omitempty"`
	Timestamp time.Time              `json:"timestamp"`
}

// EventType represents the type of event
type EventType string

const (
	EventMessageCreate EventType = "message.create"
	EventMessageUpdate EventType = "message.update"
	EventMessageDelete EventType = "message.delete"
	EventUserJoin      EventType = "user.join"
	EventUserLeave     EventType = "user.leave"
	EventChannelCreate EventType = "channel.create"
	EventChannelUpdate EventType = "channel.update"
	EventChannelDelete EventType = "channel.delete"
	EventServerUpdate  EventType = "server.update"
)

// DirectMessage represents a direct message to a bot
type DirectMessage struct {
	ID        string    `json:"id"`
	Content   string    `json:"content"`
	UserID    string    `json:"user_id"`
	Username  string    `json:"username"`
	BotID     string    `json:"bot_id"`
	Timestamp time.Time `json:"timestamp"`
}

// BotInfo contains information about a bot
type BotInfo struct {
	Name        string              `json:"name"`
	Description string              `json:"description"`
	Version     string              `json:"version"`
	Author      string              `json:"author"`
	Avatar      string              `json:"avatar,omitempty"`
	Permissions []Permission        `json:"permissions"`
	Commands    []CommandDefinition `json:"commands"`
	Status      BotStatus           `json:"status"`
}

// BotStatus represents the status of a bot
type BotStatus string

const (
	BotStatusOnline    BotStatus = "online"
	BotStatusOffline   BotStatus = "offline"
	BotStatusMaintenance BotStatus = "maintenance"
)

// Router interface for registering HTTP routes
type Router interface {
	GET(path string, handler interface{})
	POST(path string, handler interface{})
	PUT(path string, handler interface{})
	DELETE(path string, handler interface{})
	PATCH(path string, handler interface{})
	Group(path string) Router
}

// Logger interface for plugin logging
type Logger interface {
	Info(msg string, fields ...interface{})
	Warn(msg string, fields ...interface{})
	Error(msg string, fields ...interface{})
	Debug(msg string, fields ...interface{})
}

// Database interface for plugin database access
type Database interface {
	Query(query string, args ...interface{}) (Rows, error)
	QueryRow(query string, args ...interface{}) Row
	Exec(query string, args ...interface{}) (Result, error)
}

// Rows interface for database query results
type Rows interface {
	Next() bool
	Scan(dest ...interface{}) error
	Close() error
}

// Row interface for single database row
type Row interface {
	Scan(dest ...interface{}) error
}

// Result interface for database execution result
type Result interface {
	LastInsertId() (int64, error)
	RowsAffected() (int64, error)
}