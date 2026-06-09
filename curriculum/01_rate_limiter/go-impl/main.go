// Command rate-limiter-go runs the token-bucket rate-limited HTTP service
// described in projects/01_rate_limiter/docs/spec.md.
package main

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"rate-limiter-go/ratelimit"
)

// Config bundles the runtime configuration loaded from environment variables.
// We centralize env access here so the rest of the program never has to call
// os.Getenv — a common source of test flakiness and surprising behavior.
type Config struct {
	Port              string
	Capacity          float64
	RefillPerSecond   float64
	IdleTTL           time.Duration
	CleanupInterval   time.Duration
	ShutdownTimeout   time.Duration
	ReadHeaderTimeout time.Duration
}

// DefaultConfig returns the spec-mandated defaults: 10 tokens, 2 t/s, 1h
// idle TTL, 10-minute cleanup cadence.
func DefaultConfig() Config {
	return Config{
		Port:              "8080",
		Capacity:          10,
		RefillPerSecond:   2,
		IdleTTL:           time.Hour,
		CleanupInterval:   10 * time.Minute,
		ShutdownTimeout:   15 * time.Second,
		ReadHeaderTimeout: 5 * time.Second,
	}
}

// LoadConfig reads the configuration from environment variables, applying
// the defaults for anything unset or unparseable. We never fail the boot on
// bad env — a misconfigured deployment should still start so the operator
// can see the (logged) discrepancy.
func LoadConfig() Config {
	c := DefaultConfig()
	if v := os.Getenv("PORT"); v != "" {
		c.Port = v
	}
	if v := os.Getenv("RL_CAPACITY"); v != "" {
		if f, err := strconv.ParseFloat(v, 64); err == nil && f >= 0 {
			c.Capacity = f
		} else {
			slog.Warn("invalid RL_CAPACITY, using default", "value", v, "default", c.Capacity)
		}
	}
	if v := os.Getenv("RL_REFILL_PER_SEC"); v != "" {
		if f, err := strconv.ParseFloat(v, 64); err == nil && f >= 0 {
			c.RefillPerSecond = f
		} else {
			slog.Warn("invalid RL_REFILL_PER_SEC, using default", "value", v, "default", c.RefillPerSecond)
		}
	}
	if v := os.Getenv("RL_IDLE_TTL_SECONDS"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n >= 0 {
			c.IdleTTL = time.Duration(n) * time.Second
		} else {
			slog.Warn("invalid RL_IDLE_TTL_SECONDS, using default", "value", v, "default_seconds", int(c.IdleTTL.Seconds()))
		}
	}
	if v := os.Getenv("RL_CLEANUP_INTERVAL_SECONDS"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			c.CleanupInterval = time.Duration(n) * time.Second
		} else {
			slog.Warn("invalid RL_CLEANUP_INTERVAL_SECONDS, using default", "value", v, "default_seconds", int(c.CleanupInterval.Seconds()))
		}
	}
	if v := os.Getenv("RL_SHUTDOWN_TIMEOUT_SECONDS"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			c.ShutdownTimeout = time.Duration(n) * time.Second
		}
	}
	return c
}

// loggingHandler wraps an http.Handler to emit a single structured log line
// per request. Using slog keeps the output greppable and easy to ship to any
// log aggregator.
func loggingHandler(log *slog.Logger, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		// Wrap the writer to capture the status code.
		rw := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(rw, r)
		log.Info("request",
			"method", r.Method,
			"path", r.URL.Path,
			"remote", r.RemoteAddr,
			"status", rw.status,
			"duration_ms", time.Since(start).Milliseconds(),
		)
	})
}

// statusRecorder is a tiny http.ResponseWriter wrapper that remembers the
// status code so the logging middleware can include it in the log line.
type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (r *statusRecorder) WriteHeader(code int) {
	r.status = code
	r.ResponseWriter.WriteHeader(code)
}

// buildMux assembles the routes. We don't use http.HandleFunc at package
// level so the handler is fully constructed and testable in isolation.
func buildHandler(rl *ratelimit.RateLimiter, log *slog.Logger) http.Handler {
	mux := http.NewServeMux()
	mux.Handle("/", rl.Middleware(http.HandlerFunc(serveWelcome)))
	mux.Handle("/status", rl.StatusHandler())
	mux.Handle("/healthz", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
	}))
	return loggingHandler(log, mux)
}

// serveWelcome is the limited endpoint body. Kept tiny so middleware headers
// are the interesting part of the response.
func serveWelcome(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]string{
		"message": "Welcome to the rate-limited endpoint!",
	})
}

// run owns the server lifecycle. It is split out from main() so tests can
// drive the same shutdown path without spawning a real process and signals.
// Returns nil on clean shutdown, non-nil on a fatal startup error.
func run(ctx context.Context, cfg Config, log *slog.Logger) error {
	rl := ratelimit.NewRateLimiter(cfg.Capacity, cfg.RefillPerSecond, nil)
	rl.SetIdleTTL(cfg.IdleTTL)

	log.Info("rate limiter configured",
		"port", cfg.Port,
		"capacity", cfg.Capacity,
		"refill_per_sec", cfg.RefillPerSecond,
		"idle_ttl_seconds", int(cfg.IdleTTL.Seconds()),
		"cleanup_interval_seconds", int(cfg.CleanupInterval.Seconds()),
	)

	// Cleanup loop and server shutdown both listen on ctx.
	go rl.CleanupLoop(ctx, cfg.CleanupInterval)

	srv := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           buildHandler(rl, log),
		ReadHeaderTimeout: cfg.ReadHeaderTimeout,
		// Idle/read/write timeouts are conservative defaults; in a real
		// service you'd tune these to the workload.
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Serve in a goroutine so we can wait for the signal.
	errCh := make(chan error, 1)
	go func() {
		log.Info("listening", "addr", srv.Addr)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			errCh <- err
			return
		}
		errCh <- nil
	}()

	select {
	case <-ctx.Done():
		log.Info("shutdown signal received, draining in-flight requests")
	case err := <-errCh:
		if err != nil {
			return err
		}
		return nil
	}

	// Give in-flight requests up to ShutdownTimeout to finish. After that
	// the process exits and the OS closes the listening socket.
	shutdownCtx, cancel := context.WithTimeout(context.Background(), cfg.ShutdownTimeout)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		return err
	}
	log.Info("server stopped cleanly")
	return nil
}

func main() {
	log := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
	slog.SetDefault(log)

	cfg := LoadConfig()

	// Root context cancelled on SIGINT/SIGTERM. Cleanup loop and server
	// shutdown both listen on it.
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	if err := run(ctx, cfg, log); err != nil {
		log.Error("server failed", "err", err.Error())
		os.Exit(1)
	}
}
