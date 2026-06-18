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

	"rest-api-auth-go/internal/authapi"
)

func main() {
	cfg := authapi.DefaultConfig()
	if secret := os.Getenv("JWT_SECRET"); secret != "" {
		cfg.JWTSecret = secret
	}
	if raw := os.Getenv("ACCESS_TOKEN_SECONDS"); raw != "" {
		if parsed, err := strconv.Atoi(raw); err == nil {
			cfg.AccessTokenSeconds = parsed
		}
	}
	app := authapi.NewApp(cfg, authapi.RealClock{}, slog.New(slog.NewJSONHandler(os.Stdout, nil)))
	server := &http.Server{Addr: ":8080", Handler: app.Router(), ReadHeaderTimeout: 5 * time.Second}

	go func() {
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("server failed", "error", err)
			os.Exit(1)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := server.Shutdown(ctx); err != nil {
		slog.Error("graceful shutdown failed", "error", err)
	}
}
