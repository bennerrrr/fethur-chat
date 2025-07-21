package main

import (
	"log"
	"net/http"
	"os"
	"time"

	"fethur/internal/auth"
	"fethur/internal/database"
	"fethur/internal/server"
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
		port = "8081"
	}

	// Create HTTP server with timeouts
	httpServer := &http.Server{
		Addr:         ":" + port,
		Handler:      srv.Router(),
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	log.Printf("Starting server on port %s", port)
	log.Fatal(httpServer.ListenAndServe())
}
