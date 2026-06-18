package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"key-value-store-go/internal/kvstore"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
	port := env("PORT", "8080")
	server := &http.Server{Addr: ":" + port, Handler: kvstore.NewHandler(kvstore.NewStore(kvstore.Config{}, time.Now), logger), ReadHeaderTimeout: 5 * time.Second}

	go func() {
		logger.Info("server_starting", "addr", server.Addr)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Error("server_failed", "error", err)
			os.Exit(1)
		}
	}()

	shutdownSeconds, _ := strconv.Atoi(env("SHUTDOWN_TIMEOUT_SECONDS", "5"))
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	<-ctx.Done()
	shutdownCtx, cancel := context.WithTimeout(context.Background(), time.Duration(shutdownSeconds)*time.Second)
	defer cancel()
	logger.Info("server_stopping")
	if err := server.Shutdown(shutdownCtx); err != nil {
		logger.Error("server_shutdown_failed", "error", err)
		os.Exit(1)
	}
	logger.Info("server_stopped")
}

func env(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
