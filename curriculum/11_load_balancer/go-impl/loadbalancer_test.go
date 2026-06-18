package loadbalancer

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"
)

func TestRoundRobinWeightedEligibility(t *testing.T) {
	lb, err := New(DefaultConfig([]BackendConfig{{ID: "a", URL: "http://a", Weight: 2}, {ID: "b", URL: "http://b", Weight: 1}}))
	if err != nil {
		t.Fatal(err)
	}
	lb.MarkHealthy("a")
	lb.MarkHealthy("b")
	ids := []string{}
	for i := 0; i < 3; i++ {
		b, ok := lb.SelectBackend()
		if !ok {
			t.Fatal("missing backend")
		}
		ids = append(ids, b.ID)
	}
	if strings.Join(ids, ",") != "a,a,b" {
		t.Fatalf("weighted round robin = %v", ids)
	}
}

func TestLeastConnectionsAndPoolManagement(t *testing.T) {
	lb, err := New(Config{RoutingAlgorithm: LeastConnections, Backends: []BackendConfig{{ID: "b", URL: "http://b"}, {ID: "a", URL: "http://a"}}})
	if err != nil {
		t.Fatal(err)
	}
	lb.MarkHealthy("a")
	lb.MarkHealthy("b")
	selected, ok := lb.SelectBackend()
	if !ok || selected.ID != "a" {
		t.Fatalf("least connections selected %#v ok=%v", selected, ok)
	}
	if err := lb.AddBackend(BackendConfig{ID: "c", URL: "http://c", Weight: 3}); err != nil {
		t.Fatal(err)
	}
	if !lb.RemoveBackend("b") {
		t.Fatal("expected remove")
	}
	if len(lb.Snapshots()) != 2 {
		t.Fatalf("snapshots=%#v", lb.Snapshots())
	}
	if _, err := New(DefaultConfig(nil)); err == nil {
		t.Fatal("expected empty pool error")
	}
}

func TestHealthChecksAndCircuitBreaker(t *testing.T) {
	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusInternalServerError) }))
	defer backend.Close()
	lb, err := New(Config{Backends: []BackendConfig{{ID: "bad", URL: backend.URL}}, FailureThreshold: 1, UnhealthyThreshold: 1, HealthCheckTimeout: time.Second})
	if err != nil {
		t.Fatal(err)
	}
	lb.CheckBackend(context.Background(), "bad")
	s := lb.Snapshots()[0]
	if s.Health != Unhealthy || s.CircuitState != Open {
		t.Fatalf("snapshot=%#v", s)
	}
}

func TestSuccessfulHealthCheckMarksHealthyAndClosesHalfOpenCircuit(t *testing.T) {
	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) }))
	defer backend.Close()
	lb, err := New(Config{Backends: []BackendConfig{{ID: "ok", URL: backend.URL}}, HealthyThreshold: 1, HealthCheckTimeout: time.Second})
	if err != nil {
		t.Fatal(err)
	}
	lb.mu.Lock()
	lb.backends["ok"].CircuitState = HalfOpen
	lb.mu.Unlock()
	lb.CheckBackend(context.Background(), "ok")
	s := lb.Snapshots()[0]
	if s.Health != Healthy || s.CircuitState != Closed {
		t.Fatalf("snapshot=%#v", s)
	}
}

func TestReverseProxyForwardsRequestAndAdminMetrics(t *testing.T) {
	var mu sync.Mutex
	hits := []string{}
	backendA := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/health" {
			w.WriteHeader(http.StatusOK)
			return
		}
		mu.Lock()
		hits = append(hits, "a "+r.Method+" "+r.URL.RequestURI()+" "+r.Header.Get("x-request-id"))
		mu.Unlock()
		w.Header().Set("x-backend", "a")
		_, _ = w.Write([]byte("a"))
	}))
	defer backendA.Close()
	backendB := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/health" {
			w.WriteHeader(http.StatusOK)
			return
		}
		mu.Lock()
		hits = append(hits, "b "+r.Method+" "+r.URL.RequestURI()+" "+r.Header.Get("x-request-id"))
		mu.Unlock()
		_, _ = w.Write([]byte("b"))
	}))
	defer backendB.Close()
	lb, err := New(DefaultConfig([]BackendConfig{{ID: "a", URL: backendA.URL}, {ID: "b", URL: backendB.URL}}))
	if err != nil {
		t.Fatal(err)
	}
	lb.MarkHealthy("a")
	lb.MarkHealthy("b")
	server := httptest.NewServer(lb)
	defer server.Close()
	req, _ := http.NewRequest(http.MethodPost, server.URL+"/demo?x=1", strings.NewReader("body"))
	req.Header.Set("x-request-id", "req-go")
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	_ = res.Body.Close()
	res, err = http.Get(server.URL + "/demo?x=2")
	if err != nil {
		t.Fatal(err)
	}
	_ = res.Body.Close()
	mu.Lock()
	gotHits := strings.Join(hits, "|")
	mu.Unlock()
	if !strings.Contains(gotHits, "a POST /demo?x=1 req-go") || !strings.Contains(gotHits, "b GET /demo?x=2") {
		t.Fatalf("hits=%s", gotHits)
	}
	admin, err := http.Get(server.URL + "/__lb/health")
	if err != nil {
		t.Fatal(err)
	}
	defer admin.Body.Close()
	var body map[string]any
	if err := json.NewDecoder(admin.Body).Decode(&body); err != nil {
		t.Fatal(err)
	}
	if body["status"] != "ok" {
		t.Fatalf("admin=%#v", body)
	}
	metrics := lb.Metrics()
	if metrics.RequestsTotal != 2 || metrics.BackendRequests["a"] != 1 || metrics.BackendRequests["b"] != 1 {
		t.Fatalf("metrics=%#v", metrics)
	}
}

func TestProxyFailureAdminVariantsAndBasePathJoining(t *testing.T) {
	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/demo" {
			t.Fatalf("expected joined upstream path /api/demo, got %s", r.URL.Path)
		}
		_, _ = w.Write([]byte("joined"))
	}))
	defer backend.Close()
	lb, err := New(Config{Backends: []BackendConfig{{ID: "joined", URL: backend.URL + "/api"}, {ID: "down", URL: "http://127.0.0.1:1"}}, FailureThreshold: 1})
	if err != nil {
		t.Fatal(err)
	}
	lb.MarkHealthy("joined")
	lb.MarkHealthy("down")
	server := httptest.NewServer(lb)
	defer server.Close()
	res, err := http.Get(server.URL + "/demo")
	if err != nil {
		t.Fatal(err)
	}
	_ = res.Body.Close()
	if res.StatusCode != http.StatusOK {
		t.Fatalf("joined proxy status=%d", res.StatusCode)
	}
	res, err = http.Get(server.URL + "/fails")
	if err != nil {
		t.Fatal(err)
	}
	_ = res.Body.Close()
	if res.StatusCode != http.StatusBadGateway {
		t.Fatalf("failed proxy status=%d", res.StatusCode)
	}
	for _, path := range []string{"/__lb/backends", "/__lb/metrics", "/__lb/missing"} {
		res, err := http.Get(server.URL + path)
		if err != nil {
			t.Fatal(err)
		}
		_ = res.Body.Close()
	}
	if lb.Snapshots()[1].CircuitState != Open {
		t.Fatalf("passive failure should open down circuit: %#v", lb.Snapshots()[1])
	}
}

func TestShutdownStopsHealthLoop(t *testing.T) {
	lb, err := New(DefaultConfig([]BackendConfig{{ID: "a", URL: "http://127.0.0.1:1"}}))
	if err != nil {
		t.Fatal(err)
	}
	lb.StartHealthChecks()
	if err := lb.Shutdown(context.Background()); err != nil {
		t.Fatal(err)
	}
}
