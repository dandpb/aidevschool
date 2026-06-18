package main

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"distributed-job-scheduler/internal/scheduler"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	slog.SetDefault(logger)

	s := scheduler.NewScheduler("go-node", scheduler.Clock{Now: time.Now})
	s.BecomeLeader([]string{"go-node"}, 30*time.Second)

	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, http.StatusOK, s.Health())
	})
	mux.HandleFunc("POST /jobs", func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			Name         string             `json:"name"`
			Payload      map[string]string  `json:"payload"`
			Interval     string             `json:"interval"`
			Priority     scheduler.Priority `json:"priority"`
			Dependencies []string           `json:"dependencies"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
			return
		}
		job, err := s.Submit(r.Context(), scheduler.JobRequest{Name: req.Name, Payload: req.Payload, Interval: req.Interval, Priority: req.Priority, Dependencies: req.Dependencies})
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, http.StatusAccepted, job)
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	server := &http.Server{Addr: ":" + port, Handler: mux, ReadHeaderTimeout: 5 * time.Second}
	go func() {
		logger.Info("scheduler_started", "addr", server.Addr)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Error("scheduler_failed", "error", err)
			os.Exit(1)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	logger.Info("scheduler_stopping")
	if err := server.Shutdown(ctx); err != nil {
		logger.Error("scheduler_shutdown_failed", "error", err)
		os.Exit(1)
	}
}

func writeJSON(w http.ResponseWriter, status int, body interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(body); err != nil {
		slog.Error("json_encode_failed", "error", err)
	}
}
