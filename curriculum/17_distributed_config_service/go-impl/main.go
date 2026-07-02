package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"strings"
	"time"

	"distributed-config-service-go/config"
)

type Server struct {
	service *config.Service
	logger  *slog.Logger
}

func NewServer(service *config.Service, logger *slog.Logger) *Server {
	return &Server{service: service, logger: logger}
}

func (s *Server) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("/config/", s.requireAuth(s.handleConfig))
	mux.HandleFunc("/flags/", s.requireAuth(s.handleFlags))
	mux.HandleFunc("/__config/health", s.handleHealth)
	mux.HandleFunc("/__config/metrics", s.handleMetrics)
}

func (s *Server) requireAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if strings.TrimSpace(r.Header.Get("Authorization")) == "" {
			s.writeError(w, http.StatusUnauthorized, "unauthenticated", "Authorization header required")
			return
		}
		next(w, r)
	}
}

func (s *Server) handleConfig(w http.ResponseWriter, r *http.Request) {
	path := strings.Trim(r.URL.Path, "/")
	parts := strings.Split(path, "/")

	if len(parts) < 2 || parts[0] != "config" {
		s.writeError(w, http.StatusBadRequest, "invalid_url", "Invalid URL")
		return
	}

	key := parts[1]

	if len(parts) == 3 && parts[2] == "watch" {
		if r.Method == http.MethodGet {
			s.handleWatch(w, r, key)
			return
		}
	}

	if len(parts) == 3 && parts[2] == "rollback" {
		if r.Method == http.MethodPost {
			s.handleRollback(w, r, key)
			return
		}
	}

	switch r.Method {
	case http.MethodGet:
		s.handleGetConfig(w, r, key)
	case http.MethodPut:
		s.handlePutConfig(w, r, key)
	default:
		s.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Method not allowed")
	}
}

func (s *Server) handleGetConfig(w http.ResponseWriter, r *http.Request, key string) {
	includeHistory := r.URL.Query().Get("includeHistory") == "true"

	entry, err := s.service.Get(key)
	if err != nil {
		if errors.Is(err, config.ErrKeyNotFound) {
			s.writeError(w, http.StatusNotFound, "key_not_found", err.Error())
			return
		}
		s.writeError(w, http.StatusInternalServerError, "internal_error", err.Error())
		return
	}

	if !includeHistory {
		entry.History = nil
	}

	s.writeJSON(w, http.StatusOK, entry)
}

func (s *Server) handlePutConfig(w http.ResponseWriter, r *http.Request, key string) {
	var req struct {
		Value           json.RawMessage `json:"value"`
		ContentType     string          `json:"contentType"`
		ExpectedVersion *int            `json:"expectedVersion"`
		Reason          string          `json:"reason"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.writeError(w, http.StatusBadRequest, "invalid_payload", "Invalid JSON body")
		return
	}

	author := r.Header.Get("Authorization")

	entry, err := s.service.Put(key, req.Value, req.ContentType, req.ExpectedVersion, author, req.Reason)
	if err != nil {
		if errors.Is(err, config.ErrVersionMismatch) {
			s.writeError(w, http.StatusConflict, "version_mismatch", err.Error())
			return
		}
		if errors.Is(err, config.ErrInvalidKey) || errors.Is(err, config.ErrInvalidValue) {
			s.writeError(w, http.StatusBadRequest, "invalid_request", err.Error())
			return
		}
		s.writeError(w, http.StatusInternalServerError, "internal_error", err.Error())
		return
	}

	status := http.StatusCreated
	if entry.Version > 1 {
		status = http.StatusOK
	}

	prevVersion := entry.Version - 1
	s.writeJSON(w, status, map[string]interface{}{
		"key":             entry.Key,
		"version":         entry.Version,
		"previousVersion": prevVersion,
		"logIndex":        entry.LogIndex,
		"committed":       true,
		"updatedAt":       entry.UpdatedAt.Format(time.RFC3339),
	})
}

func (s *Server) handleRollback(w http.ResponseWriter, r *http.Request, key string) {
	var req struct {
		TargetVersion          int    `json:"targetVersion"`
		ExpectedCurrentVersion *int   `json:"expectedCurrentVersion"`
		Reason                 string `json:"reason"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.writeError(w, http.StatusBadRequest, "invalid_payload", "Invalid JSON body")
		return
	}

	author := r.Header.Get("Authorization")

	entry, err := s.service.Rollback(key, req.TargetVersion, req.ExpectedCurrentVersion, author, req.Reason)
	if err != nil {
		if errors.Is(err, config.ErrKeyNotFound) {
			s.writeError(w, http.StatusNotFound, "key_not_found", err.Error())
			return
		}
		if errors.Is(err, config.ErrVersionMismatch) {
			s.writeError(w, http.StatusConflict, "version_mismatch", err.Error())
			return
		}
		if errors.Is(err, config.ErrVersionNotFound) {
			s.writeError(w, http.StatusGone, "version_compacted", err.Error())
			return
		}
		s.writeError(w, http.StatusInternalServerError, "internal_error", err.Error())
		return
	}

	s.writeJSON(w, http.StatusOK, map[string]interface{}{
		"key":                   entry.Key,
		"version":               entry.Version,
		"rolledBackFromVersion": entry.Version - 1,
		"rolledBackToVersion":   req.TargetVersion,
		"logIndex":              entry.LogIndex,
		"committed":             true,
	})
}

func (s *Server) handleWatch(w http.ResponseWriter, r *http.Request, key string) {
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.WriteHeader(http.StatusOK)

	flusher, ok := w.(http.Flusher)
	if !ok {
		s.writeError(w, http.StatusInternalServerError, "internal_error", "Streaming not supported")
		return
	}

	watcher := s.service.Watch(key)
	defer s.service.Unwatch(key, watcher)

	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case event, ok := <-watcher.Channel:
			if !ok {
				return
			}
			data, _ := json.Marshal(event)
			fmt.Fprintf(w, "event: config.changed\n")
			fmt.Fprintf(w, "data: %s\n\n", data)
			flusher.Flush()

		case <-ticker.C:
			fmt.Fprintf(w, "event: config.heartbeat\n")
			fmt.Fprintf(w, "data: {}\n\n")
			flusher.Flush()

		case <-r.Context().Done():
			return
		}
	}
}

func (s *Server) handleFlags(w http.ResponseWriter, r *http.Request) {
	path := strings.Trim(r.URL.Path, "/")
	parts := strings.Split(path, "/")

	if len(parts) < 2 || parts[0] != "flags" {
		s.writeError(w, http.StatusBadRequest, "invalid_url", "Invalid URL")
		return
	}

	flagName := parts[1]

	if len(parts) == 3 && parts[2] == "evaluate" {
		if r.Method == http.MethodPost {
			s.handleEvaluateFlag(w, r, flagName)
			return
		}
	}

	if r.Method == http.MethodPost {
		s.handleCreateFlag(w, r, flagName)
		return
	}

	if r.Method == http.MethodGet {
		s.handleGetFlag(w, r, flagName)
		return
	}

	s.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Method not allowed")
}

func (s *Server) handleCreateFlag(w http.ResponseWriter, r *http.Request, name string) {
	var req config.FeatureFlag
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.writeError(w, http.StatusBadRequest, "invalid_payload", "Invalid JSON body")
		return
	}
	req.Name = name

	flag, err := s.service.CreateFlag(req)
	if err != nil {
		if errors.Is(err, config.ErrInvalidKey) {
			s.writeError(w, http.StatusBadRequest, "invalid_request", err.Error())
			return
		}
		s.writeError(w, http.StatusInternalServerError, "internal_error", err.Error())
		return
	}

	s.writeJSON(w, http.StatusCreated, flag)
}

func (s *Server) handleGetFlag(w http.ResponseWriter, r *http.Request, name string) {
	flag, err := s.service.GetFlag(name)
	if err != nil {
		if errors.Is(err, config.ErrFlagNotFound) {
			s.writeError(w, http.StatusNotFound, "flag_not_found", err.Error())
			return
		}
		s.writeError(w, http.StatusInternalServerError, "internal_error", err.Error())
		return
	}

	s.writeJSON(w, http.StatusOK, flag)
}

func (s *Server) handleEvaluateFlag(w http.ResponseWriter, r *http.Request, name string) {
	var req struct {
		Subject          config.Subject `json:"subject"`
		DefaultTreatment string         `json:"defaultTreatment"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.writeError(w, http.StatusBadRequest, "invalid_payload", "Invalid JSON body")
		return
	}

	result, err := s.service.EvaluateFlag(name, req.Subject, req.DefaultTreatment)
	if err != nil {
		if errors.Is(err, config.ErrFlagNotFound) {
			s.writeError(w, http.StatusNotFound, "flag_not_found", err.Error())
			return
		}
		if errors.Is(err, config.ErrInvalidSubject) {
			s.writeError(w, http.StatusBadRequest, "invalid_subject", err.Error())
			return
		}
		s.writeError(w, http.StatusInternalServerError, "internal_error", err.Error())
		return
	}

	s.writeJSON(w, http.StatusOK, result)
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		s.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Method not allowed")
		return
	}
	s.writeJSON(w, http.StatusOK, s.service.Health())
}

func (s *Server) handleMetrics(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		s.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Method not allowed")
		return
	}
	s.writeJSON(w, http.StatusOK, s.service.Metrics())
}

func (s *Server) writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func (s *Server) writeError(w http.ResponseWriter, status int, code, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"code":    code,
		"message": message,
	})
}

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))

	service := config.NewService()
	server := NewServer(service, logger)

	mux := http.NewServeMux()
	server.RegisterRoutes(mux)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	srv := &http.Server{
		Addr:         ":" + port,
		Handler:      mux,
		ReadTimeout:  5 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	logger.Info("starting server", "addr", srv.Addr)
	if err := srv.ListenAndServe(); err != nil {
		logger.Error("server failed", "error", err)
		os.Exit(1)
	}
}
