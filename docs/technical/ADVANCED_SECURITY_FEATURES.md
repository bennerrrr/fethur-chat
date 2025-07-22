# Advanced Security Features for Self-Hosted Chat Applications

## Executive Summary

This document provides comprehensive security implementation guidelines for Feathur, a self-hosted Discord alternative. It covers authentication mechanisms, encryption protocols, access control, compliance features, and deployment best practices to ensure enterprise-grade security for self-hosted deployments.

## Table of Contents

1. [Two-Factor Authentication (2FA)](#two-factor-authentication-2fa)
2. [OAuth2 and SAML Integration](#oauth2-and-saml-integration)
3. [LDAP/Active Directory Integration](#ldapactive-directory-integration)
4. [End-to-End Encryption](#end-to-end-encryption)
5. [Role-Based Access Control (RBAC)](#role-based-access-control-rbac)
6. [Audit Logging and Compliance](#audit-logging-and-compliance)
7. [Rate Limiting and DDoS Protection](#rate-limiting-and-ddos-protection)
8. [Input Validation and XSS Prevention](#input-validation-and-xss-prevention)
9. [CSRF Protection](#csrf-protection)
10. [Security Headers and HTTPS Configuration](#security-headers-and-https-configuration)
11. [Implementation Roadmap](#implementation-roadmap)
12. [Security Best Practices](#security-best-practices)

---

## Two-Factor Authentication (2FA)

### Overview
Two-factor authentication adds an extra layer of security by requiring users to provide two different authentication factors to verify their identity.

### TOTP (Time-based One-Time Password) Implementation

#### Go Implementation Example:
```go
package auth

import (
    "github.com/pquerna/otp/totp"
    "github.com/pquerna/otp/qr"
    "encoding/base64"
    "bytes"
)

type TOTPService struct {
    Issuer string
}

func (s *TOTPService) GenerateTOTPSecret(userEmail string) (string, string, error) {
    key, err := totp.Generate(totp.GenerateOpts{
        Issuer:      s.Issuer,
        AccountName: userEmail,
        Period:      30,
        SecretSize:  32,
        Algorithm:   otp.AlgorithmSHA256,
    })
    if err != nil {
        return "", "", err
    }

    // Generate QR code
    var buf bytes.Buffer
    img, err := key.Image(200, 200)
    if err != nil {
        return "", "", err
    }
    
    // Convert to base64 for client
    qr.Encode(&buf, key.URL(), qr.M)
    qrBase64 := base64.StdEncoding.EncodeToString(buf.Bytes())
    
    return key.Secret(), qrBase64, nil
}

func (s *TOTPService) ValidateTOTP(secret, code string) bool {
    return totp.Validate(code, secret)
}
```

#### Database Schema:
```sql
CREATE TABLE user_2fa (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    totp_secret TEXT,
    backup_codes TEXT, -- JSON array of hashed backup codes
    email_verified BOOLEAN DEFAULT FALSE,
    sms_number TEXT,
    sms_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### SMS-based 2FA Implementation

#### Integration with Twilio:
```go
import (
    "github.com/twilio/twilio-go"
    openapi "github.com/twilio/twilio-go/rest/verify/v2"
)

type SMSService struct {
    client *twilio.RestClient
    serviceID string
}

func (s *SMSService) SendVerificationCode(phoneNumber string) error {
    params := &openapi.CreateVerificationParams{}
    params.SetTo(phoneNumber)
    params.SetChannel("sms")
    
    _, err := s.client.VerifyV2.CreateVerification(s.serviceID, params)
    return err
}

func (s *SMSService) VerifyCode(phoneNumber, code string) (bool, error) {
    params := &openapi.CreateVerificationCheckParams{}
    params.SetTo(phoneNumber)
    params.SetCode(code)
    
    resp, err := s.client.VerifyV2.CreateVerificationCheck(s.serviceID, params)
    if err != nil {
        return false, err
    }
    
    return *resp.Status == "approved", nil
}
```

### Email-based 2FA

#### Implementation with Rate Limiting:
```go
type EmailOTPService struct {
    emailSender EmailSender
    cache       Cache
    rateLimit   *RateLimiter
}

func (s *EmailOTPService) SendOTP(userID int, email string) error {
    // Check rate limit
    if !s.rateLimit.Allow(fmt.Sprintf("email_otp:%d", userID)) {
        return ErrRateLimitExceeded
    }
    
    // Generate 6-digit code
    code := fmt.Sprintf("%06d", rand.Intn(999999))
    
    // Store in cache with 10-minute expiry
    key := fmt.Sprintf("otp:%d", userID)
    s.cache.Set(key, code, 10*time.Minute)
    
    // Send email
    return s.emailSender.Send(email, "Your Feathur verification code", 
        fmt.Sprintf("Your verification code is: %s", code))
}
```

---

## OAuth2 and SAML Integration

### OAuth2 Implementation

#### OAuth2 Provider Configuration:
```go
type OAuth2Config struct {
    Provider     string
    ClientID     string
    ClientSecret string
    RedirectURL  string
    Scopes       []string
}

type OAuth2Service struct {
    providers map[string]*oauth2.Config
}

func (s *OAuth2Service) RegisterProvider(name string, config OAuth2Config) {
    s.providers[name] = &oauth2.Config{
        ClientID:     config.ClientID,
        ClientSecret: config.ClientSecret,
        RedirectURL:  config.RedirectURL,
        Scopes:       config.Scopes,
        Endpoint:     s.getEndpoint(config.Provider),
    }
}

func (s *OAuth2Service) getEndpoint(provider string) oauth2.Endpoint {
    switch provider {
    case "google":
        return google.Endpoint
    case "github":
        return github.Endpoint
    case "microsoft":
        return microsoft.Endpoint
    default:
        // Custom provider
        return oauth2.Endpoint{
            AuthURL:  os.Getenv(fmt.Sprintf("%s_AUTH_URL", provider)),
            TokenURL: os.Getenv(fmt.Sprintf("%s_TOKEN_URL", provider)),
        }
    }
}
```

#### OAuth2 Flow Handler:
```go
func (s *Server) handleOAuth2Login(c *gin.Context) {
    provider := c.Param("provider")
    config, exists := s.oauth2.providers[provider]
    if !exists {
        c.JSON(400, gin.H{"error": "Invalid provider"})
        return
    }
    
    // Generate state token for CSRF protection
    state := s.auth.GenerateRandomString(32)
    c.SetCookie("oauth_state", state, 300, "/", "", true, true)
    
    url := config.AuthCodeURL(state, oauth2.AccessTypeOffline)
    c.Redirect(302, url)
}

func (s *Server) handleOAuth2Callback(c *gin.Context) {
    // Verify state
    state := c.Query("state")
    storedState, _ := c.Cookie("oauth_state")
    if state != storedState {
        c.JSON(400, gin.H{"error": "Invalid state"})
        return
    }
    
    // Exchange code for token
    code := c.Query("code")
    token, err := config.Exchange(context.Background(), code)
    if err != nil {
        c.JSON(500, gin.H{"error": "Token exchange failed"})
        return
    }
    
    // Get user info and create/update user
    userInfo, err := s.getUserInfo(provider, token)
    if err != nil {
        c.JSON(500, gin.H{"error": "Failed to get user info"})
        return
    }
    
    // Create or update user in database
    user, err := s.db.FindOrCreateOAuthUser(provider, userInfo)
    if err != nil {
        c.JSON(500, gin.H{"error": "Failed to create user"})
        return
    }
    
    // Generate JWT
    jwtToken, err := s.auth.GenerateToken(user.ID, user.Username)
    c.JSON(200, gin.H{"token": jwtToken})
}
```

### SAML 2.0 Integration

#### SAML Service Provider Implementation:
```go
import (
    "github.com/crewjam/saml/samlsp"
)

type SAMLConfig struct {
    EntityID            string
    MetadataURL         string
    AcsURL              string
    Certificate         string
    PrivateKey          string
    IDPMetadataURL      string
}

func (s *Server) setupSAML(config SAMLConfig) error {
    keyPair, err := tls.LoadX509KeyPair(config.Certificate, config.PrivateKey)
    if err != nil {
        return err
    }
    
    idpMetadataURL, err := url.Parse(config.IDPMetadataURL)
    if err != nil {
        return err
    }
    
    rootURL, _ := url.Parse(config.EntityID)
    
    samlSP, err := samlsp.New(samlsp.Options{
        URL:               *rootURL,
        Key:               keyPair.PrivateKey.(*rsa.PrivateKey),
        Certificate:       keyPair.Certificate[0],
        IDPMetadataURL:    idpMetadataURL,
        AllowIDPInitiated: true,
    })
    
    if err != nil {
        return err
    }
    
    // Mount SAML endpoints
    s.router.GET("/saml/metadata", gin.WrapH(samlSP.Metadata()))
    s.router.POST("/saml/acs", gin.WrapH(samlSP))
    
    return nil
}
```

---

## LDAP/Active Directory Integration

### LDAP Authentication Service

```go
import (
    "github.com/go-ldap/ldap/v3"
)

type LDAPConfig struct {
    Host         string
    Port         int
    UseTLS       bool
    BindDN       string
    BindPassword string
    UserBaseDN   string
    UserFilter   string
    GroupBaseDN  string
    GroupFilter  string
    Attributes   []string
}

type LDAPService struct {
    config LDAPConfig
}

func (s *LDAPService) Authenticate(username, password string) (*LDAPUser, error) {
    l, err := s.connect()
    if err != nil {
        return nil, err
    }
    defer l.Close()
    
    // Search for user
    searchRequest := ldap.NewSearchRequest(
        s.config.UserBaseDN,
        ldap.ScopeWholeSubtree, ldap.NeverDerefAliases, 0, 0, false,
        fmt.Sprintf(s.config.UserFilter, ldap.EscapeFilter(username)),
        s.config.Attributes,
        nil,
    )
    
    result, err := l.Search(searchRequest)
    if err != nil {
        return nil, err
    }
    
    if len(result.Entries) != 1 {
        return nil, ErrUserNotFound
    }
    
    userDN := result.Entries[0].DN
    
    // Attempt bind with user credentials
    err = l.Bind(userDN, password)
    if err != nil {
        return nil, ErrInvalidCredentials
    }
    
    // Get user groups
    groups, err := s.getUserGroups(l, userDN)
    if err != nil {
        return nil, err
    }
    
    return &LDAPUser{
        DN:         userDN,
        Username:   result.Entries[0].GetAttributeValue("sAMAccountName"),
        Email:      result.Entries[0].GetAttributeValue("mail"),
        FirstName:  result.Entries[0].GetAttributeValue("givenName"),
        LastName:   result.Entries[0].GetAttributeValue("sn"),
        Groups:     groups,
    }, nil
}

func (s *LDAPService) SyncUsers() error {
    l, err := s.connect()
    if err != nil {
        return err
    }
    defer l.Close()
    
    // Bind with service account
    err = l.Bind(s.config.BindDN, s.config.BindPassword)
    if err != nil {
        return err
    }
    
    // Search all users
    searchRequest := ldap.NewSearchRequest(
        s.config.UserBaseDN,
        ldap.ScopeWholeSubtree, ldap.NeverDerefAliases, 0, 0, false,
        "(objectClass=person)",
        s.config.Attributes,
        nil,
    )
    
    result, err := l.Search(searchRequest)
    if err != nil {
        return err
    }
    
    // Sync users to database
    for _, entry := range result.Entries {
        user := LDAPUser{
            DN:        entry.DN,
            Username:  entry.GetAttributeValue("sAMAccountName"),
            Email:     entry.GetAttributeValue("mail"),
            FirstName: entry.GetAttributeValue("givenName"),
            LastName:  entry.GetAttributeValue("sn"),
        }
        
        // Create or update user in database
        s.db.SyncLDAPUser(user)
    }
    
    return nil
}
```

### Active Directory Group Mapping

```go
type ADGroupMapping struct {
    ADGroup     string
    FeathurRole string
    Permissions []string
}

func (s *LDAPService) MapADGroupsToRoles(mappings []ADGroupMapping) {
    for _, mapping := range mappings {
        s.groupMappings[mapping.ADGroup] = mapping
    }
}

func (s *LDAPService) GetUserRoles(userGroups []string) []Role {
    var roles []Role
    
    for _, group := range userGroups {
        if mapping, exists := s.groupMappings[group]; exists {
            roles = append(roles, Role{
                Name:        mapping.FeathurRole,
                Permissions: mapping.Permissions,
            })
        }
    }
    
    return roles
}
```

---

## End-to-End Encryption

### Message Encryption Architecture

#### Signal Protocol Implementation:
```go
type E2EEncryption struct {
    store SignalProtocolStore
}

type EncryptedMessage struct {
    SenderID      int    `json:"sender_id"`
    RecipientID   int    `json:"recipient_id"`
    CiphertextType int   `json:"ciphertext_type"`
    Ciphertext    []byte `json:"ciphertext"`
    Timestamp     int64  `json:"timestamp"`
}

func (e *E2EEncryption) EncryptMessage(senderID, recipientID int, plaintext []byte) (*EncryptedMessage, error) {
    // Get or create session
    session, err := e.store.LoadSession(recipientID)
    if err != nil {
        // Create new session with pre-key bundle
        bundle, err := e.fetchPreKeyBundle(recipientID)
        if err != nil {
            return nil, err
        }
        
        session, err = e.createSession(bundle)
        if err != nil {
            return nil, err
        }
    }
    
    // Encrypt message
    ciphertext, err := session.Encrypt(plaintext)
    if err != nil {
        return nil, err
    }
    
    return &EncryptedMessage{
        SenderID:       senderID,
        RecipientID:    recipientID,
        CiphertextType: ciphertext.Type(),
        Ciphertext:     ciphertext.Serialize(),
        Timestamp:      time.Now().Unix(),
    }, nil
}
```

#### Key Management:
```go
type KeyManager struct {
    db *database.Database
}

func (km *KeyManager) GenerateIdentityKeyPair(userID int) error {
    // Generate identity key pair
    identityKeyPair, err := GenerateIdentityKeyPair()
    if err != nil {
        return err
    }
    
    // Generate signed pre-key
    signedPreKey, err := GenerateSignedPreKey(identityKeyPair, 1)
    if err != nil {
        return err
    }
    
    // Generate one-time pre-keys
    var preKeys []PreKey
    for i := 0; i < 100; i++ {
        preKey, err := GeneratePreKey(i)
        if err != nil {
            return err
        }
        preKeys = append(preKeys, preKey)
    }
    
    // Store in database
    return km.db.StoreUserKeys(userID, identityKeyPair, signedPreKey, preKeys)
}
```

### File Encryption

```go
type FileEncryption struct {
    keySize int
}

func (fe *FileEncryption) EncryptFile(plaintext []byte, recipientPublicKeys [][]byte) (*EncryptedFile, error) {
    // Generate random AES key
    aesKey := make([]byte, fe.keySize)
    if _, err := rand.Read(aesKey); err != nil {
        return nil, err
    }
    
    // Encrypt file with AES
    block, err := aes.NewCipher(aesKey)
    if err != nil {
        return nil, err
    }
    
    gcm, err := cipher.NewGCM(block)
    if err != nil {
        return nil, err
    }
    
    nonce := make([]byte, gcm.NonceSize())
    if _, err := rand.Read(nonce); err != nil {
        return nil, err
    }
    
    ciphertext := gcm.Seal(nonce, nonce, plaintext, nil)
    
    // Encrypt AES key for each recipient
    var encryptedKeys []EncryptedKey
    for i, publicKey := range recipientPublicKeys {
        encKey, err := rsa.EncryptOAEP(sha256.New(), rand.Reader, publicKey, aesKey, nil)
        if err != nil {
            return nil, err
        }
        
        encryptedKeys = append(encryptedKeys, EncryptedKey{
            RecipientID: i,
            Key:         encKey,
        })
    }
    
    return &EncryptedFile{
        Ciphertext:    ciphertext,
        EncryptedKeys: encryptedKeys,
    }, nil
}
```

---

## Role-Based Access Control (RBAC)

### RBAC Model Implementation

```go
type Permission string

const (
    // Server permissions
    PermServerView   Permission = "server.view"
    PermServerManage Permission = "server.manage"
    PermServerDelete Permission = "server.delete"
    
    // Channel permissions
    PermChannelView    Permission = "channel.view"
    PermChannelSend    Permission = "channel.send"
    PermChannelManage  Permission = "channel.manage"
    PermChannelDelete  Permission = "channel.delete"
    
    // User permissions
    PermUserKick    Permission = "user.kick"
    PermUserBan     Permission = "user.ban"
    PermUserManage  Permission = "user.manage"
    
    // Voice permissions
    PermVoiceConnect Permission = "voice.connect"
    PermVoiceSpeak   Permission = "voice.speak"
    PermVoiceMute    Permission = "voice.mute"
)

type Role struct {
    ID          int          `json:"id"`
    Name        string       `json:"name"`
    Color       string       `json:"color"`
    Position    int          `json:"position"`
    Permissions []Permission `json:"permissions"`
    Mentionable bool        `json:"mentionable"`
}

type RBACService struct {
    db    *database.Database
    cache Cache
}

func (r *RBACService) CheckPermission(userID int, serverID int, permission Permission) bool {
    // Check cache first
    cacheKey := fmt.Sprintf("perm:%d:%d:%s", userID, serverID, permission)
    if cached, exists := r.cache.Get(cacheKey); exists {
        return cached.(bool)
    }
    
    // Get user roles
    roles, err := r.db.GetUserRoles(userID, serverID)
    if err != nil {
        return false
    }
    
    // Check if user is server owner
    server, err := r.db.GetServer(serverID)
    if err == nil && server.OwnerID == userID {
        r.cache.Set(cacheKey, true, 5*time.Minute)
        return true
    }
    
    // Check role permissions
    for _, role := range roles {
        for _, perm := range role.Permissions {
            if perm == permission || perm == "administrator" {
                r.cache.Set(cacheKey, true, 5*time.Minute)
                return true
            }
        }
    }
    
    r.cache.Set(cacheKey, false, 5*time.Minute)
    return false
}
```

### Permission Inheritance

```go
type PermissionOverride struct {
    ID     int          `json:"id"`
    Type   string       `json:"type"` // "role" or "member"
    Allow  []Permission `json:"allow"`
    Deny   []Permission `json:"deny"`
}

func (r *RBACService) CalculatePermissions(userID, channelID int) []Permission {
    channel, _ := r.db.GetChannel(channelID)
    server, _ := r.db.GetServer(channel.ServerID)
    
    // Start with @everyone role permissions
    basePermissions := r.getEveryonePermissions(server.ID)
    
    // Apply role permissions
    userRoles, _ := r.db.GetUserRoles(userID, server.ID)
    for _, role := range userRoles {
        basePermissions = r.applyPermissions(basePermissions, role.Permissions, nil)
    }
    
    // Apply channel-specific overrides
    overrides, _ := r.db.GetChannelOverrides(channelID)
    for _, override := range overrides {
        if override.Type == "role" {
            // Check if user has this role
            for _, role := range userRoles {
                if role.ID == override.ID {
                    basePermissions = r.applyPermissions(basePermissions, override.Allow, override.Deny)
                }
            }
        } else if override.Type == "member" && override.ID == userID {
            // User-specific override
            basePermissions = r.applyPermissions(basePermissions, override.Allow, override.Deny)
        }
    }
    
    return basePermissions
}
```

---

## Audit Logging and Compliance

### Comprehensive Audit System

```go
type AuditLog struct {
    ID          int                    `json:"id"`
    Timestamp   time.Time              `json:"timestamp"`
    UserID      int                    `json:"user_id"`
    Action      string                 `json:"action"`
    Resource    string                 `json:"resource"`
    ResourceID  int                    `json:"resource_id"`
    IPAddress   string                 `json:"ip_address"`
    UserAgent   string                 `json:"user_agent"`
    Changes     map[string]interface{} `json:"changes"`
    Status      string                 `json:"status"` // success, failure
    ErrorDetail string                 `json:"error_detail,omitempty"`
}

type AuditService struct {
    db        *database.Database
    queue     chan AuditLog
    retention time.Duration
}

func (a *AuditService) LogAction(ctx context.Context, action string, resource string, resourceID int, changes map[string]interface{}) {
    // Extract request metadata
    ginCtx := ctx.Value("gin").(*gin.Context)
    userID := ctx.Value("user_id").(int)
    
    log := AuditLog{
        Timestamp:  time.Now(),
        UserID:     userID,
        Action:     action,
        Resource:   resource,
        ResourceID: resourceID,
        IPAddress:  ginCtx.ClientIP(),
        UserAgent:  ginCtx.GetHeader("User-Agent"),
        Changes:    changes,
        Status:     "success",
    }
    
    // Non-blocking write to queue
    select {
    case a.queue <- log:
    default:
        // Queue full, log to error
        log.Printf("Audit queue full, dropping log: %+v", log)
    }
}

func (a *AuditService) Start() {
    go func() {
        batch := make([]AuditLog, 0, 100)
        ticker := time.NewTicker(5 * time.Second)
        
        for {
            select {
            case log := <-a.queue:
                batch = append(batch, log)
                
                if len(batch) >= 100 {
                    a.writeBatch(batch)
                    batch = batch[:0]
                }
                
            case <-ticker.C:
                if len(batch) > 0 {
                    a.writeBatch(batch)
                    batch = batch[:0]
                }
            }
        }
    }()
    
    // Start retention cleanup
    go a.cleanupOldLogs()
}
```

### Compliance Features

#### GDPR Compliance:
```go
type GDPRService struct {
    db    *database.Database
    audit *AuditService
}

func (g *GDPRService) ExportUserData(userID int) (*UserDataExport, error) {
    export := &UserDataExport{
        ExportDate: time.Now(),
        UserID:     userID,
    }
    
    // Export user profile
    user, err := g.db.GetUser(userID)
    if err != nil {
        return nil, err
    }
    export.Profile = user
    
    // Export messages
    messages, err := g.db.GetAllUserMessages(userID)
    if err != nil {
        return nil, err
    }
    export.Messages = messages
    
    // Export files
    files, err := g.db.GetUserFiles(userID)
    if err != nil {
        return nil, err
    }
    export.Files = files
    
    // Export audit logs
    auditLogs, err := g.db.GetUserAuditLogs(userID)
    if err != nil {
        return nil, err
    }
    export.AuditLogs = auditLogs
    
    // Log the export
    g.audit.LogAction(context.Background(), "gdpr.export", "user", userID, nil)
    
    return export, nil
}

func (g *GDPRService) DeleteUserData(userID int, retainAuditLogs bool) error {
    // Begin transaction
    tx, err := g.db.Begin()
    if err != nil {
        return err
    }
    defer tx.Rollback()
    
    // Delete messages
    if err := tx.AnonymizeUserMessages(userID); err != nil {
        return err
    }
    
    // Delete files
    if err := tx.DeleteUserFiles(userID); err != nil {
        return err
    }
    
    // Delete or anonymize user profile
    if err := tx.AnonymizeUser(userID); err != nil {
        return err
    }
    
    // Optionally retain audit logs for legal compliance
    if !retainAuditLogs {
        if err := tx.DeleteUserAuditLogs(userID); err != nil {
            return err
        }
    }
    
    // Commit transaction
    if err := tx.Commit(); err != nil {
        return err
    }
    
    // Log the deletion
    g.audit.LogAction(context.Background(), "gdpr.delete", "user", userID, 
        map[string]interface{}{"retain_audit": retainAuditLogs})
    
    return nil
}
```

---

## Rate Limiting and DDoS Protection

### Multi-Layer Rate Limiting

```go
import (
    "github.com/ulule/limiter/v3"
    "github.com/ulule/limiter/v3/drivers/store/memory"
    "github.com/ulule/limiter/v3/drivers/store/redis"
)

type RateLimitConfig struct {
    // Global limits
    RequestsPerSecond   int
    RequestsPerMinute   int
    RequestsPerHour     int
    
    // Endpoint-specific limits
    LoginAttemptsPerHour     int
    MessagesSentPerMinute    int
    FileUploadsPerHour       int
    APICallsPerMinute        int
    
    // WebSocket limits
    WSConnectionsPerIP       int
    WSMessagesPerSecond      int
}

type RateLimiter struct {
    config    RateLimitConfig
    global    *limiter.Limiter
    endpoints map[string]*limiter.Limiter
    store     limiter.Store
}

func NewRateLimiter(config RateLimitConfig, redisClient *redis.Client) *RateLimiter {
    var store limiter.Store
    if redisClient != nil {
        store, _ = redis.NewStore(redisClient)
    } else {
        store, _ = memory.NewStore()
    }
    
    rl := &RateLimiter{
        config:    config,
        store:     store,
        endpoints: make(map[string]*limiter.Limiter),
    }
    
    // Setup global limiter
    globalRate := limiter.Rate{
        Period: 1 * time.Second,
        Limit:  int64(config.RequestsPerSecond),
    }
    rl.global = limiter.New(store, globalRate)
    
    // Setup endpoint-specific limiters
    rl.setupEndpointLimiters()
    
    return rl
}

func (rl *RateLimiter) Middleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        // Global rate limit
        limiterCtx, err := rl.global.Get(c.Request.Context(), c.ClientIP())
        if err != nil {
            c.JSON(500, gin.H{"error": "Internal server error"})
            c.Abort()
            return
        }
        
        if limiterCtx.Reached {
            c.Header("X-RateLimit-Limit", strconv.FormatInt(limiterCtx.Limit, 10))
            c.Header("X-RateLimit-Remaining", strconv.FormatInt(limiterCtx.Remaining, 10))
            c.Header("X-RateLimit-Reset", strconv.FormatInt(limiterCtx.Reset, 10))
            c.JSON(429, gin.H{"error": "Rate limit exceeded"})
            c.Abort()
            return
        }
        
        // Endpoint-specific rate limit
        endpoint := c.FullPath()
        if limiter, exists := rl.endpoints[endpoint]; exists {
            endpointCtx, err := limiter.Get(c.Request.Context(), c.ClientIP())
            if err != nil {
                c.JSON(500, gin.H{"error": "Internal server error"})
                c.Abort()
                return
            }
            
            if endpointCtx.Reached {
                c.JSON(429, gin.H{"error": "Endpoint rate limit exceeded"})
                c.Abort()
                return
            }
        }
        
        c.Next()
    }
}
```

### DDoS Protection Strategies

```go
type DDoSProtection struct {
    ipWhitelist    map[string]bool
    ipBlacklist    map[string]time.Time
    suspiciousIPs  map[string]int
    connectionPool *ConnectionPool
}

func (d *DDoSProtection) Middleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        ip := c.ClientIP()
        
        // Check whitelist
        if d.ipWhitelist[ip] {
            c.Next()
            return
        }
        
        // Check blacklist
        if blockedUntil, exists := d.ipBlacklist[ip]; exists {
            if time.Now().Before(blockedUntil) {
                c.JSON(403, gin.H{"error": "IP blocked"})
                c.Abort()
                return
            }
            // Remove expired block
            delete(d.ipBlacklist, ip)
        }
        
        // Check for suspicious patterns
        if d.detectSuspiciousActivity(c) {
            d.suspiciousIPs[ip]++
            
            if d.suspiciousIPs[ip] >= 10 {
                // Block IP for 1 hour
                d.ipBlacklist[ip] = time.Now().Add(1 * time.Hour)
                delete(d.suspiciousIPs, ip)
                
                c.JSON(403, gin.H{"error": "Suspicious activity detected"})
                c.Abort()
                return
            }
        }
        
        // Connection pooling
        if !d.connectionPool.Allow(ip) {
            c.JSON(503, gin.H{"error": "Service temporarily unavailable"})
            c.Abort()
            return
        }
        
        c.Next()
    }
}

func (d *DDoSProtection) detectSuspiciousActivity(c *gin.Context) bool {
    // Check for common DDoS patterns
    userAgent := c.GetHeader("User-Agent")
    
    // Empty or suspicious user agents
    if userAgent == "" || strings.Contains(userAgent, "bot") {
        return true
    }
    
    // Rapid sequential requests
    if d.isRapidRequest(c.ClientIP()) {
        return true
    }
    
    // Large payload attacks
    if c.Request.ContentLength > 10*1024*1024 { // 10MB
        return true
    }
    
    return false
}
```

---

## Input Validation and XSS Prevention

### Input Validation Framework

```go
import (
    "github.com/go-playground/validator/v10"
    "github.com/microcosm-cc/bluemonday"
)

type ValidationService struct {
    validator *validator.Validate
    sanitizer *bluemonday.Policy
}

func NewValidationService() *ValidationService {
    v := validator.New()
    
    // Register custom validators
    v.RegisterValidation("username", validateUsername)
    v.RegisterValidation("channelname", validateChannelName)
    v.RegisterValidation("no_sql_injection", validateNoSQLInjection)
    
    // Create HTML sanitizer
    p := bluemonday.UGCPolicy()
    p.AllowAttrs("class").Matching(regexp.MustCompile(`^(mention|emoji|code)$`)).OnElements("span")
    
    return &ValidationService{
        validator: v,
        sanitizer: p,
    }
}

// Custom validators
func validateUsername(fl validator.FieldLevel) bool {
    username := fl.Field().String()
    // Alphanumeric, underscore, dash, 3-32 characters
    matched, _ := regexp.MatchString(`^[a-zA-Z0-9_-]{3,32}$`, username)
    return matched
}

func validateNoSQLInjection(fl validator.FieldLevel) bool {
    value := fl.Field().String()
    // Check for common SQL injection patterns
    sqlPatterns := []string{
        `(?i)(union|select|insert|update|delete|drop|create|alter|exec|script)`,
        `(--|#|\/\*)`,
        `(\x00|\x1a)`, // NULL bytes
    }
    
    for _, pattern := range sqlPatterns {
        if matched, _ := regexp.MatchString(pattern, value); matched {
            return false
        }
    }
    return true
}

// Message validation
type MessageInput struct {
    Content   string   `json:"content" validate:"required,min=1,max=2000,no_sql_injection"`
    ChannelID int      `json:"channel_id" validate:"required,min=1"`
    Mentions  []string `json:"mentions" validate:"dive,username"`
}

func (v *ValidationService) ValidateMessage(input *MessageInput) error {
    if err := v.validator.Struct(input); err != nil {
        return err
    }
    
    // Sanitize HTML content
    input.Content = v.sanitizer.Sanitize(input.Content)
    
    return nil
}
```

### XSS Prevention Middleware

```go
func XSSProtectionMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        // Set security headers
        c.Header("X-XSS-Protection", "1; mode=block")
        c.Header("X-Content-Type-Options", "nosniff")
        
        // Content Security Policy
        csp := []string{
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: https:",
            "font-src 'self'",
            "connect-src 'self' wss:",
            "media-src 'self'",
            "object-src 'none'",
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'",
        }
        c.Header("Content-Security-Policy", strings.Join(csp, "; "))
        
        c.Next()
    }
}

// Output encoding
func (s *Server) renderMessage(message *Message) map[string]interface{} {
    return map[string]interface{}{
        "id":         message.ID,
        "content":    html.EscapeString(message.Content),
        "author":     s.renderUser(message.Author),
        "channel_id": message.ChannelID,
        "timestamp":  message.Timestamp.Format(time.RFC3339),
        "edited":     message.Edited,
    }
}
```

---

## CSRF Protection

### CSRF Token Implementation

```go
import (
    "github.com/gorilla/csrf"
)

type CSRFConfig struct {
    Secret     []byte
    Secure     bool
    HttpOnly   bool
    SameSite   http.SameSite
    MaxAge     int
    CookieName string
}

func (s *Server) setupCSRFProtection(config CSRFConfig) {
    csrfMiddleware := csrf.Protect(
        config.Secret,
        csrf.Secure(config.Secure),
        csrf.HttpOnly(config.HttpOnly),
        csrf.SameSite(csrf.SameSiteMode(config.SameSite)),
        csrf.MaxAge(config.MaxAge),
        csrf.CookieName(config.CookieName),
        csrf.ErrorHandler(http.HandlerFunc(csrfErrorHandler)),
    )
    
    s.router.Use(func(c *gin.Context) {
        // Skip CSRF for API endpoints that use JWT
        if strings.HasPrefix(c.Request.URL.Path, "/api/") {
            authHeader := c.GetHeader("Authorization")
            if strings.HasPrefix(authHeader, "Bearer ") {
                c.Next()
                return
            }
        }
        
        // Apply CSRF protection
        csrfMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            c.Request = r
            c.Next()
        })).ServeHTTP(c.Writer, c.Request)
    })
}

func csrfErrorHandler(w http.ResponseWriter, r *http.Request) {
    w.WriteHeader(http.StatusForbidden)
    json.NewEncoder(w).Encode(map[string]string{
        "error": "CSRF token validation failed",
    })
}

// Double Submit Cookie Pattern for SPA
func (s *Server) handleCSRFToken(c *gin.Context) {
    token := csrf.Token(c.Request)
    c.JSON(200, gin.H{
        "csrf_token": token,
    })
}
```

### SameSite Cookie Protection

```go
func (s *Server) setSecureCookie(c *gin.Context, name, value string, maxAge int) {
    c.SetSameSite(http.SameSiteStrictMode)
    c.SetCookie(
        name,
        value,
        maxAge,
        "/",
        "", // domain
        true, // secure (HTTPS only)
        true, // httpOnly
    )
}

// Session configuration
type SessionConfig struct {
    Store      sessions.Store
    Secret     []byte
    MaxAge     int
    Secure     bool
    HttpOnly   bool
    SameSite   http.SameSite
}

func (s *Server) setupSessions(config SessionConfig) {
    store := cookie.NewStore(config.Secret)
    
    store.Options = &sessions.Options{
        MaxAge:   config.MaxAge,
        Secure:   config.Secure,
        HttpOnly: config.HttpOnly,
        SameSite: config.SameSite,
        Path:     "/",
    }
    
    s.router.Use(sessions.Sessions("feathur_session", store))
}
```

---

## Security Headers and HTTPS Configuration

### Comprehensive Security Headers

```go
func SecurityHeadersMiddleware(isDevelopment bool) gin.HandlerFunc {
    return func(c *gin.Context) {
        // HSTS (HTTP Strict Transport Security)
        if !isDevelopment {
            c.Header("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload")
        }
        
        // Prevent clickjacking
        c.Header("X-Frame-Options", "DENY")
        c.Header("Content-Security-Policy", "frame-ancestors 'none'")
        
        // Prevent MIME type sniffing
        c.Header("X-Content-Type-Options", "nosniff")
        
        // Referrer Policy
        c.Header("Referrer-Policy", "strict-origin-when-cross-origin")
        
        // Permissions Policy (formerly Feature Policy)
        permissions := []string{
            "accelerometer=()",
            "camera=()",
            "geolocation=()",
            "gyroscope=()",
            "magnetometer=()",
            "microphone=(self)",  // Allow for voice chat
            "payment=()",
            "usb=()",
        }
        c.Header("Permissions-Policy", strings.Join(permissions, ", "))
        
        // Remove server identification
        c.Header("Server", "")
        c.Header("X-Powered-By", "")
        
        c.Next()
    }
}
```

### HTTPS/TLS Configuration

```go
import (
    "crypto/tls"
)

func (s *Server) ConfigureTLS() (*tls.Config, error) {
    return &tls.Config{
        MinVersion: tls.VersionTLS12,
        MaxVersion: tls.VersionTLS13,
        
        // Cipher suites for TLS 1.2
        CipherSuites: []uint16{
            tls.TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384,
            tls.TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384,
            tls.TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305,
            tls.TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305,
            tls.TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256,
            tls.TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256,
        },
        
        // Prefer server cipher suites
        PreferServerCipherSuites: true,
        
        // Curve preferences
        CurvePreferences: []tls.CurveID{
            tls.CurveP256,
            tls.X25519,
        },
        
        // OCSP stapling
        GetCertificate: s.getCertificate,
    }, nil
}

// Automatic certificate management with Let's Encrypt
func (s *Server) setupAutoCert(domains []string) {
    certManager := autocert.Manager{
        Prompt:     autocert.AcceptTOS,
        HostPolicy: autocert.HostWhitelist(domains...),
        Cache:      autocert.DirCache("/var/lib/feathur/certs"),
    }
    
    s.tlsConfig = &tls.Config{
        GetCertificate: certManager.GetCertificate,
        MinVersion:     tls.VersionTLS12,
    }
    
    // HTTP redirect to HTTPS
    go http.ListenAndServe(":80", certManager.HTTPHandler(nil))
}
```

### Nginx Configuration (Reverse Proxy)

```nginx
server {
    listen 443 ssl http2;
    server_name feathur.example.com;
    
    # SSL configuration
    ssl_certificate /etc/nginx/ssl/feathur.crt;
    ssl_certificate_key /etc/nginx/ssl/feathur.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # OCSP stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    ssl_trusted_certificate /etc/nginx/ssl/ca-bundle.crt;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' wss:; media-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self';" always;
    
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=general:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;
    limit_conn_zone $binary_remote_addr zone=addr:10m;
    
    # General rate limit
    limit_req zone=general burst=20 nodelay;
    limit_conn addr 10;
    
    # Proxy configuration
    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Specific rate limit for login endpoint
    location /api/auth/login {
        limit_req zone=login burst=5 nodelay;
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
    
    # WebSocket specific location
    location /ws {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket timeouts
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }
}

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name feathur.example.com;
    return 301 https://$server_name$request_uri;
}
```

---

## Implementation Roadmap

### Phase 1: Foundation Security (Weeks 1-2)
1. **Enhanced Authentication**
   - Implement TOTP 2FA
   - Add backup codes
   - Session management improvements

2. **Basic RBAC**
   - Role creation and management
   - Permission assignment
   - Channel-level permissions

3. **Security Headers**
   - Implement all security headers
   - Configure HTTPS/TLS
   - Set up CSP policies

### Phase 2: Advanced Authentication (Weeks 3-4)
1. **OAuth2 Integration**
   - Google OAuth
   - GitHub OAuth
   - Custom OAuth providers

2. **LDAP/AD Support**
   - Basic LDAP authentication
   - Group synchronization
   - Role mapping

3. **Audit Logging**
   - Core audit system
   - Log retention policies
   - Export capabilities

### Phase 3: Enterprise Features (Weeks 5-6)
1. **SAML 2.0**
   - Service Provider implementation
   - Multiple IdP support
   - Attribute mapping

2. **Advanced RBAC**
   - Permission inheritance
   - Custom permission sets
   - Delegation features

3. **Compliance Features**
   - GDPR tools
   - Data retention policies
   - Compliance reports

### Phase 4: Protection & Encryption (Weeks 7-8)
1. **Rate Limiting**
   - Multi-layer rate limits
   - DDoS protection
   - Adaptive throttling

2. **E2E Encryption**
   - Signal Protocol integration
   - Key management
   - File encryption

3. **Advanced Security**
   - Input validation framework
   - XSS prevention
   - CSRF protection

---

## Security Best Practices

### Development Guidelines

1. **Secure Coding Standards**
   ```go
   // Always validate input
   if err := validator.Validate(input); err != nil {
       return fmt.Errorf("validation failed: %w", err)
   }
   
   // Use parameterized queries
   query := "SELECT * FROM users WHERE id = ?"
   rows, err := db.Query(query, userID)
   
   // Hash sensitive data
   hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
   ```

2. **Dependency Management**
   - Regular security audits with `nancy` or `gosec`
   - Keep dependencies updated
   - Use vendoring for production builds

3. **Error Handling**
   - Never expose internal errors to users
   - Log detailed errors server-side
   - Return generic error messages

### Deployment Security

1. **Infrastructure**
   - Use firewalls to restrict access
   - Enable fail2ban for SSH protection
   - Regular security updates
   - Monitoring and alerting

2. **Database Security**
   - Encrypted connections
   - Strong passwords
   - Regular backups
   - Principle of least privilege

3. **Environment Variables**
   ```bash
   # .env.example
   JWT_SECRET=<random-32-byte-string>
   DB_ENCRYPTION_KEY=<random-32-byte-string>
   OAUTH_CLIENT_SECRET=<oauth-secret>
   LDAP_BIND_PASSWORD=<ldap-password>
   SMTP_PASSWORD=<smtp-password>
   ```

4. **Container Security**
   - Non-root user in Docker
   - Minimal base images
   - Security scanning
   - Read-only filesystems where possible

### Monitoring & Incident Response

1. **Security Monitoring**
   - Failed login attempts
   - Unusual access patterns
   - Rate limit violations
   - Permission escalations

2. **Incident Response Plan**
   - Security team contacts
   - Escalation procedures
   - Communication templates
   - Recovery procedures

3. **Regular Security Audits**
   - Penetration testing
   - Code reviews
   - Dependency scanning
   - Configuration audits

---

## Conclusion

This comprehensive security guide provides enterprise-grade security features for Feathur. The modular implementation allows organizations to enable features based on their specific security requirements and compliance needs. Regular security audits and updates ensure the platform remains secure against evolving threats.

For questions or security concerns, please contact the security team or submit a security issue through the appropriate channels.