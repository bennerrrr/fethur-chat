package auth

import (
	"testing"
)

func TestHashPassword(t *testing.T) {
	service := NewService()
	password := "testpassword123"

	hash, err := service.HashPassword(password)
	if err != nil {
		t.Fatalf("Failed to hash password: %v", err)
	}

	if hash == password {
		t.Error("Password hash should not equal original password")
	}

	if len(hash) == 0 {
		t.Error("Password hash should not be empty")
	}
}

func TestCheckPassword(t *testing.T) {
	service := NewService()
	password := "testpassword123"

	hash, err := service.HashPassword(password)
	if err != nil {
		t.Fatalf("Failed to hash password: %v", err)
	}

	// Test correct password
	if !service.CheckPassword(password, hash) {
		t.Error("CheckPassword should return true for correct password")
	}

	// Test incorrect password
	if service.CheckPassword("wrongpassword", hash) {
		t.Error("CheckPassword should return false for incorrect password")
	}
}

func TestGenerateToken(t *testing.T) {
	service := NewService()
	userID := 1
	username := "testuser"

	token, err := service.GenerateToken(userID, username, "user")
	if err != nil {
		t.Fatalf("Failed to generate token: %v", err)
	}

	if len(token) == 0 {
		t.Error("Generated token should not be empty")
	}
}

func TestValidateToken(t *testing.T) {
	service := NewService()
	userID := 1
	username := "testuser"

	token, err := service.GenerateToken(userID, username, "user")
	if err != nil {
		t.Fatalf("Failed to generate token: %v", err)
	}

	// Test valid token
	claims, err := service.ValidateToken(token)
	if err != nil {
		t.Fatalf("Failed to validate token: %v", err)
	}

	if claims.UserID != userID {
		t.Errorf("Expected UserID %d, got %d", userID, claims.UserID)
	}

	if claims.Username != username {
		t.Errorf("Expected Username %s, got %s", username, claims.Username)
	}

	// Test invalid token
	_, err = service.ValidateToken("invalid.token.here")
	if err == nil {
		t.Error("ValidateToken should return error for invalid token")
	}
}

func TestGenerateRandomString(t *testing.T) {
	service := NewService()
	length := 32

	randomString, err := service.GenerateRandomString(length)
	if err != nil {
		t.Fatalf("Failed to generate random string: %v", err)
	}

	if len(randomString) == 0 {
		t.Error("Generated random string should not be empty")
	}

	// Test different lengths
	shortString, err := service.GenerateRandomString(10)
	if err != nil {
		t.Fatalf("Failed to generate short random string: %v", err)
	}

	if len(shortString) == 0 {
		t.Error("Generated short random string should not be empty")
	}
}
