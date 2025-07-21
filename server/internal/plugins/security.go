package plugins

import (
	"fmt"
	"regexp"
	"strings"
)

// SecurityManager handles security validation and permission checking for plugins
type SecurityManager struct {
	policy            string
	allowedPermissions map[Permission]bool
	blockedPatterns   []*regexp.Regexp
	maxResourceLimits ResourceLimits
}

// NewSecurityManager creates a new security manager
func NewSecurityManager(policy string) *SecurityManager {
	sm := &SecurityManager{
		policy:             policy,
		allowedPermissions: make(map[Permission]bool),
		blockedPatterns:    make([]*regexp.Regexp, 0),
		maxResourceLimits: ResourceLimits{
			MaxMemoryMB:      512,
			MaxCPUPercent:    50.0,
			MaxExecutionTime: 30000000000, // 30 seconds
			MaxGoroutines:    100,
			MaxConnections:   50,
		},
	}
	
	sm.initializePolicy(policy)
	return sm
}

// ValidatePlugin validates a plugin manifest against security policies
func (sm *SecurityManager) ValidatePlugin(manifest *PluginManifest) error {
	// Validate plugin name
	if err := sm.validatePluginName(manifest.Name); err != nil {
		return fmt.Errorf("invalid plugin name: %w", err)
	}
	
	// Validate permissions
	if err := sm.validatePermissions(manifest.Permissions); err != nil {
		return fmt.Errorf("invalid permissions: %w", err)
	}
	
	// Validate resource limits
	if err := sm.validateResourceLimits(manifest.Resources); err != nil {
		return fmt.Errorf("invalid resource limits: %w", err)
	}
	
	// Validate commands
	if err := sm.validateCommands(manifest.Commands); err != nil {
		return fmt.Errorf("invalid commands: %w", err)
	}
	
	return nil
}

// CheckCommandPermissions checks if a command has the required permissions
func (sm *SecurityManager) CheckCommandPermissions(cmd *Command, requiredPerms []Permission) error {
	// For now, this is a simple check - in a real implementation,
	// this would check the user's permissions against the required permissions
	
	// Basic validation - ensure command is not malicious
	if err := sm.validateCommandContent(cmd); err != nil {
		return err
	}
	
	return nil
}

// CheckMessagePermissions checks if a message operation has the required permissions
func (sm *SecurityManager) CheckMessagePermissions(userID string, channelID string, action string) error {
	// Placeholder for permission checking logic
	// In a real implementation, this would check user roles and channel permissions
	return nil
}

// Private methods

func (sm *SecurityManager) initializePolicy(policy string) {
	switch policy {
	case "strict":
		sm.initializeStrictPolicy()
	case "moderate":
		sm.initializeModeratePolicy()
	case "permissive":
		sm.initializePermissivePolicy()
	default:
		sm.initializeModeratePolicy()
	}
}

func (sm *SecurityManager) initializeStrictPolicy() {
	// Only allow basic permissions
	allowedPerms := []Permission{
		PermissionReadMessages,
		PermissionWriteMessages,
	}
	
	for _, perm := range allowedPerms {
		sm.allowedPermissions[perm] = true
	}
	
	// Strict resource limits
	sm.maxResourceLimits = ResourceLimits{
		MaxMemoryMB:      128,
		MaxCPUPercent:    25.0,
		MaxExecutionTime: 10000000000, // 10 seconds
		MaxGoroutines:    25,
		MaxConnections:   10,
	}
	
	// Block potentially dangerous patterns
	sm.addBlockedPattern(`(?i)(exec|system|eval|import\s+os)`)
	sm.addBlockedPattern(`(?i)(subprocess|shell|cmd)`)
}

func (sm *SecurityManager) initializeModeratePolicy() {
	// Allow most permissions except dangerous ones
	allowedPerms := []Permission{
		PermissionReadMessages,
		PermissionWriteMessages,
		PermissionManageChannels,
		PermissionUserData,
		PermissionNetworkAccess,
	}
	
	for _, perm := range allowedPerms {
		sm.allowedPermissions[perm] = true
	}
	
	// Moderate resource limits
	sm.maxResourceLimits = ResourceLimits{
		MaxMemoryMB:      256,
		MaxCPUPercent:    40.0,
		MaxExecutionTime: 20000000000, // 20 seconds
		MaxGoroutines:    50,
		MaxConnections:   25,
	}
	
	// Block some dangerous patterns
	sm.addBlockedPattern(`(?i)(rm\s+-rf|del\s+/|format\s+c:)`)
}

func (sm *SecurityManager) initializePermissivePolicy() {
	// Allow all permissions
	allPerms := []Permission{
		PermissionReadMessages,
		PermissionWriteMessages,
		PermissionManageChannels,
		PermissionAccessDB,
		PermissionNetworkAccess,
		PermissionFileSystem,
		PermissionUserData,
		PermissionServerManage,
	}
	
	for _, perm := range allPerms {
		sm.allowedPermissions[perm] = true
	}
	
	// Generous resource limits
	sm.maxResourceLimits = ResourceLimits{
		MaxMemoryMB:      512,
		MaxCPUPercent:    50.0,
		MaxExecutionTime: 30000000000, // 30 seconds
		MaxGoroutines:    100,
		MaxConnections:   50,
	}
}

func (sm *SecurityManager) addBlockedPattern(pattern string) {
	regex, err := regexp.Compile(pattern)
	if err == nil {
		sm.blockedPatterns = append(sm.blockedPatterns, regex)
	}
}

func (sm *SecurityManager) validatePluginName(name string) error {
	// Plugin name validation
	if len(name) == 0 {
		return fmt.Errorf("plugin name cannot be empty")
	}
	
	if len(name) > 64 {
		return fmt.Errorf("plugin name too long (max 64 characters)")
	}
	
	// Check for valid characters (alphanumeric, dash, underscore)
	validName := regexp.MustCompile(`^[a-zA-Z0-9_-]+$`)
	if !validName.MatchString(name) {
		return fmt.Errorf("plugin name contains invalid characters")
	}
	
	// Reserved names
	reservedNames := []string{"system", "core", "admin", "fethur", "api"}
	for _, reserved := range reservedNames {
		if strings.EqualFold(name, reserved) {
			return fmt.Errorf("plugin name '%s' is reserved", name)
		}
	}
	
	return nil
}

func (sm *SecurityManager) validatePermissions(permissions []Permission) error {
	for _, perm := range permissions {
		if !sm.allowedPermissions[perm] {
			return fmt.Errorf("permission '%s' not allowed in current security policy", perm)
		}
	}
	return nil
}

func (sm *SecurityManager) validateResourceLimits(limits ResourceLimits) error {
	if limits.MaxMemoryMB > sm.maxResourceLimits.MaxMemoryMB {
		return fmt.Errorf("memory limit %d MB exceeds maximum %d MB", 
			limits.MaxMemoryMB, sm.maxResourceLimits.MaxMemoryMB)
	}
	
	if limits.MaxCPUPercent > sm.maxResourceLimits.MaxCPUPercent {
		return fmt.Errorf("CPU limit %.2f%% exceeds maximum %.2f%%", 
			limits.MaxCPUPercent, sm.maxResourceLimits.MaxCPUPercent)
	}
	
	if limits.MaxExecutionTime > sm.maxResourceLimits.MaxExecutionTime {
		return fmt.Errorf("execution time limit %v exceeds maximum %v", 
			limits.MaxExecutionTime, sm.maxResourceLimits.MaxExecutionTime)
	}
	
	if limits.MaxGoroutines > sm.maxResourceLimits.MaxGoroutines {
		return fmt.Errorf("goroutine limit %d exceeds maximum %d", 
			limits.MaxGoroutines, sm.maxResourceLimits.MaxGoroutines)
	}
	
	return nil
}

func (sm *SecurityManager) validateCommands(commands []CommandDefinition) error {
	commandNames := make(map[string]bool)
	
	for _, cmd := range commands {
		// Check for duplicate command names
		if commandNames[cmd.Name] {
			return fmt.Errorf("duplicate command name: %s", cmd.Name)
		}
		commandNames[cmd.Name] = true
		
		// Validate command name
		if err := sm.validateCommandName(cmd.Name); err != nil {
			return fmt.Errorf("invalid command name '%s': %w", cmd.Name, err)
		}
		
		// Validate command permissions
		if err := sm.validatePermissions(cmd.Permissions); err != nil {
			return fmt.Errorf("invalid permissions for command '%s': %w", cmd.Name, err)
		}
	}
	
	return nil
}

func (sm *SecurityManager) validateCommandName(name string) error {
	if len(name) == 0 {
		return fmt.Errorf("command name cannot be empty")
	}
	
	if len(name) > 32 {
		return fmt.Errorf("command name too long (max 32 characters)")
	}
	
	// Check for valid characters (alphanumeric, dash, underscore)
	validName := regexp.MustCompile(`^[a-zA-Z0-9_-]+$`)
	if !validName.MatchString(name) {
		return fmt.Errorf("command name contains invalid characters")
	}
	
	// Reserved command names
	reservedCommands := []string{"help", "admin", "system", "config"}
	for _, reserved := range reservedCommands {
		if strings.EqualFold(name, reserved) {
			return fmt.Errorf("command name '%s' is reserved", name)
		}
	}
	
	return nil
}

func (sm *SecurityManager) validateCommandContent(cmd *Command) error {
	// Check command content against blocked patterns
	content := strings.Join(cmd.Args, " ")
	
	for _, pattern := range sm.blockedPatterns {
		if pattern.MatchString(content) {
			return fmt.Errorf("command content contains blocked pattern")
		}
	}
	
	// Check for excessively long arguments
	for _, arg := range cmd.Args {
		if len(arg) > 1024 {
			return fmt.Errorf("command argument too long (max 1024 characters)")
		}
	}
	
	return nil
}

// SecurityLevel represents different security levels
type SecurityLevel string

const (
	SecurityLevelStrict     SecurityLevel = "strict"
	SecurityLevelModerate   SecurityLevel = "moderate"
	SecurityLevelPermissive SecurityLevel = "permissive"
)

// SecurityReport contains the results of a security validation
type SecurityReport struct {
	Valid        bool     `json:"valid"`
	Violations   []string `json:"violations,omitempty"`
	Warnings     []string `json:"warnings,omitempty"`
	Score        int      `json:"score"` // 0-100 security score
	Level        SecurityLevel `json:"level"`
}

// GenerateSecurityReport generates a comprehensive security report for a plugin
func (sm *SecurityManager) GenerateSecurityReport(manifest *PluginManifest) *SecurityReport {
	report := &SecurityReport{
		Valid:      true,
		Violations: make([]string, 0),
		Warnings:   make([]string, 0),
		Score:      100,
		Level:      SecurityLevelStrict,
	}
	
	// Check permissions
	for _, perm := range manifest.Permissions {
		if !sm.allowedPermissions[perm] {
			report.Violations = append(report.Violations, 
				fmt.Sprintf("Permission '%s' not allowed", perm))
			report.Score -= 20
			report.Valid = false
		}
	}
	
	// Check resource limits
	if manifest.Resources.MaxMemoryMB > sm.maxResourceLimits.MaxMemoryMB {
		report.Violations = append(report.Violations,
			fmt.Sprintf("Memory limit %d MB exceeds maximum", manifest.Resources.MaxMemoryMB))
		report.Score -= 15
		report.Valid = false
	}
	
	// Determine security level based on score
	if report.Score >= 80 {
		report.Level = SecurityLevelStrict
	} else if report.Score >= 60 {
		report.Level = SecurityLevelModerate
	} else {
		report.Level = SecurityLevelPermissive
	}
	
	return report
}