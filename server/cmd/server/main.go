package main

import (
	"log"
	"net/http"
	"os"

	"fethur/internal/server"
	"fethur/internal/database"
	"fethur/internal/auth"
)

func main() {
	// Initialize database
	db, err := database.Init()
	if err != nil {
		log.Fatal("Failed to initialize database:", err)
	}
	defer db.Close()

	// Initialize auth service
	authService := auth.NewService()

	// Initialize server
	srv := server.New(db, authService)

	// Get port from environment or use default
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Starting server on port %s", port)
	log.Fatal(http.ListenAndServe(":"+port, srv.Router()))
} 