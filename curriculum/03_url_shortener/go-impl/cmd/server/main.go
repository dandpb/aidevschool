package main

import (
	"context"
	"io"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	"url-shortener-go/internal/shortener"
)

func main() {
	os.Exit(exitCode(context.Background(), os.Stdout))
}

func exitCode(parent context.Context, output io.Writer) int {
	if err := run(parent, output); err != nil {
		slog.New(slog.NewJSONHandler(output, nil)).Error("server_failed", "error", err)
		return 1
	}
	return 0
}

func run(parent context.Context, output io.Writer) error {
	logger := slog.New(slog.NewJSONHandler(output, nil))
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	go func() {
		<-parent.Done()
		stop()
	}()
	if err := shortener.Run(ctx, listenAddr(), logger); err != nil {
		return err
	}
	return nil
}

func listenAddr() string {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	return ":" + port
}
