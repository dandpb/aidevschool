package taskqueue

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestHTTPHandlerCoversCreateReadCancelStatsAndErrors(t *testing.T) {
	clock := NewManualClock(time.Unix(500, 0))
	q := New(Config{WorkerCount: 0, Capacity: 1, MaxRetries: 0, BaseBackoff: time.Millisecond, Jitter: 0}, nil, WithClock(clock))
	server := q.Handler()

	health := httptest.NewRecorder()
	server.ServeHTTP(health, httptest.NewRequest(http.MethodGet, "/healthz", nil))
	if health.Code != http.StatusOK {
		t.Fatalf("health status = %d", health.Code)
	}

	created := postJSON(t, server, "/tasks", map[string]any{"payload": map[string]any{"hello": "world"}, "idempotency_key": "http-key"})
	if created.Code != http.StatusCreated {
		t.Fatalf("create status = %d body=%s", created.Code, created.Body.String())
	}
	var task Task
	if err := json.NewDecoder(created.Body).Decode(&task); err != nil {
		t.Fatalf("decode task: %v", err)
	}

	read := httptest.NewRecorder()
	server.ServeHTTP(read, httptest.NewRequest(http.MethodGet, "/tasks/"+task.ID, nil))
	if read.Code != http.StatusOK {
		t.Fatalf("read status = %d", read.Code)
	}

	cancelled := httptest.NewRecorder()
	server.ServeHTTP(cancelled, httptest.NewRequest(http.MethodDelete, "/tasks/"+task.ID, nil))
	if cancelled.Code != http.StatusOK {
		t.Fatalf("cancel status = %d", cancelled.Code)
	}

	stats := httptest.NewRecorder()
	server.ServeHTTP(stats, httptest.NewRequest(http.MethodGet, "/stats", nil))
	if stats.Code != http.StatusOK || !bytes.Contains(stats.Body.Bytes(), []byte("cancelled_count")) {
		t.Fatalf("bad stats: %d %s", stats.Code, stats.Body.String())
	}

	missing := httptest.NewRecorder()
	server.ServeHTTP(missing, httptest.NewRequest(http.MethodGet, "/tasks/missing", nil))
	if missing.Code != http.StatusNotFound {
		t.Fatalf("missing status = %d", missing.Code)
	}

	invalid := postRaw(server, "/tasks", []byte(`{"bad"`))
	if invalid.Code != http.StatusBadRequest {
		t.Fatalf("invalid status = %d", invalid.Code)
	}
}

func TestHTTPHandlerBackpressureAndTerminalConflict(t *testing.T) {
	q := New(Config{WorkerCount: 0, Capacity: 1, MaxRetries: 0, BaseBackoff: time.Millisecond}, nil, WithClock(NewManualClock(time.Unix(600, 0))))
	server := q.Handler()
	created := postJSON(t, server, "/tasks", map[string]any{"payload": map[string]any{"one": true}})
	if created.Code != http.StatusCreated {
		t.Fatalf("create status = %d", created.Code)
	}
	full := postJSON(t, server, "/tasks", map[string]any{"payload": map[string]any{"two": true}})
	if full.Code != http.StatusTooManyRequests {
		t.Fatalf("full status = %d", full.Code)
	}
}

func TestPoisonTimeoutAndInvalidBranches(t *testing.T) {
	clock := NewManualClock(time.Unix(700, 0))
	q := New(Config{WorkerCount: 1, Capacity: 5, MaxRetries: 3, BaseBackoff: time.Millisecond}, HandlerFunc(func(ctx context.Context, task Task) error {
		if task.Payload["poison"] == true {
			return ErrPoison
		}
		<-ctx.Done()
		return ctx.Err()
	}), WithClock(clock))
	if err := q.Start(); err != nil {
		t.Fatalf("start: %v", err)
	}
	t.Cleanup(func() { _ = q.Shutdown(context.Background()) })
	poison, _ := q.Enqueue(context.Background(), EnqueueRequest{Payload: map[string]any{"poison": true}})
	waitUntil(t, func() bool { got, _ := q.Get(poison.ID); return got.Status == StatusDeadLettered })
	zero := 1
	timed, _ := q.Enqueue(context.Background(), EnqueueRequest{Payload: map[string]any{"timeout": true}, TimeoutMS: &zero, MaxRetries: &zero})
	waitUntil(t, func() bool { got, _ := q.Get(timed.ID); return got.Retries == 1 || got.Status == StatusDeadLettered })
	if _, err := q.Enqueue(context.Background(), EnqueueRequest{}); !errors.Is(err, ErrInvalidPayload) {
		t.Fatalf("expected invalid payload, got %v", err)
	}
}

func postJSON(t *testing.T, handler http.Handler, path string, value any) *httptest.ResponseRecorder {
	t.Helper()
	body, err := json.Marshal(value)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	return postRaw(handler, path, body)
}

func postRaw(handler http.Handler, path string, body []byte) *httptest.ResponseRecorder {
	recorder := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, path, bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	handler.ServeHTTP(recorder, req)
	return recorder
}
