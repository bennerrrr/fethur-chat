package database

import (
	"testing"
)

func TestInit(t *testing.T) {
	// Test database initialization
	db, err := Init()
	if err != nil {
		t.Fatalf("Failed to initialize database: %v", err)
	}
	defer func() {
		if err := db.Close(); err != nil {
			t.Logf("Error closing database: %v", err)
		}
	}()

	// Test that we can ping the database
	if err := db.Ping(); err != nil {
		t.Fatalf("Failed to ping database: %v", err)
	}

	// Test that tables were created by checking if we can query them
	_, err = db.Query("SELECT name FROM sqlite_master WHERE type='table'")
	if err != nil {
		t.Fatalf("Failed to query database tables: %v", err)
	}
}

func TestDatabaseConnection(t *testing.T) {
	db, err := Init()
	if err != nil {
		t.Fatalf("Failed to initialize database: %v", err)
	}
	defer func() {
		if err := db.Close(); err != nil {
			t.Logf("Error closing database: %v", err)
		}
	}()

	// Test basic query
	rows, err := db.Query("SELECT 1")
	if err != nil {
		t.Fatalf("Failed to execute basic query: %v", err)
	}
	defer func() {
		if err := rows.Close(); err != nil {
			t.Logf("Error closing rows: %v", err)
		}
	}()

	if !rows.Next() {
		t.Error("Expected at least one row from SELECT 1")
	}

	var result int
	if err := rows.Scan(&result); err != nil {
		t.Fatalf("Failed to scan result: %v", err)
	}

	if result != 1 {
		t.Errorf("Expected result 1, got %d", result)
	}
}
