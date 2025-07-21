package main

import (
	"context"
	"fmt"
	"strings"
	"time"

	"fethur/internal/plugins"
)

// HelloBot implements a simple greeting bot
type HelloBot struct {
	name    string
	version string
	config  plugins.PluginConfig
	logger  plugins.Logger
}

// Ensure HelloBot implements the required interfaces
var _ plugins.Bot = (*HelloBot)(nil)

// Name returns the plugin name
func (hb *HelloBot) Name() string {
	return hb.name
}

// Version returns the plugin version
func (hb *HelloBot) Version() string {
	return hb.version
}

// Initialize initializes the plugin
func (hb *HelloBot) Initialize(ctx context.Context, config plugins.PluginConfig) error {
	hb.name = "hello-bot"
	hb.version = "1.0.0"
	hb.config = config
	hb.logger = config.Logger
	
	hb.logger.Info("HelloBot initializing...")
	
	// Perform any initialization tasks here
	// For example, loading configuration data
	if data, ok := config.Data["greeting_message"]; ok {
		hb.logger.Info("Custom greeting message loaded", "message", data)
	}
	
	hb.logger.Info("HelloBot initialized successfully")
	return nil
}

// Shutdown gracefully shuts down the plugin
func (hb *HelloBot) Shutdown(ctx context.Context) error {
	hb.logger.Info("HelloBot shutting down...")
	
	// Perform cleanup tasks here
	// For example, saving state or closing connections
	
	hb.logger.Info("HelloBot shutdown complete")
	return nil
}

// Health returns the health status of the plugin
func (hb *HelloBot) Health() plugins.PluginHealth {
	return plugins.PluginHealth{
		Status:  plugins.HealthStatusHealthy,
		Message: "HelloBot is running normally",
		Details: map[string]interface{}{
			"uptime": time.Since(time.Now()).String(),
			"memory_usage": "low",
		},
	}
}

// ProcessMessage processes incoming messages
func (hb *HelloBot) ProcessMessage(ctx context.Context, msg *plugins.Message) (*plugins.Message, error) {
	// Check if the message mentions the bot or contains greeting keywords
	content := strings.ToLower(msg.Content)
	
	if strings.Contains(content, "hello") || strings.Contains(content, "hi") {
		hb.logger.Debug("Processing greeting message", "user", msg.Username, "content", msg.Content)
		
		// We don't modify the original message, just log that we saw it
		// The actual response would be sent via a separate mechanism
	}
	
	// Return the message unchanged (pass-through)
	return msg, nil
}

// Priority returns the processing priority (lower numbers execute first)
func (hb *HelloBot) Priority() int {
	return 100 // Low priority - let other bots process first
}

// HandleCommand handles slash commands
func (hb *HelloBot) HandleCommand(ctx context.Context, cmd *plugins.Command) (*plugins.Response, error) {
	hb.logger.Info("Handling command", "command", cmd.Name, "user", cmd.Username)
	
	switch cmd.Name {
	case "hello":
		return hb.handleHelloCommand(ctx, cmd)
	case "info":
		return hb.handleInfoCommand(ctx, cmd)
	default:
		return nil, fmt.Errorf("unknown command: %s", cmd.Name)
	}
}

// Commands returns the list of commands this plugin handles
func (hb *HelloBot) Commands() []plugins.CommandDefinition {
	return []plugins.CommandDefinition{
		{
			Name:        "hello",
			Description: "Say hello to the user",
			Usage:       "/hello [name]",
			Options: []plugins.CommandOption{
				{
					Name:        "name",
					Description: "Name to greet (optional)",
					Type:        plugins.OptionTypeString,
					Required:    false,
				},
			},
			Permissions: []plugins.Permission{plugins.PermissionWriteMessages},
		},
		{
			Name:        "info",
			Description: "Show bot information",
			Usage:       "/info",
			Permissions: []plugins.Permission{plugins.PermissionReadMessages},
		},
	}
}

// HandleEvent handles system events
func (hb *HelloBot) HandleEvent(ctx context.Context, event plugins.Event) error {
	hb.logger.Debug("Handling event", "type", event.Type)
	
	switch event.Type {
	case plugins.EventUserJoin:
		return hb.handleUserJoinEvent(ctx, event)
	case plugins.EventMessageCreate:
		return hb.handleMessageCreateEvent(ctx, event)
	default:
		hb.logger.Debug("Ignoring unhandled event type", "type", event.Type)
	}
	
	return nil
}

// EventTypes returns the list of event types this plugin listens to
func (hb *HelloBot) EventTypes() []plugins.EventType {
	return []plugins.EventType{
		plugins.EventUserJoin,
		plugins.EventMessageCreate,
	}
}

// GetInfo returns bot information
func (hb *HelloBot) GetInfo() plugins.BotInfo {
	return plugins.BotInfo{
		Name:        hb.name,
		Description: "A simple greeting bot that responds to hello commands and welcomes new users",
		Version:     hb.version,
		Author:      "Fethur Team",
		Permissions: []plugins.Permission{
			plugins.PermissionReadMessages,
			plugins.PermissionWriteMessages,
		},
		Commands: hb.Commands(),
		Status:   plugins.BotStatusOnline,
	}
}

// HandleDirectMessage handles direct messages to the bot
func (hb *HelloBot) HandleDirectMessage(ctx context.Context, msg *plugins.DirectMessage) error {
	hb.logger.Info("Received direct message", "user", msg.Username, "content", msg.Content)
	
	// Echo the message back with a greeting
	response := fmt.Sprintf("Hello %s! You said: %s", msg.Username, msg.Content)
	
	// In a real implementation, you would send the response back
	// For now, we just log it
	hb.logger.Info("Would send DM response", "response", response)
	
	return nil
}

// Private helper methods

func (hb *HelloBot) handleHelloCommand(ctx context.Context, cmd *plugins.Command) (*plugins.Response, error) {
	name := "World"
	
	// Check if a name was provided in the options
	if nameOption, exists := cmd.Options["name"]; exists && nameOption != "" {
		name = nameOption
	} else if len(cmd.Args) > 0 {
		name = cmd.Args[0]
	}
	
	// Create a friendly greeting
	greetings := []string{
		"Hello, %s! 👋",
		"Hi there, %s! 😊",
		"Greetings, %s! 🎉",
		"Hey %s! Nice to see you! ✨",
	}
	
	// Use a simple selection based on name length to add variety
	greetingIndex := len(name) % len(greetings)
	content := fmt.Sprintf(greetings[greetingIndex], name)
	
	return &plugins.Response{
		Content: content,
		Type:    plugins.ResponseTypeMessage,
		Embeds: []plugins.Embed{
			{
				Title:       "Friendly Greeting",
				Description: "The HelloBot is happy to meet you!",
				Color:       0x00FF00, // Green color
				Footer: &plugins.EmbedFooter{
					Text: "HelloBot v" + hb.version,
				},
				Timestamp: &[]time.Time{time.Now()}[0],
			},
		},
	}, nil
}

func (hb *HelloBot) handleInfoCommand(ctx context.Context, cmd *plugins.Command) (*plugins.Response, error) {
	info := hb.GetInfo()
	
	content := fmt.Sprintf(`**%s v%s**
%s

**Author:** %s
**Status:** %s
**Commands:** %d available

Use /hello to get a friendly greeting!`,
		info.Name,
		info.Version,
		info.Description,
		info.Author,
		info.Status,
		len(info.Commands),
	)
	
	return &plugins.Response{
		Content: content,
		Type:    plugins.ResponseTypeEmbed,
		Embeds: []plugins.Embed{
			{
				Title:       "Bot Information",
				Description: content,
				Color:       0x0099FF, // Blue color
				Fields: []plugins.EmbedField{
					{
						Name:   "Version",
						Value:  info.Version,
						Inline: true,
					},
					{
						Name:   "Author",
						Value:  info.Author,
						Inline: true,
					},
					{
						Name:   "Status",
						Value:  string(info.Status),
						Inline: true,
					},
				},
			},
		},
	}, nil
}

func (hb *HelloBot) handleUserJoinEvent(ctx context.Context, event plugins.Event) error {
	hb.logger.Info("User joined server", "event_data", event.Data)
	
	// Extract user information from event data
	if userID, ok := event.Data["user_id"].(string); ok {
		if username, ok := event.Data["username"].(string); ok {
			hb.logger.Info("Welcoming new user", "user_id", userID, "username", username)
			
			// In a real implementation, you would send a welcome message to the channel
			welcomeMessage := fmt.Sprintf("Welcome to the server, %s! 🎉 I'm HelloBot, nice to meet you!", username)
			hb.logger.Info("Would send welcome message", "message", welcomeMessage)
		}
	}
	
	return nil
}

func (hb *HelloBot) handleMessageCreateEvent(ctx context.Context, event plugins.Event) error {
	// Only log message creation events - we don't want to respond to every message
	hb.logger.Debug("Message created", "channel_id", event.ChannelID, "user_id", event.UserID)
	return nil
}

// Plugin entry point - this would be called by the plugin loader
func NewHelloBot() plugins.Bot {
	return &HelloBot{}
}

// For direct instantiation in tests or development
func main() {
	bot := NewHelloBot()
	fmt.Printf("HelloBot created: %s v%s\n", bot.Name(), bot.Version())
	
	// Example of bot info
	info := bot.GetInfo()
	fmt.Printf("Bot Info: %+v\n", info)
}