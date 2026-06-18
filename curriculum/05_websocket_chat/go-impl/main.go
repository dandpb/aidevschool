package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"websocket-chat-go/chat"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	server := newChatServer(chat.DefaultConfig(), logger)
	httpServer := &http.Server{Addr: ":8085", Handler: server.routes(), ReadHeaderTimeout: 5 * time.Second}
	go func() {
		logger.Info("websocket chat server listening", "addr", httpServer.Addr)
		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Error("server failed", "error", err)
			os.Exit(1)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := httpServer.Shutdown(ctx); err != nil {
		logger.Error("shutdown failed", "error", err)
		os.Exit(1)
	}
}
