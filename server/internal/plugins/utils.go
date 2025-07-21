package plugins

import (
	"context"
	"fmt"
	"runtime"
	"sync"
	"time"
)

// EventBus handles event distribution to plugins
type EventBus struct {
	subscribers map[EventType][]func(Event)
	mu          sync.RWMutex
}

// NewEventBus creates a new event bus
func NewEventBus() *EventBus {
	return &EventBus{
		subscribers: make(map[EventType][]func(Event)),
	}
}

// Subscribe adds a subscriber for a specific event type
func (eb *EventBus) Subscribe(eventType EventType, handler func(Event)) {
	eb.mu.Lock()
	defer eb.mu.Unlock()
	
	if eb.subscribers[eventType] == nil {
		eb.subscribers[eventType] = make([]func(Event), 0)
	}
	eb.subscribers[eventType] = append(eb.subscribers[eventType], handler)
}

// Emit emits an event to all subscribers
func (eb *EventBus) Emit(event Event) {
	eb.mu.RLock()
	handlers := eb.subscribers[event.Type]
	eb.mu.RUnlock()
	
	for _, handler := range handlers {
		go handler(event)
	}
}

// ResourceMonitor monitors plugin resource usage
type ResourceMonitor struct {
	plugins map[string]*PluginUsage
	limits  map[string]ResourceLimits
	mu      sync.RWMutex
}

// PluginUsage tracks resource usage for a plugin
type PluginUsage struct {
	MemoryMB     float64   `json:"memory_mb"`
	CPUPercent   float64   `json:"cpu_percent"`
	Goroutines   int       `json:"goroutines"`
	Connections  int       `json:"connections"`
	LastUpdated  time.Time `json:"last_updated"`
}

// NewResourceMonitor creates a new resource monitor
func NewResourceMonitor() *ResourceMonitor {
	return &ResourceMonitor{
		plugins: make(map[string]*PluginUsage),
		limits:  make(map[string]ResourceLimits),
	}
}

// RegisterPlugin registers a plugin for monitoring
func (rm *ResourceMonitor) RegisterPlugin(name string, limits ResourceLimits) {
	rm.mu.Lock()
	defer rm.mu.Unlock()
	
	rm.plugins[name] = &PluginUsage{
		LastUpdated: time.Now(),
	}
	rm.limits[name] = limits
}

// UnregisterPlugin removes a plugin from monitoring
func (rm *ResourceMonitor) UnregisterPlugin(name string) {
	rm.mu.Lock()
	defer rm.mu.Unlock()
	
	delete(rm.plugins, name)
	delete(rm.limits, name)
}

// UpdateUsage updates resource usage for a plugin
func (rm *ResourceMonitor) UpdateUsage(name string, usage PluginUsage) {
	rm.mu.Lock()
	defer rm.mu.Unlock()
	
	if _, exists := rm.plugins[name]; exists {
		usage.LastUpdated = time.Now()
		rm.plugins[name] = &usage
	}
}

// GetUsage returns current resource usage for a plugin
func (rm *ResourceMonitor) GetUsage(name string) (*PluginUsage, bool) {
	rm.mu.RLock()
	defer rm.mu.RUnlock()
	
	usage, exists := rm.plugins[name]
	if !exists {
		return nil, false
	}
	
	// Update with current Go runtime stats
	var m runtime.MemStats
	runtime.ReadMemStats(&m)
	
	// This is a simplified approximation - in reality you'd need 
	// per-plugin memory tracking
	usage.MemoryMB = float64(m.Alloc) / 1024 / 1024
	usage.Goroutines = runtime.NumGoroutine()
	usage.LastUpdated = time.Now()
	
	return usage, true
}

// CheckLimits checks if a plugin is exceeding its resource limits
func (rm *ResourceMonitor) CheckLimits(name string) []string {
	rm.mu.RLock()
	defer rm.mu.RUnlock()
	
	usage, exists := rm.plugins[name]
	if !exists {
		return nil
	}
	
	limits, exists := rm.limits[name]
	if !exists {
		return nil
	}
	
	var violations []string
	
	if usage.MemoryMB > float64(limits.MaxMemoryMB) {
		violations = append(violations, 
			fmt.Sprintf("Memory usage %.2f MB exceeds limit %d MB", 
				usage.MemoryMB, limits.MaxMemoryMB))
	}
	
	if usage.CPUPercent > limits.MaxCPUPercent {
		violations = append(violations,
			fmt.Sprintf("CPU usage %.2f%% exceeds limit %.2f%%",
				usage.CPUPercent, limits.MaxCPUPercent))
	}
	
	if usage.Goroutines > limits.MaxGoroutines {
		violations = append(violations,
			fmt.Sprintf("Goroutine count %d exceeds limit %d",
				usage.Goroutines, limits.MaxGoroutines))
	}
	
	return violations
}

// PluginLogger provides scoped logging for plugins
type PluginLogger struct {
	base       Logger
	pluginName string
}

// NewPluginLogger creates a new plugin-scoped logger
func NewPluginLogger(base Logger, pluginName string) *PluginLogger {
	return &PluginLogger{
		base:       base,
		pluginName: pluginName,
	}
}

func (pl *PluginLogger) Info(msg string, fields ...interface{}) {
	allFields := append([]interface{}{"plugin", pl.pluginName}, fields...)
	pl.base.Info(msg, allFields...)
}

func (pl *PluginLogger) Warn(msg string, fields ...interface{}) {
	allFields := append([]interface{}{"plugin", pl.pluginName}, fields...)
	pl.base.Warn(msg, allFields...)
}

func (pl *PluginLogger) Error(msg string, fields ...interface{}) {
	allFields := append([]interface{}{"plugin", pl.pluginName}, fields...)
	pl.base.Error(msg, allFields...)
}

func (pl *PluginLogger) Debug(msg string, fields ...interface{}) {
	allFields := append([]interface{}{"plugin", pl.pluginName}, fields...)
	pl.base.Debug(msg, allFields...)
}

// PluginDatabase provides permission-checked database access for plugins
type PluginDatabase struct {
	base        Database
	permissions []Permission
}

// NewPluginDatabase creates a new permission-checked database wrapper
func NewPluginDatabase(base Database, permissions []Permission) *PluginDatabase {
	return &PluginDatabase{
		base:        base,
		permissions: permissions,
	}
}

func (pd *PluginDatabase) Query(query string, args ...interface{}) (Rows, error) {
	if !pd.hasPermission(PermissionAccessDB) {
		return nil, fmt.Errorf("plugin does not have database access permission")
	}
	
	// Additional query validation could be added here
	if err := pd.validateQuery(query); err != nil {
		return nil, fmt.Errorf("query validation failed: %w", err)
	}
	
	return pd.base.Query(query, args...)
}

func (pd *PluginDatabase) QueryRow(query string, args ...interface{}) Row {
	if !pd.hasPermission(PermissionAccessDB) {
		return &errorRow{fmt.Errorf("plugin does not have database access permission")}
	}
	
	if err := pd.validateQuery(query); err != nil {
		return &errorRow{fmt.Errorf("query validation failed: %w", err)}
	}
	
	return pd.base.QueryRow(query, args...)
}

func (pd *PluginDatabase) Exec(query string, args ...interface{}) (Result, error) {
	if !pd.hasPermission(PermissionAccessDB) {
		return nil, fmt.Errorf("plugin does not have database access permission")
	}
	
	if err := pd.validateQuery(query); err != nil {
		return nil, fmt.Errorf("query validation failed: %w", err)
	}
	
	return pd.base.Exec(query, args...)
}

func (pd *PluginDatabase) hasPermission(perm Permission) bool {
	for _, p := range pd.permissions {
		if p == perm {
			return true
		}
	}
	return false
}

func (pd *PluginDatabase) validateQuery(query string) error {
	// Basic query validation - prevent dangerous operations
	// This is a simplified implementation
	dangerousPatterns := []string{
		"DROP TABLE",
		"DELETE FROM users",
		"TRUNCATE",
		"ALTER TABLE",
		"CREATE TABLE",
	}
	
	queryUpper := query
	for _, pattern := range dangerousPatterns {
		if len(queryUpper) >= len(pattern) {
			for i := 0; i <= len(queryUpper)-len(pattern); i++ {
				if queryUpper[i:i+len(pattern)] == pattern {
					return fmt.Errorf("dangerous query pattern detected: %s", pattern)
				}
			}
		}
	}
	
	return nil
}

// errorRow implements Row interface for error cases
type errorRow struct {
	err error
}

func (er *errorRow) Scan(dest ...interface{}) error {
	return er.err
}

// PluginContext provides a context for plugin execution with resource limits
type PluginContext struct {
	context.Context
	pluginName string
	limits     ResourceLimits
	startTime  time.Time
}

// NewPluginContext creates a new plugin execution context
func NewPluginContext(parent context.Context, pluginName string, limits ResourceLimits) *PluginContext {
	ctx, cancel := context.WithTimeout(parent, limits.MaxExecutionTime)
	
	pc := &PluginContext{
		Context:    ctx,
		pluginName: pluginName,
		limits:     limits,
		startTime:  time.Now(),
	}
	
	// Set up automatic cancellation if execution time exceeds limit
	go func() {
		<-time.After(limits.MaxExecutionTime)
		cancel()
	}()
	
	return pc
}

// ElapsedTime returns the elapsed execution time
func (pc *PluginContext) ElapsedTime() time.Duration {
	return time.Since(pc.startTime)
}

// RemainingTime returns the remaining execution time
func (pc *PluginContext) RemainingTime() time.Duration {
	remaining := pc.limits.MaxExecutionTime - pc.ElapsedTime()
	if remaining < 0 {
		return 0
	}
	return remaining
}

// PluginName returns the name of the plugin
func (pc *PluginContext) PluginName() string {
	return pc.pluginName
}

// InputValidator provides input validation utilities for plugins
type InputValidator struct {
	maxLength int
	patterns  map[string]*regexp.Regexp
}

// NewInputValidator creates a new input validator
func NewInputValidator() *InputValidator {
	return &InputValidator{
		maxLength: 4096, // Default max input length
		patterns:  make(map[string]*regexp.Regexp),
	}
}

// ValidateMessageContent validates message content
func (iv *InputValidator) ValidateMessageContent(content string) error {
	if len(content) == 0 {
		return fmt.Errorf("message content cannot be empty")
	}
	
	if len(content) > iv.maxLength {
		return fmt.Errorf("message content too long (max %d characters)", iv.maxLength)
	}
	
	// Check for potentially malicious content
	// This is a basic implementation - more sophisticated validation could be added
	if containsScriptTags(content) {
		return fmt.Errorf("message content contains script tags")
	}
	
	return nil
}

// ValidateCommandInput validates command input
func (iv *InputValidator) ValidateCommandInput(input string) error {
	if len(input) > 1024 {
		return fmt.Errorf("command input too long (max 1024 characters)")
	}
	
	// Check for command injection patterns
	dangerousPatterns := []string{";", "&&", "||", "|", "`", "$"}
	for _, pattern := range dangerousPatterns {
		if len(input) >= len(pattern) {
			for i := 0; i <= len(input)-len(pattern); i++ {
				if input[i:i+len(pattern)] == pattern {
					return fmt.Errorf("command input contains dangerous pattern: %s", pattern)
				}
			}
		}
	}
	
	return nil
}

func containsScriptTags(content string) bool {
	// Simple check for script tags - in production, you'd want more sophisticated checking
	scriptPatterns := []string{"<script", "</script>", "javascript:", "onload=", "onerror="}
	contentLower := content
	
	for _, pattern := range scriptPatterns {
		for i := 0; i <= len(contentLower)-len(pattern); i++ {
			match := true
			for j := 0; j < len(pattern); j++ {
				if contentLower[i+j] != pattern[j] && contentLower[i+j] != pattern[j]-32 {
					match = false
					break
				}
			}
			if match {
				return true
			}
		}
	}
	
	return false
}

// PluginRegistry manages plugin metadata and discovery
type PluginRegistry struct {
	plugins map[string]*PluginManifest
	mu      sync.RWMutex
}

// NewPluginRegistry creates a new plugin registry
func NewPluginRegistry() *PluginRegistry {
	return &PluginRegistry{
		plugins: make(map[string]*PluginManifest),
	}
}

// Register registers a plugin manifest
func (pr *PluginRegistry) Register(manifest *PluginManifest) error {
	pr.mu.Lock()
	defer pr.mu.Unlock()
	
	if _, exists := pr.plugins[manifest.Name]; exists {
		return fmt.Errorf("plugin %s already registered", manifest.Name)
	}
	
	pr.plugins[manifest.Name] = manifest
	return nil
}

// Get retrieves a plugin manifest
func (pr *PluginRegistry) Get(name string) (*PluginManifest, bool) {
	pr.mu.RLock()
	defer pr.mu.RUnlock()
	
	manifest, exists := pr.plugins[name]
	return manifest, exists
}

// List returns all registered plugin manifests
func (pr *PluginRegistry) List() []*PluginManifest {
	pr.mu.RLock()
	defer pr.mu.RUnlock()
	
	manifests := make([]*PluginManifest, 0, len(pr.plugins))
	for _, manifest := range pr.plugins {
		manifests = append(manifests, manifest)
	}
	
	return manifests
}

// Unregister removes a plugin from the registry
func (pr *PluginRegistry) Unregister(name string) error {
	pr.mu.Lock()
	defer pr.mu.Unlock()
	
	if _, exists := pr.plugins[name]; !exists {
		return fmt.Errorf("plugin %s not found", name)
	}
	
	delete(pr.plugins, name)
	return nil
}