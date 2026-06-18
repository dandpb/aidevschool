package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"concurrent-task-queue-go/taskqueue"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	queue := taskqueue.New(loadConfig(), taskqueue.HandlerFunc(func(ctx context.Context, task taskqueue.Task) error {
		if poison, _ := task.Payload["poison"].(bool); poison {
			return taskqueue.ErrPoison
		}
		return nil
	}), taskqueue.WithLogger(logger))
	if err := queue.Start(); err != nil {
		logger.Error("start_failed", "error", err)
		os.Exit(1)
	}
	server := &http.Server{Addr: ":" + env("PORT", "8083"), Handler: queue.Handler(), ReadHeaderTimeout: 5 * time.Second}
	go func() {
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			logger.Error("listen_failed", "error", err)
			os.Exit(1)
		}
	}()
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	_ = server.Shutdown(ctx)
	_ = queue.Shutdown(ctx)
}

func loadConfig() taskqueue.Config {
	return taskqueue.Config{WorkerCount: envInt("WORKER_COUNT", 4), Capacity: envInt("QUEUE_CAPACITY", 1000), MaxRetries: envInt("MAX_RETRIES", 3), BaseBackoff: time.Duration(envInt("BASE_BACKOFF_MS", 100)) * time.Millisecond, Jitter: time.Duration(envInt("JITTER_MS", 50)) * time.Millisecond, ShutdownTimeout: 10 * time.Second}
}
func env(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
func envInt(key string, fallback int) int {
	if v, err := strconv.Atoi(os.Getenv(key)); err == nil {
		return v
	}
	return fallback
}
