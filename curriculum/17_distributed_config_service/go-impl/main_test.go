package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"distributed-config-service-go/config"
	"log/slog"
)

func setupTestServer() (*Server, *http.ServeMux) {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	service := config.NewService()
	server := NewServer(service, logger)
	mux := http.NewServeMux()
	server.RegisterRoutes(mux)
	return server, mux
}

func authed(req *http.Request) *http.Request {
	req.Header.Set("Authorization", "Bearer test-operator")
	return req
}

func TestPutAndGetConfig(t *testing.T) {
	_, mux := setupTestServer()

	body := `{"value":{"maxRetries":3},"contentType":"application/json","reason":"Initial config"}`
	req := authed(httptest.NewRequest(http.MethodPut, "/config/payments.retry_limit", strings.NewReader(body)))
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", w.Code, w.Body.String())
	}

	req = authed(httptest.NewRequest(http.MethodGet, "/config/payments.retry_limit", nil))
	w = httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp["key"] != "payments.retry_limit" {
		t.Errorf("expected key payments.retry_limit, got %s", resp["key"])
	}
}

func TestGetConfigNotFound(t *testing.T) {
	_, mux := setupTestServer()

	req := authed(httptest.NewRequest(http.MethodGet, "/config/nonexistent", nil))
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", w.Code)
	}
}

func TestRollback(t *testing.T) {
	_, mux := setupTestServer()

	body := `{"value":{"maxRetries":3},"contentType":"application/json"}`
	req := authed(httptest.NewRequest(http.MethodPut, "/config/test", strings.NewReader(body)))
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	body = `{"value":{"maxRetries":4},"contentType":"application/json"}`
	req = authed(httptest.NewRequest(http.MethodPut, "/config/test", strings.NewReader(body)))
	w = httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	body = `{"targetVersion":1,"reason":"Rollback"}`
	req = authed(httptest.NewRequest(http.MethodPost, "/config/test/rollback", strings.NewReader(body)))
	w = httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestCreateAndGetFlag(t *testing.T) {
	_, mux := setupTestServer()

	body := `{"enabled":true,"defaultTreatment":"off","treatments":["on","off"],"rolloutPercentage":0,"rolloutSeed":"seed-1"}`
	req := authed(httptest.NewRequest(http.MethodPost, "/flags/feature-x", strings.NewReader(body)))
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", w.Code, w.Body.String())
	}

	req = authed(httptest.NewRequest(http.MethodGet, "/flags/feature-x", nil))
	w = httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
}

func TestEvaluateFlag(t *testing.T) {
	_, mux := setupTestServer()

	body := `{"enabled":true,"defaultTreatment":"off","treatments":["on","off"],"targetingRules":[{"ruleId":"rule-1","priority":1,"attribute":"role","operator":"equals","values":["admin"],"treatment":"on","enabled":true}],"rolloutPercentage":0,"rolloutSeed":"seed-1"}`
	req := authed(httptest.NewRequest(http.MethodPost, "/flags/feature-y", strings.NewReader(body)))
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	body = `{"subject":{"id":"user-123","role":"admin"},"defaultTreatment":"off"}`
	req = authed(httptest.NewRequest(http.MethodPost, "/flags/feature-y/evaluate", strings.NewReader(body)))
	w = httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp["treatment"] != "on" {
		t.Errorf("expected treatment on, got %s", resp["treatment"])
	}
}

func TestHealth(t *testing.T) {
	_, mux := setupTestServer()

	req := httptest.NewRequest(http.MethodGet, "/__config/health", nil)
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
}

func TestMetrics(t *testing.T) {
	_, mux := setupTestServer()

	req := httptest.NewRequest(http.MethodGet, "/__config/metrics", nil)
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
}

func TestInvalidMethod(t *testing.T) {
	_, mux := setupTestServer()

	req := authed(httptest.NewRequest(http.MethodDelete, "/config/test", nil))
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusMethodNotAllowed {
		t.Errorf("expected 405, got %d", w.Code)
	}
}

func TestPutInvalidJSON(t *testing.T) {
	_, mux := setupTestServer()

	req := authed(httptest.NewRequest(http.MethodPut, "/config/test", strings.NewReader("invalid json")))
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestRollbackInvalidJSON(t *testing.T) {
	_, mux := setupTestServer()

	req := authed(httptest.NewRequest(http.MethodPost, "/config/test/rollback", strings.NewReader("invalid json")))
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestEvaluateFlagInvalidJSON(t *testing.T) {
	_, mux := setupTestServer()

	req := authed(httptest.NewRequest(http.MethodPost, "/flags/test/evaluate", strings.NewReader("invalid json")))
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestFlagNotFound(t *testing.T) {
	_, mux := setupTestServer()

	req := authed(httptest.NewRequest(http.MethodGet, "/flags/nonexistent", nil))
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", w.Code)
	}
}

func TestVersionMismatch(t *testing.T) {
	_, mux := setupTestServer()

	body := `{"value":{"maxRetries":3},"contentType":"application/json"}`
	req := authed(httptest.NewRequest(http.MethodPut, "/config/version-test", strings.NewReader(body)))
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	body = `{"value":{"maxRetries":4},"contentType":"application/json","expectedVersion":99}`
	req = authed(httptest.NewRequest(http.MethodPut, "/config/version-test", strings.NewReader(body)))
	w = httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusConflict {
		t.Errorf("expected 409, got %d", w.Code)
	}
}

func TestRollbackVersionNotFound(t *testing.T) {
	_, mux := setupTestServer()

	body := `{"value":{"maxRetries":3},"contentType":"application/json"}`
	req := authed(httptest.NewRequest(http.MethodPut, "/config/rollback-test", strings.NewReader(body)))
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	body = `{"targetVersion":99,"reason":"Rollback"}`
	req = authed(httptest.NewRequest(http.MethodPost, "/config/rollback-test/rollback", strings.NewReader(body)))
	w = httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusGone {
		t.Errorf("expected 410, got %d", w.Code)
	}
}

func TestEvaluateFlagNotFound(t *testing.T) {
	_, mux := setupTestServer()

	body := `{"subject":{"id":"user-123"},"defaultTreatment":"off"}`
	req := authed(httptest.NewRequest(http.MethodPost, "/flags/nonexistent/evaluate", strings.NewReader(body)))
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", w.Code)
	}
}

func TestInvalidURL(t *testing.T) {
	_, mux := setupTestServer()

	req := authed(httptest.NewRequest(http.MethodGet, "/config/", nil))
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestInvalidFlagURL(t *testing.T) {
	_, mux := setupTestServer()

	req := authed(httptest.NewRequest(http.MethodGet, "/flags/", nil))
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestHealthMethodNotAllowed(t *testing.T) {
	_, mux := setupTestServer()

	req := httptest.NewRequest(http.MethodPost, "/__config/health", nil)
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusMethodNotAllowed {
		t.Errorf("expected 405, got %d", w.Code)
	}
}

func TestMetricsMethodNotAllowed(t *testing.T) {
	_, mux := setupTestServer()

	req := httptest.NewRequest(http.MethodPost, "/__config/metrics", nil)
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusMethodNotAllowed {
		t.Errorf("expected 405, got %d", w.Code)
	}
}

func TestProtectedRoutesRequireAuthorization(t *testing.T) {
	_, mux := setupTestServer()

	req := httptest.NewRequest(http.MethodGet, "/config/payments.retry_limit", nil)
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", w.Code)
	}

	req = httptest.NewRequest(http.MethodPost, "/flags/feature-y/evaluate", strings.NewReader(`{"subject":{"id":"user-123"},"defaultTreatment":"off"}`))
	w = httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", w.Code)
	}
}

func BenchmarkPutConfig(b *testing.B) {
	_, mux := setupTestServer()

	payload := []byte(`{"value":{"data":"benchmark"},"contentType":"application/json"}`)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		req := authed(httptest.NewRequest(http.MethodPut, "/config/bench", bytes.NewReader(payload)))
		w := httptest.NewRecorder()
		mux.ServeHTTP(w, req)
		if w.Code != http.StatusCreated {
			b.Fatalf("unexpected status: %d", w.Code)
		}
	}
}
