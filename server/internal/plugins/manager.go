package plugins

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"

	"gopkg.in/yaml.v2"
)

// Manager handles the lifecycle and management of plugins
type Manager struct {
	plugins   map[string]Plugin
	manifests map[string]*PluginManifest
	security  *SecurityManager
	monitor   *ResourceMonitor
	eventBus  *EventBus
	config    *Config
	logger    Logger
	database  Database
	mu        sync.RWMutex
	ctx       context.Context
	cancel    context.CancelFunc
}

// Config contains configuration for the plugin manager
type Config struct {
	PluginDir      string         `json:"plugin_dir" yaml:"plugin_dir"`
	MaxPlugins     int            `json:"max_plugins" yaml:"max_plugins"`
	DefaultLimits  ResourceLimits `json:"default_limits" yaml:"default_limits"`
	EnableSandbox  bool           `json:"enable_sandbox" yaml:"enable_sandbox"`
	SecurityPolicy string         `json:"security_policy" yaml:"security_policy"`
	UpdateInterval time.Duration  `json:"update_interval" yaml:"update_interval"`
}

// NewManager creates a new plugin manager
func NewManager(config *Config, logger Logger, database Database) (*Manager, error) {
	ctx, cancel := context.WithCancel(context.Background())

	eventBus := NewEventBus()
	security := NewSecurityManager(config.SecurityPolicy)
	monitor := NewResourceMonitor()

	manager := &Manager{
		plugins:   make(map[string]Plugin),
		manifests: make(map[string]*PluginManifest),
		security:  security,
		monitor:   monitor,
		eventBus:  eventBus,
		config:    config,
		logger:    logger,
		database:  database,
		ctx:       ctx,
		cancel:    cancel,
	}

	// Start background monitoring
	go manager.startMonitoring()

	return manager, nil
}

// LoadPlugin loads a plugin from the specified path
func (m *Manager) LoadPlugin(pluginPath string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.logger.Info("Loading plugin", "path", pluginPath)

	// Load and validate manifest
	manifest, err := m.loadManifest(pluginPath)
	if err != nil {
		return fmt.Errorf("failed to load manifest: %w", err)
	}

	// Security check
	if err := m.security.ValidatePlugin(manifest); err != nil {
		return fmt.Errorf("security validation failed: %w", err)
	}

	// Check if plugin already loaded
	if _, exists := m.plugins[manifest.Name]; exists {
		return fmt.Errorf("plugin %s already loaded", manifest.Name)
	}

	// Load plugin implementation
	plugin, err := m.loadPluginImplementation(pluginPath, manifest)
	if err != nil {
		return fmt.Errorf("failed to load plugin implementation: %w", err)
	}

	// Initialize plugin
	config := PluginConfig{
		Data:        make(map[string]interface{}),
		Permissions: manifest.Permissions,
		Logger:      NewPluginLogger(m.logger, manifest.Name),
		Database:    NewPluginDatabase(m.database, manifest.Permissions),
	}

	ctx, cancel := context.WithTimeout(m.ctx, 30*time.Second)
	defer cancel()

	if err := plugin.Initialize(ctx, config); err != nil {
		return fmt.Errorf("failed to initialize plugin: %w", err)
	}

	// Register with resource monitor
	m.monitor.RegisterPlugin(manifest.Name, manifest.Resources)

	// Store plugin and manifest
	m.plugins[manifest.Name] = plugin
	m.manifests[manifest.Name] = manifest

	// Emit event
	m.eventBus.Emit(Event{
		Type: EventPluginLoaded,
		Data: map[string]interface{}{
			"plugin_name": manifest.Name,
			"version":     manifest.Version,
		},
		Timestamp: time.Now(),
	})

	m.logger.Info("Plugin loaded successfully", "name", manifest.Name, "version", manifest.Version)
	return nil
}

// UnloadPlugin unloads a plugin
func (m *Manager) UnloadPlugin(name string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	plugin, exists := m.plugins[name]
	if !exists {
		return fmt.Errorf("plugin %s not found", name)
	}

	m.logger.Info("Unloading plugin", "name", name)

	// Shutdown plugin
	ctx, cancel := context.WithTimeout(m.ctx, 30*time.Second)
	defer cancel()

	if err := plugin.Shutdown(ctx); err != nil {
		m.logger.Warn("Error during plugin shutdown", "name", name, "error", err)
	}

	// Unregister from monitor
	m.monitor.UnregisterPlugin(name)

	// Remove from maps
	delete(m.plugins, name)
	delete(m.manifests, name)

	// Emit event
	m.eventBus.Emit(Event{
		Type: EventPluginUnloaded,
		Data: map[string]interface{}{
			"plugin_name": name,
		},
		Timestamp: time.Now(),
	})

	m.logger.Info("Plugin unloaded successfully", "name", name)
	return nil
}

// GetPlugin returns a loaded plugin by name
func (m *Manager) GetPlugin(name string) (Plugin, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	plugin, exists := m.plugins[name]
	return plugin, exists
}

// ListPlugins returns a list of all loaded plugins
func (m *Manager) ListPlugins() []PluginInfo {
	m.mu.RLock()
	defer m.mu.RUnlock()

	var plugins []PluginInfo
	for name, manifest := range m.manifests {
		plugin := m.plugins[name]
		health := plugin.Health()

		info := PluginInfo{
			Name:        manifest.Name,
			Version:     manifest.Version,
			Description: manifest.Description,
			Author:      manifest.Author,
			Status:      m.getPluginStatus(name),
			Health:      health,
			Permissions: manifest.Permissions,
			Commands:    manifest.Commands,
		}
		plugins = append(plugins, info)
	}

	return plugins
}

// ProcessMessage processes a message through all message processor plugins
func (m *Manager) ProcessMessage(ctx context.Context, msg *Message) (*Message, error) {
	m.mu.RLock()
	processors := m.getMessageProcessors()
	m.mu.RUnlock()

	result := msg
	for _, processor := range processors {
		processed, err := processor.ProcessMessage(ctx, result)
		if err != nil {
			m.logger.Error("Message processing error",
				"plugin", processor.Name(),
				"error", err)
			continue
		}
		result = processed
	}

	return result, nil
}

// HandleCommand handles a command through the appropriate plugin
func (m *Manager) HandleCommand(ctx context.Context, cmd *Command) (*Response, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	for _, plugin := range m.plugins {
		if handler, ok := plugin.(CommandHandler); ok {
			for _, cmdDef := range handler.Commands() {
				if cmdDef.Name == cmd.Name {
					// Check permissions
					if err := m.security.CheckCommandPermissions(cmd, cmdDef.Permissions); err != nil {
						return nil, fmt.Errorf("permission denied: %w", err)
					}

					// Execute command with timeout
					ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
					defer cancel()

					return handler.HandleCommand(ctx, cmd)
				}
			}
		}
	}

	return nil, fmt.Errorf("unknown command: %s", cmd.Name)
}

// EmitEvent emits an event to all event listener plugins
func (m *Manager) EmitEvent(ctx context.Context, event Event) {
	m.mu.RLock()
	listeners := m.getEventListeners(event.Type)
	m.mu.RUnlock()

	for _, listener := range listeners {
		go func(l EventListener) {
			ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
			defer cancel()

			if err := l.HandleEvent(ctx, event); err != nil {
				m.logger.Error("Event handling error",
					"plugin", l.Name(),
					"event", event.Type,
					"error", err)
			}
		}(listener)
	}
}

// Shutdown gracefully shuts down all plugins
func (m *Manager) Shutdown(ctx context.Context) error {
	m.cancel()

	m.mu.Lock()
	defer m.mu.Unlock()

	var errors []error
	for name, plugin := range m.plugins {
		if err := plugin.Shutdown(ctx); err != nil {
			errors = append(errors, fmt.Errorf("failed to shutdown plugin %s: %w", name, err))
		}
	}

	if len(errors) > 0 {
		return fmt.Errorf("shutdown errors: %v", errors)
	}

	return nil
}

// Private methods

func (m *Manager) loadManifest(pluginPath string) (*PluginManifest, error) {
	manifestPath := filepath.Join(pluginPath, "plugin.yaml")
	if _, err := os.Stat(manifestPath); os.IsNotExist(err) {
		manifestPath = filepath.Join(pluginPath, "plugin.yml")
	}

	data, err := os.ReadFile(manifestPath)
	if err != nil {
		return nil, err
	}

	var manifest PluginManifest
	if err := yaml.Unmarshal(data, &manifest); err != nil {
		return nil, err
	}

	// Set default resource limits if not specified
	if manifest.Resources.MaxMemoryMB == 0 {
		manifest.Resources = m.config.DefaultLimits
	}

	return &manifest, nil
}

func (m *Manager) loadPluginImplementation(pluginPath string, manifest *PluginManifest) (Plugin, error) {
	// For now, this is a placeholder for the actual plugin loading mechanism
	// In a real implementation, this would load the plugin using one of:
	// 1. Go's plugin package (for .so files)
	// 2. WebAssembly runtime (for .wasm files)
	// 3. Process spawning (for executable plugins)

	// This would be replaced with actual plugin loading logic
	return nil, fmt.Errorf("plugin loading not yet implemented")
}

func (m *Manager) getMessageProcessors() []MessageProcessor {
	var processors []MessageProcessor
	for _, plugin := range m.plugins {
		if processor, ok := plugin.(MessageProcessor); ok {
			processors = append(processors, processor)
		}
	}
	return processors
}

func (m *Manager) getEventListeners(eventType EventType) []EventListener {
	var listeners []EventListener
	for _, plugin := range m.plugins {
		if listener, ok := plugin.(EventListener); ok {
			for _, et := range listener.EventTypes() {
				if et == eventType {
					listeners = append(listeners, listener)
					break
				}
			}
		}
	}
	return listeners
}

func (m *Manager) getPluginStatus(name string) PluginStatus {
	// Check if plugin is responsive
	plugin := m.plugins[name]
	health := plugin.Health()

	switch health.Status {
	case HealthStatusHealthy:
		return PluginStatusRunning
	case HealthStatusDegraded:
		return PluginStatusDegraded
	case HealthStatusUnhealthy:
		return PluginStatusError
	default:
		return PluginStatusUnknown
	}
}

func (m *Manager) startMonitoring() {
	ticker := time.NewTicker(m.config.UpdateInterval)
	defer ticker.Stop()

	for {
		select {
		case <-m.ctx.Done():
			return
		case <-ticker.C:
			m.performHealthChecks()
		}
	}
}

func (m *Manager) performHealthChecks() {
	m.mu.RLock()
	plugins := make(map[string]Plugin)
	for name, plugin := range m.plugins {
		plugins[name] = plugin
	}
	m.mu.RUnlock()

	for name, plugin := range plugins {
		health := plugin.Health()
		if health.Status == HealthStatusUnhealthy {
			m.logger.Warn("Plugin health check failed",
				"name", name,
				"status", health.Status,
				"message", health.Message)
		}
	}
}

// Helper types and functions

// PluginInfo contains information about a loaded plugin
type PluginInfo struct {
	Name        string              `json:"name"`
	Version     string              `json:"version"`
	Description string              `json:"description"`
	Author      string              `json:"author"`
	Status      PluginStatus        `json:"status"`
	Health      PluginHealth        `json:"health"`
	Permissions []Permission        `json:"permissions"`
	Commands    []CommandDefinition `json:"commands"`
}

// PluginStatus represents the status of a plugin
type PluginStatus string

const (
	PluginStatusRunning  PluginStatus = "running"
	PluginStatusStopped  PluginStatus = "stopped"
	PluginStatusError    PluginStatus = "error"
	PluginStatusDegraded PluginStatus = "degraded"
	PluginStatusUnknown  PluginStatus = "unknown"
)

// Event types for plugin lifecycle
const (
	EventPluginLoaded   EventType = "plugin.loaded"
	EventPluginUnloaded EventType = "plugin.unloaded"
	EventPluginError    EventType = "plugin.error"
)
