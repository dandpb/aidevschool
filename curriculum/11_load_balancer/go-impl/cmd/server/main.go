package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	lb "loadbalancer"
)

func main() {
	raw := os.Getenv("BACKENDS")
	if raw == "" {
		raw = "http://127.0.0.1:9001,http://127.0.0.1:9002"
	}
	parts := strings.Split(raw, ",")
	backends := make([]lb.BackendConfig, 0, len(parts))
	for i, part := range parts {
		backends = append(backends, lb.BackendConfig{ID: string(rune('a' + i)), URL: strings.TrimSpace(part)})
	}
	balancer, err := lb.New(lb.DefaultConfig(backends))
	if err != nil {
		log.Fatal(err)
	}
	balancer.StartHealthChecks()
	server := &http.Server{Addr: ":8080", Handler: balancer, ReadHeaderTimeout: 5 * time.Second}
	go func() {
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal(err)
		}
	}()
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_ = server.Shutdown(ctx)
	_ = balancer.Shutdown(ctx)
}
