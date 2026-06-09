package main

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net"
	"net/http"
	"net/http/httptest"
	"os"
	"strconv"
	"strings"
	"testing"
	"time"

	"rate-limiter-go/ratelimit"
)

// TestDefaultConfig pins the spec-mandated defaults so a future refactor
// doesn't silently change the production behavior of the server.
func TestDefaultConfig(t *testing.T) {
	c := DefaultConfig()
	if c.Port != "8080" {
		t.Errorf("Port: got %q, want 8080", c.Port)
	}
	if c.Capacity != 10 {
		t.Errorf("Capacity: got %v, want 10", c.Capacity)
	}
	if c.RefillPerSecond != 2 {
		t.Errorf("RefillPerSecond: got %v, want 2", c.RefillPerSecond)
	}
	if c.IdleTTL != time.Hour {
		t.Errorf("IdleTTL: got %v, want 1h", c.IdleTTL)
	}
	if c.CleanupInterval != 10*time.Minute {
		t.Errorf("CleanupInterval: got %v, want 10m", c.CleanupInterval)
	}
}

// TestLoadConfig_Defaults exercises the "all env unset" path: LoadConfig
// must return DefaultConfig unchanged.
func TestLoadConfig_Defaults(t *testing.T) {
	// Clear all env vars we read so we know we're testing the defaults.
	for _, k := range []string{"PORT", "RL_CAPACITY", "RL_REFILL_PER_SEC", "RL_IDLE_TTL_SECONDS", "RL_CLEANUP_INTERVAL_SECONDS", "RL_SHUTDOWN_TIMEOUT_SECONDS"} {
		t.Setenv(k, "")
		os.Unsetenv(k)
	}
	c := LoadConfig()
	def := DefaultConfig()
	if c.Port != def.Port || c.Capacity != def.Capacity || c.RefillPerSecond != def.RefillPerSecond {
		t.Errorf("LoadConfig with no env should equal DefaultConfig; got %+v vs %+v", c, def)
	}
}

// TestLoadConfig_Overrides proves every env var is honored when set.
func TestLoadConfig_Overrides(t *testing.T) {
	t.Setenv("PORT", "9999")
	t.Setenv("RL_CAPACITY", "42")
	t.Setenv("RL_REFILL_PER_SEC", "5.5")
	t.Setenv("RL_IDLE_TTL_SECONDS", "120")
	t.Setenv("RL_CLEANUP_INTERVAL_SECONDS", "30")
	t.Setenv("RL_SHUTDOWN_TIMEOUT_SECONDS", "5")

	c := LoadConfig()
	if c.Port != "9999" {
		t.Errorf("Port: got %q, want 9999", c.Port)
	}
	if c.Capacity != 42 {
		t.Errorf("Capacity: got %v, want 42", c.Capacity)
	}
	if c.RefillPerSecond != 5.5 {
		t.Errorf("RefillPerSecond: got %v, want 5.5", c.RefillPerSecond)
	}
	if c.IdleTTL != 120*time.Second {
		t.Errorf("IdleTTL: got %v, want 120s", c.IdleTTL)
	}
	if c.CleanupInterval != 30*time.Second {
		t.Errorf("CleanupInterval: got %v, want 30s", c.CleanupInterval)
	}
	if c.ShutdownTimeout != 5*time.Second {
		t.Errorf("ShutdownTimeout: got %v, want 5s", c.ShutdownTimeout)
	}
}

// TestLoadConfig_BadValuesFallBackToDefault verifies the "log + fall back"
// behavior for invalid env. We don't want a malformed env var to crash boot.
func TestLoadConfig_BadValuesFallBackToDefault(t *testing.T) {
	t.Setenv("RL_CAPACITY", "not-a-number")
	t.Setenv("RL_REFILL_PER_SEC", "still-not-a-number")
	t.Setenv("RL_IDLE_TTL_SECONDS", "abc")
	t.Setenv("RL_CLEANUP_INTERVAL_SECONDS", "-1")
	c := LoadConfig()
	if c.Capacity != 10 {
		t.Errorf("Capacity: got %v, want default 10", c.Capacity)
	}
	if c.RefillPerSecond != 2 {
		t.Errorf("RefillPerSecond: got %v, want default 2", c.RefillPerSecond)
	}
	if c.IdleTTL != time.Hour {
		t.Errorf("IdleTTL: got %v, want default 1h", c.IdleTTL)
	}
	if c.CleanupInterval != 10*time.Minute {
		t.Errorf("CleanupInterval: got %v, want default 10m", c.CleanupInterval)
	}
}

// TestServeWelcome_Body verifies the welcome handler's JSON shape matches
// the spec.
func TestServeWelcome_Body(t *testing.T) {
	rec := httptest.NewRecorder()
	serveWelcome(rec, httptest.NewRequest(http.MethodGet, "/", nil))
	body, _ := io.ReadAll(rec.Body)
	var parsed map[string]string
	if err := json.Unmarshal(body, &parsed); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if parsed["message"] != "Welcome to the rate-limited endpoint!" {
		t.Errorf("message: got %q", parsed["message"])
	}
	if ct := rec.Header().Get("Content-Type"); !strings.Contains(ct, "json") {
		t.Errorf("Content-Type: got %q, want json", ct)
	}
}

// TestBuildHandler_Routes wires up a real handler chain and pokes every
// route. This is the "does main.go actually serve what we promise" smoke
// test: it catches a typo in a route registration that unit tests in
// ratelimit can't see.
func TestBuildHandler_Routes(t *testing.T) {
	rl := ratelimit.NewRateLimiter(10, 2, nil)
	log := slog.New(slog.NewTextHandler(io.Discard, nil))
	h := buildHandler(rl, log)

	tests := []struct {
		method     string
		path       string
		remoteAddr string
		wantStatus int
	}{
		{http.MethodGet, "/", "1.2.3.4:1", http.StatusOK},
		{http.MethodGet, "/status", "1.2.3.4:1", http.StatusOK},
		{http.MethodGet, "/healthz", "1.2.3.4:1", http.StatusOK},
	}
	for _, tt := range tests {
		rec := httptest.NewRecorder()
		req := httptest.NewRequest(tt.method, tt.path, nil)
		req.RemoteAddr = tt.remoteAddr
		h.ServeHTTP(rec, req)
		if rec.Code != tt.wantStatus {
			t.Errorf("%s %s: got %d, want %d", tt.method, tt.path, rec.Code, tt.wantStatus)
		}
	}
}

// TestBuildHandler_HealthAlwaysOK is a defense-in-depth check: even if the
// limiter is misconfigured (zero capacity), /healthz must still respond.
func TestBuildHandler_HealthAlwaysOK(t *testing.T) {
	rl := ratelimit.NewRateLimiter(0, 0, nil)
	log := slog.New(slog.NewTextHandler(io.Discard, nil))
	h := buildHandler(rl, log)
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Errorf("healthz: got %d, want 200", rec.Code)
	}
}

// TestLoggingHandler_EmitsLine drives a request through loggingHandler and
// asserts the JSON log line contains the expected fields. We discard the
// actual output destination by writing to a buffer.
func TestLoggingHandler_EmitsLine(t *testing.T) {
	var buf bytes.Buffer
	log := slog.New(slog.NewJSONHandler(&buf, &slog.HandlerOptions{Level: slog.LevelInfo}))

	inner := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusTeapot) // distinctive status for the test
		_, _ = w.Write([]byte("ok"))
	})
	wrapped := loggingHandler(log, inner)

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/some/path", nil)
	req.RemoteAddr = "10.0.0.1:8080"
	wrapped.ServeHTTP(rec, req)

	if rec.Code != http.StatusTeapot {
		t.Fatalf("inner handler not called: got %d", rec.Code)
	}
	out := buf.String()
	if !strings.Contains(out, `"msg":"request"`) {
		t.Errorf("missing request log line, got %q", out)
	}
	if !strings.Contains(out, `"path":"/some/path"`) {
		t.Errorf("missing path field, got %q", out)
	}
	if !strings.Contains(out, `"status":418`) {
		t.Errorf("missing status field (want 418), got %q", out)
	}
	if !strings.Contains(out, `"remote":"10.0.0.1:8080"`) {
		t.Errorf("missing remote field, got %q", out)
	}
}

// TestStatusRecorder_CapturesStatus is a small but important test: the
// logging middleware relies on the recorder intercepting WriteHeader. If
// that interception is broken, every log line says status=200 and we
// can't see real 4xx/5xx.
func TestStatusRecorder_CapturesStatus(t *testing.T) {
	rec := httptest.NewRecorder()
	sr := &statusRecorder{ResponseWriter: rec, status: http.StatusOK}
	sr.WriteHeader(http.StatusBadRequest)
	if sr.status != http.StatusBadRequest {
		t.Errorf("status not captured: got %d, want 400", sr.status)
	}
	if rec.Code != http.StatusBadRequest {
		t.Errorf("underlying writer not called: got %d", rec.Code)
	}
}

// TestRun_GracefulShutdownOnContextCancel exercises the run() function
// directly. We use an ephemeral port, cancel the context after the
// listener is up, and assert that run() returns nil (clean shutdown).
// This covers the parts of main() that were previously untestable.
func TestRun_GracefulShutdownOnContextCancel(t *testing.T) {
	// Pick a free port by binding and immediately releasing.
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("listen: %v", err)
	}
	port := ln.Addr().(*net.TCPAddr).Port
	ln.Close()

	cfg := DefaultConfig()
	cfg.Port = strconv.Itoa(port)
	cfg.CleanupInterval = 50 * time.Millisecond
	cfg.ShutdownTimeout = 2 * time.Second

	log := slog.New(slog.NewTextHandler(io.Discard, nil))

	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan error, 1)
	go func() {
		done <- run(ctx, cfg, log)
	}()

	// Give the server a moment to bind.
	deadline := time.Now().Add(2 * time.Second)
	for time.Now().Before(deadline) {
		c, err := net.DialTimeout("tcp", "127.0.0.1:"+strconv.Itoa(port), 100*time.Millisecond)
		if err == nil {
			c.Close()
			break
		}
		time.Sleep(10 * time.Millisecond)
	}

	// Trigger shutdown.
	cancel()

	select {
	case err := <-done:
		if err != nil {
			t.Errorf("run() returned: %v", err)
		}
	case <-time.After(3 * time.Second):
		t.Fatal("run() did not return within 3s of cancel")
	}
}

// TestRun_ListenErrorReturnsError forces a bind failure by holding the
// port open on 0.0.0.0 (the same address run() uses, since ":port"
// resolves to 0.0.0.0) and then asking run() to bind to the same one.
// run() must return a non-nil error from the errCh path.
func TestRun_ListenErrorReturnsError(t *testing.T) {
	// Hold 0.0.0.0:port — the same address run() uses after Addr parsing.
	// On macOS/BSD binding 127.0.0.1:port does NOT conflict with
	// 0.0.0.0:port, so we have to hold the wildcard.
	ln, err := net.Listen("tcp", "0.0.0.0:0")
	if err != nil {
		t.Fatalf("hold listen: %v", err)
	}
	defer ln.Close()
	port := ln.Addr().(*net.TCPAddr).Port

	cfg := DefaultConfig()
	cfg.Port = strconv.Itoa(port)
	log := slog.New(slog.NewTextHandler(io.Discard, nil))

	// Use a long-lived context; we want the bind error to be selected,
	// not a context timeout.
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	done := make(chan error, 1)
	go func() {
		done <- run(ctx, cfg, log)
	}()

	select {
	case err := <-done:
		if err == nil {
			t.Errorf("expected error from run() with EADDRINUSE, got nil")
		}
	case <-time.After(2 * time.Second):
		t.Fatal("run() did not return within 2s of bind error")
	}
}

// main() uses: build a server, listen on an ephemeral port, hit it, then
// shut it down cleanly. This is the closest thing to an end-to-end test
// we can run inside `go test`.
func TestServer_ListenAndShutdown(t *testing.T) {
	log := slog.New(slog.NewTextHandler(io.Discard, nil))
	rl := ratelimit.NewRateLimiter(10, 2, nil)
	srv := &http.Server{
		Addr:    "127.0.0.1:0", // 0 = ask OS for a free port
		Handler: buildHandler(rl, log),
	}

	// Run ListenAndServe in a goroutine. It will return ErrServerClosed
	// when Shutdown is called, which we treat as success.
	errCh := make(chan error, 1)
	go func() {
		errCh <- srv.ListenAndServe()
	}()

	// Wait for the listener to be ready. We do this by retrying a TCP
	// dial with a short backoff; the bound address is available via
	// the listener that ListenAndServe creates internally, but http.Server
	// doesn't expose it, so we cheat and use a one-shot http.Get.
	addr := ""
	deadline := time.Now().Add(2 * time.Second)
	for time.Now().Before(deadline) {
		// ListenAndServe may not have bound yet; try a request and check
		// the error.
		ln, err := net.Listen("tcp", "127.0.0.1:0")
		if err != nil {
			t.Fatalf("temp listen: %v", err)
		}
		probe := ln.Addr().String()
		ln.Close()
		_ = probe
		// Give ListenAndServe a moment to bind.
		time.Sleep(10 * time.Millisecond)
		// Try to connect to the actual server (we still don't know its
		// addr; use a known port from the test below).
		break
	}

	// Easier approach: bind the listener ourselves, get the address,
	// then run Serve on it. This bypasses the addr discovery problem.
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("listen: %v", err)
	}
	addr = ln.Addr().String()
	serveErr := make(chan error, 1)
	go func() {
		serveErr <- srv.Serve(ln)
	}()

	// Hit the live server.
	resp, err := http.Get("http://" + addr + "/healthz")
	if err != nil {
		t.Fatalf("GET /healthz: %v", err)
	}
	if resp.StatusCode != http.StatusOK {
		t.Errorf("GET /healthz: got %d, want 200", resp.StatusCode)
	}
	resp.Body.Close()

	// Hit the limited endpoint a few times to make sure it actually works.
	resp, err = http.Get("http://" + addr + "/")
	if err != nil {
		t.Fatalf("GET /: %v", err)
	}
	if resp.StatusCode != http.StatusOK {
		t.Errorf("GET /: got %d, want 200", resp.StatusCode)
	}
	resp.Body.Close()

	// Graceful shutdown.
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		t.Errorf("shutdown: %v", err)
	}
	select {
	case err := <-serveErr:
		if err != nil && !errors.Is(err, http.ErrServerClosed) {
			t.Errorf("serve returned: %v", err)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("serve did not return after shutdown")
	}
	_ = errCh // not used in this branch
}
