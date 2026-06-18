package main

import (
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"metrics-collector-go/metrics"
)

func main() {
	slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo})))

	srv := metrics.NewServer()
	httpSrv := &http.Server{
		Addr:    ":8080",
		Handler: srv,
	}

	go func() {
		sigCh := make(chan os.Signal, 1)
		signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
		<-sigCh
		ctx, cancel := metrics.NewShutdownContext(10 * time.Second)
		defer cancel()
		httpSrv.Shutdown(ctx)
	}()

	slog.Info("metrics collector listening", "addr", httpSrv.Addr)
	if err := httpSrv.ListenAndServe(); err != http.ErrServerClosed {
		slog.Error("server error", "error", err)
		os.Exit(1)
	}
}
