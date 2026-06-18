package kvstore

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestHTTPAPI(t *testing.T) {
	store := NewStore(Config{}, time.Now)
	handler := NewHandler(store, nil)

	req := httptest.NewRequest(http.MethodPut, "/v1/kv/name", strings.NewReader(`{"value":{"ok":true},"ttlSeconds":5}`))
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("set status %d body %s", rec.Code, rec.Body.String())
	}

	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/v1/kv/name", nil))
	if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), `"value"`) {
		t.Fatalf("get status %d body %s", rec.Code, rec.Body.String())
	}

	body := bytes.NewBufferString(`{"keys":["name","missing","name"]}`)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, httptest.NewRequest(http.MethodPost, "/v1/mget", body))
	if rec.Code != http.StatusOK || strings.Count(rec.Body.String(), `"found":true`) != 2 {
		t.Fatalf("mget status %d body %s", rec.Code, rec.Body.String())
	}

	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/health", nil))
	var envelope struct {
		OK   bool            `json:"ok"`
		Data json.RawMessage `json:"data"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &envelope); err != nil || !envelope.OK {
		t.Fatalf("health err=%v body=%s", err, rec.Body.String())
	}
}

func TestHTTPInvalidJSONAndNotFound(t *testing.T) {
	handler := NewHandler(NewStore(Config{}, time.Now), nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, httptest.NewRequest(http.MethodPut, "/v1/kv/name", strings.NewReader(`{`)))
	if rec.Code != http.StatusBadRequest || !strings.Contains(rec.Body.String(), ErrInvalidJSON) {
		t.Fatalf("invalid json status %d body %s", rec.Code, rec.Body.String())
	}
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/v1/kv/missing", nil))
	if rec.Code != http.StatusNotFound || !strings.Contains(rec.Body.String(), ErrKeyNotFound) {
		t.Fatalf("missing status %d body %s", rec.Code, rec.Body.String())
	}
}

func TestHTTPRemainingCommands(t *testing.T) {
	handler := NewHandler(NewStore(Config{}, time.Now), nil)
	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, httptest.NewRequest(http.MethodPost, "/v1/mset", strings.NewReader(`{"items":[{"key":"p:1","value":1},{"key":"p:2","value":2}],"ttlSeconds":5}`)))
	if recorder.Code != http.StatusOK {
		t.Fatalf("mset status %d body %s", recorder.Code, recorder.Body.String())
	}

	recorder = httptest.NewRecorder()
	handler.ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, "/v1/keys?prefix=p:&limit=1", nil))
	if recorder.Code != http.StatusOK || !strings.Contains(recorder.Body.String(), `"count":1`) {
		t.Fatalf("keys status %d body %s", recorder.Code, recorder.Body.String())
	}

	recorder = httptest.NewRecorder()
	handler.ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, "/v1/kv/p:1/ttl", nil))
	if recorder.Code != http.StatusOK || !strings.Contains(recorder.Body.String(), `"ttlSeconds"`) {
		t.Fatalf("ttl status %d body %s", recorder.Code, recorder.Body.String())
	}

	recorder = httptest.NewRecorder()
	handler.ServeHTTP(recorder, httptest.NewRequest(http.MethodPost, "/v1/kv/p:1/persist", nil))
	if recorder.Code != http.StatusOK || !strings.Contains(recorder.Body.String(), `"updated":true`) {
		t.Fatalf("persist status %d body %s", recorder.Code, recorder.Body.String())
	}

	recorder = httptest.NewRecorder()
	handler.ServeHTTP(recorder, httptest.NewRequest(http.MethodPost, "/v1/kv/p:2/expire", strings.NewReader(`{"ttlSeconds":10}`)))
	if recorder.Code != http.StatusOK || !strings.Contains(recorder.Body.String(), `"updated":true`) {
		t.Fatalf("expire status %d body %s", recorder.Code, recorder.Body.String())
	}

	recorder = httptest.NewRecorder()
	handler.ServeHTTP(recorder, httptest.NewRequest(http.MethodDelete, "/v1/kv/p:1", nil))
	if recorder.Code != http.StatusOK || !strings.Contains(recorder.Body.String(), `"deleted":1`) {
		t.Fatalf("delete status %d body %s", recorder.Code, recorder.Body.String())
	}

	recorder = httptest.NewRecorder()
	handler.ServeHTTP(recorder, httptest.NewRequest(http.MethodPost, "/v1/flushdb", strings.NewReader(`{}`)))
	if recorder.Code != http.StatusOK || !strings.Contains(recorder.Body.String(), `"deleted":1`) {
		t.Fatalf("flush status %d body %s", recorder.Code, recorder.Body.String())
	}
}

func TestHTTPValidationBranches(t *testing.T) {
	handler := NewHandler(NewStore(Config{}, time.Now), nil)
	cases := []struct {
		name   string
		method string
		path   string
		body   string
		code   int
		want   string
	}{
		{name: "bad limit", method: http.MethodGet, path: "/v1/keys?limit=10001", code: http.StatusBadRequest, want: ErrInvalidLimit},
		{name: "bad mget key", method: http.MethodPost, path: "/v1/mget", body: `{"keys":[""]}`, code: http.StatusBadRequest, want: ErrInvalidKey},
		{name: "duplicate mset", method: http.MethodPost, path: "/v1/mset", body: `{"items":[{"key":"a","value":1},{"key":"a","value":2}]}`, code: http.StatusBadRequest, want: ErrInvalidKey},
		{name: "missing persist", method: http.MethodPost, path: "/v1/kv/missing/persist", code: http.StatusNotFound, want: ErrKeyNotFound},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			recorder := httptest.NewRecorder()
			handler.ServeHTTP(recorder, httptest.NewRequest(tc.method, tc.path, strings.NewReader(tc.body)))
			if recorder.Code != tc.code || !strings.Contains(recorder.Body.String(), tc.want) {
				t.Fatalf("status %d body %s", recorder.Code, recorder.Body.String())
			}
		})
	}
}
