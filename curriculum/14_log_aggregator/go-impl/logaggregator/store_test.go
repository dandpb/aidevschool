package logaggregator

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestLogStoreIngestAndQuery(t *testing.T) {
	store := NewLogStore(100)
	entry := LogEntry{
		LogID:     "log1",
		Timestamp: time.Now(),
		Level:     "error",
		Message:   "payment failed",
		Source:    LogSource{Service: "payments"},
	}
	store.Ingest(entry)

	if store.Count() != 1 {
		t.Fatalf("expected 1 log, got %d", store.Count())
	}

	results := store.Query([]string{"error"}, "", "", "", "", time.Time{}, time.Time{}, 10, false)
	if len(results) != 1 {
		t.Fatalf("expected 1 result, got %d", len(results))
	}
	if results[0].Message != "payment failed" {
		t.Errorf("unexpected message: %s", results[0].Message)
	}
}

func TestLogStoreQueryByLevel(t *testing.T) {
	store := NewLogStore(100)
	store.Ingest(LogEntry{LogID: "1", Level: "error", Message: "err", Source: LogSource{Service: "svc"}})
	store.Ingest(LogEntry{LogID: "2", Level: "info", Message: "info", Source: LogSource{Service: "svc"}})

	results := store.Query([]string{"error"}, "", "", "", "", time.Time{}, time.Time{}, 10, false)
	if len(results) != 1 {
		t.Fatalf("expected 1 result, got %d", len(results))
	}
	if results[0].Level != "error" {
		t.Errorf("expected error level, got %s", results[0].Level)
	}
}

func TestLogStoreQueryBySource(t *testing.T) {
	store := NewLogStore(100)
	store.Ingest(LogEntry{LogID: "1", Level: "info", Message: "m1", Source: LogSource{Service: "svc1"}})
	store.Ingest(LogEntry{LogID: "2", Level: "info", Message: "m2", Source: LogSource{Service: "svc2"}})

	results := store.Query(nil, "svc1", "", "", "", time.Time{}, time.Time{}, 10, false)
	if len(results) != 1 {
		t.Fatalf("expected 1 result, got %d", len(results))
	}
	if results[0].Source.Service != "svc1" {
		t.Errorf("expected svc1, got %s", results[0].Source.Service)
	}
}

func TestLogStoreQueryByCorrelationID(t *testing.T) {
	store := NewLogStore(100)
	store.Ingest(LogEntry{LogID: "1", Level: "info", Message: "m1", Source: LogSource{Service: "svc"}, CorrelationID: "corr1"})
	store.Ingest(LogEntry{LogID: "2", Level: "info", Message: "m2", Source: LogSource{Service: "svc"}, CorrelationID: "corr2"})

	results := store.Query(nil, "", "corr1", "", "", time.Time{}, time.Time{}, 10, false)
	if len(results) != 1 {
		t.Fatalf("expected 1 result, got %d", len(results))
	}
	if results[0].CorrelationID != "corr1" {
		t.Errorf("expected corr1, got %s", results[0].CorrelationID)
	}
}

func TestLogStoreFullTextSearch(t *testing.T) {
	store := NewLogStore(100)
	store.Ingest(LogEntry{LogID: "1", Level: "info", Message: "payment processed", Source: LogSource{Service: "svc"}})
	store.Ingest(LogEntry{LogID: "2", Level: "info", Message: "user login", Source: LogSource{Service: "svc"}})

	results := store.Query(nil, "", "", "", "payment", time.Time{}, time.Time{}, 10, false)
	if len(results) != 1 {
		t.Fatalf("expected 1 result, got %d", len(results))
	}
	if results[0].Message != "payment processed" {
		t.Errorf("unexpected message: %s", results[0].Message)
	}
}

func TestLogStoreRetention(t *testing.T) {
	store := NewLogStore(100)
	oldEntry := LogEntry{LogID: "1", Timestamp: time.Now().Add(-2 * time.Hour), Level: "info", Message: "old", Source: LogSource{Service: "svc"}}
	newEntry := LogEntry{LogID: "2", Timestamp: time.Now(), Level: "info", Message: "new", Source: LogSource{Service: "svc"}}
	store.Ingest(oldEntry)
	store.Ingest(newEntry)

	store.ApplyRetention(time.Hour)
	if store.Count() != 1 {
		t.Fatalf("expected 1 log after retention, got %d", store.Count())
	}
}

func TestLogStoreRingBuffer(t *testing.T) {
	store := NewLogStore(2)
	store.Ingest(LogEntry{LogID: "1", Level: "info", Message: "m1", Source: LogSource{Service: "svc"}})
	store.Ingest(LogEntry{LogID: "2", Level: "info", Message: "m2", Source: LogSource{Service: "svc"}})
	store.Ingest(LogEntry{LogID: "3", Level: "info", Message: "m3", Source: LogSource{Service: "svc"}})

	if store.Count() != 2 {
		t.Fatalf("expected 2 logs, got %d", store.Count())
	}
}

func TestServerIngest(t *testing.T) {
	server := NewServer()
	entry := LogEntry{
		LogID:     "log1",
		Timestamp: time.Now(),
		Level:     "error",
		Message:   "test error",
		Source:    LogSource{Service: "test"},
	}
	body, _ := json.Marshal(entry)
	req := httptest.NewRequest(http.MethodPost, "/logs", bytes.NewReader(body))
	rec := httptest.NewRecorder()
	server.ServeHTTP(rec, req)

	if rec.Code != http.StatusAccepted {
		t.Fatalf("expected 202, got %d", rec.Code)
	}
}

func TestServerIngestInvalid(t *testing.T) {
	server := NewServer()
	req := httptest.NewRequest(http.MethodPost, "/logs", bytes.NewReader([]byte(`{}`)))
	rec := httptest.NewRecorder()
	server.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rec.Code)
	}
}

func TestServerQuery(t *testing.T) {
	server := NewServer()
	server.store.Ingest(LogEntry{LogID: "1", Level: "error", Message: "err", Source: LogSource{Service: "svc"}})

	req := httptest.NewRequest(http.MethodGet, "/logs?level=error", nil)
	rec := httptest.NewRecorder()
	server.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}

	var body map[string]any
	json.Unmarshal(rec.Body.Bytes(), &body)
	data := body["data"].(map[string]any)
	items := data["items"].([]any)
	if len(items) != 1 {
		t.Fatalf("expected 1 item, got %d", len(items))
	}
}

func TestServerHealth(t *testing.T) {
	server := NewServer()
	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	rec := httptest.NewRecorder()
	server.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
}

func TestServerMetrics(t *testing.T) {
	server := NewServer()
	req := httptest.NewRequest(http.MethodGet, "/metrics", nil)
	rec := httptest.NewRecorder()
	server.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
}

func TestServerTrace(t *testing.T) {
	server := NewServer()
	server.store.Ingest(LogEntry{LogID: "1", Level: "info", Message: "m1", Source: LogSource{Service: "svc"}, TraceID: "trace1"})

	req := httptest.NewRequest(http.MethodGet, "/traces/trace1", nil)
	rec := httptest.NewRecorder()
	server.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
}
