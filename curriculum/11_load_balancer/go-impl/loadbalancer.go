package loadbalancer

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"
	"sync"
	"time"
)

type RoutingAlgorithm string
type HealthState string
type CircuitState string

const (
	RoundRobin       RoutingAlgorithm = "round_robin"
	LeastConnections RoutingAlgorithm = "least_connections"
	Healthy          HealthState      = "healthy"
	Unhealthy        HealthState      = "unhealthy"
	Unknown          HealthState      = "unknown"
	Closed           CircuitState     = "closed"
	Open             CircuitState     = "open"
	HalfOpen         CircuitState     = "half_open"
)

type BackendConfig struct {
	ID         string
	URL        string
	Weight     int
	HealthPath string
}

type Config struct {
	RoutingAlgorithm    RoutingAlgorithm
	HealthCheckInterval time.Duration
	HealthCheckTimeout  time.Duration
	HealthyThreshold    int
	UnhealthyThreshold  int
	FailureThreshold    int
	OpenDuration        time.Duration
	Backends            []BackendConfig
}

type BackendSnapshot struct {
	ID                string       `json:"id"`
	URL               string       `json:"url"`
	Weight            int          `json:"weight"`
	Health            HealthState  `json:"health"`
	CircuitState      CircuitState `json:"circuitState"`
	ActiveConnections int          `json:"activeConnections"`
	TotalRequests     int64        `json:"totalRequests"`
	FailedRequests    int64        `json:"failedRequests"`
}

type backendRuntime struct {
	BackendSnapshot
	parsed               *url.URL
	healthPath           string
	consecutiveSuccesses int
	consecutiveFailures  int
	openedAt             time.Time
	halfOpenProbe        bool
}

type Metrics struct {
	RequestsTotal          int64            `json:"requestsTotal"`
	RequestsInFlight       int              `json:"requestsInFlight"`
	ResponsesByStatusClass map[string]int64 `json:"responsesByStatusClass"`
	BackendRequests        map[string]int64 `json:"backendRequests"`
	RoutingAlgorithm       RoutingAlgorithm `json:"routingAlgorithm"`
}

type LoadBalancer struct {
	mu        sync.RWMutex
	backends  map[string]*backendRuntime
	order     []string
	cursor    int
	config    Config
	client    *http.Client
	logger    *slog.Logger
	metrics   Metrics
	startedAt time.Time
	stop      chan struct{}
	once      sync.Once
}

func DefaultConfig(backends []BackendConfig) Config {
	return Config{RoutingAlgorithm: RoundRobin, HealthCheckInterval: time.Second, HealthCheckTimeout: 500 * time.Millisecond, HealthyThreshold: 1, UnhealthyThreshold: 1, FailureThreshold: 2, OpenDuration: time.Second, Backends: backends}
}

func New(cfg Config) (*LoadBalancer, error) {
	if len(cfg.Backends) == 0 {
		return nil, errors.New("at least one backend is required")
	}
	if cfg.RoutingAlgorithm == "" {
		cfg.RoutingAlgorithm = RoundRobin
	}
	if cfg.HealthCheckInterval <= 0 {
		cfg.HealthCheckInterval = time.Second
	}
	if cfg.HealthCheckTimeout <= 0 {
		cfg.HealthCheckTimeout = 500 * time.Millisecond
	}
	if cfg.HealthyThreshold <= 0 {
		cfg.HealthyThreshold = 1
	}
	if cfg.UnhealthyThreshold <= 0 {
		cfg.UnhealthyThreshold = 1
	}
	if cfg.FailureThreshold <= 0 {
		cfg.FailureThreshold = 2
	}
	if cfg.OpenDuration <= 0 {
		cfg.OpenDuration = time.Second
	}
	lb := &LoadBalancer{backends: map[string]*backendRuntime{}, config: cfg, client: &http.Client{Timeout: cfg.HealthCheckTimeout}, logger: slog.Default(), startedAt: time.Now(), stop: make(chan struct{}), metrics: Metrics{ResponsesByStatusClass: map[string]int64{}, BackendRequests: map[string]int64{}, RoutingAlgorithm: cfg.RoutingAlgorithm}}
	for _, backend := range cfg.Backends {
		if err := lb.AddBackend(backend); err != nil {
			return nil, err
		}
	}
	return lb, nil
}

func (lb *LoadBalancer) AddBackend(cfg BackendConfig) error {
	if strings.TrimSpace(cfg.ID) == "" {
		return errors.New("backend id is required")
	}
	if cfg.Weight == 0 {
		cfg.Weight = 1
	}
	if cfg.Weight < 0 {
		return errors.New("backend weight must be >= 1")
	}
	parsed, err := url.Parse(cfg.URL)
	if err != nil || (parsed.Scheme != "http" && parsed.Scheme != "https") {
		return errors.New("backend url must be http(s)")
	}
	if cfg.HealthPath == "" {
		cfg.HealthPath = "/health"
	}
	lb.mu.Lock()
	defer lb.mu.Unlock()
	if _, exists := lb.backends[cfg.ID]; exists {
		return errors.New("duplicate backend id")
	}
	lb.backends[cfg.ID] = &backendRuntime{BackendSnapshot: BackendSnapshot{ID: cfg.ID, URL: strings.TrimRight(parsed.String(), "/"), Weight: cfg.Weight, Health: Unknown, CircuitState: Closed}, parsed: parsed, healthPath: cfg.HealthPath}
	lb.order = append(lb.order, cfg.ID)
	return nil
}

func (lb *LoadBalancer) RemoveBackend(id string) bool {
	lb.mu.Lock()
	defer lb.mu.Unlock()
	if _, ok := lb.backends[id]; !ok {
		return false
	}
	delete(lb.backends, id)
	for i, existing := range lb.order {
		if existing == id {
			lb.order = append(lb.order[:i], lb.order[i+1:]...)
			break
		}
	}
	return true
}

func (lb *LoadBalancer) Snapshots() []BackendSnapshot {
	lb.mu.RLock()
	defer lb.mu.RUnlock()
	out := make([]BackendSnapshot, 0, len(lb.backends))
	for _, id := range lb.order {
		if b := lb.backends[id]; b != nil {
			out = append(out, b.BackendSnapshot)
		}
	}
	return out
}

func (lb *LoadBalancer) Metrics() Metrics {
	lb.mu.RLock()
	defer lb.mu.RUnlock()
	copyMetrics := Metrics{RequestsTotal: lb.metrics.RequestsTotal, RequestsInFlight: lb.metrics.RequestsInFlight, ResponsesByStatusClass: map[string]int64{}, BackendRequests: map[string]int64{}, RoutingAlgorithm: lb.metrics.RoutingAlgorithm}
	for k, v := range lb.metrics.ResponsesByStatusClass {
		copyMetrics.ResponsesByStatusClass[k] = v
	}
	for k, v := range lb.metrics.BackendRequests {
		copyMetrics.BackendRequests[k] = v
	}
	return copyMetrics
}

func (lb *LoadBalancer) MarkHealthy(id string) {
	lb.mu.Lock()
	defer lb.mu.Unlock()
	if b := lb.backends[id]; b != nil {
		b.Health = Healthy
	}
}

func (lb *LoadBalancer) SelectBackend() (BackendSnapshot, bool) {
	lb.mu.Lock()
	defer lb.mu.Unlock()
	eligible := lb.weightedEligibleLocked(time.Now())
	if len(eligible) == 0 {
		return BackendSnapshot{}, false
	}
	if lb.config.RoutingAlgorithm == LeastConnections {
		best := eligible[0]
		for _, b := range eligible[1:] {
			if b.ActiveConnections < best.ActiveConnections || (b.ActiveConnections == best.ActiveConnections && b.ID < best.ID) {
				best = b
			}
		}
		return best.BackendSnapshot, true
	}
	selected := eligible[lb.cursor%len(eligible)]
	lb.cursor++
	return selected.BackendSnapshot, true
}

func (lb *LoadBalancer) weightedEligibleLocked(now time.Time) []*backendRuntime {
	out := []*backendRuntime{}
	for _, id := range lb.order {
		b := lb.backends[id]
		if b.CircuitState == Open && now.Sub(b.openedAt) >= lb.config.OpenDuration {
			b.CircuitState = HalfOpen
			b.halfOpenProbe = false
		}
		allowedCircuit := b.CircuitState == Closed || (b.CircuitState == HalfOpen && !b.halfOpenProbe)
		if b.Health != Unhealthy && allowedCircuit {
			for i := 0; i < b.Weight; i++ {
				out = append(out, b)
			}
		}
	}
	return out
}

func (lb *LoadBalancer) CheckBackend(ctx context.Context, id string) {
	lb.mu.RLock()
	b := lb.backends[id]
	lb.mu.RUnlock()
	if b == nil {
		return
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, b.URL+b.healthPath, nil)
	if err != nil {
		lb.markFailure(id)
		return
	}
	started := time.Now()
	resp, err := lb.client.Do(req)
	if err != nil {
		lb.markHealthFailure(id)
		return
	}
	_ = resp.Body.Close()
	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		lb.markHealthSuccess(id, time.Since(started))
	} else {
		lb.markHealthFailure(id)
	}
}

func (lb *LoadBalancer) StartHealthChecks() {
	go func() {
		ticker := time.NewTicker(lb.config.HealthCheckInterval)
		defer ticker.Stop()
		for {
			select {
			case <-ticker.C:
				for _, s := range lb.Snapshots() {
					go lb.CheckBackend(context.Background(), s.ID)
				}
			case <-lb.stop:
				return
			}
		}
	}()
}
func (lb *LoadBalancer) Shutdown(context.Context) error {
	lb.once.Do(func() { close(lb.stop) })
	lb.logger.Info("load balancer shutdown")
	return nil
}

func (lb *LoadBalancer) markHealthSuccess(id string, latency time.Duration) {
	lb.mu.Lock()
	defer lb.mu.Unlock()
	if b := lb.backends[id]; b != nil {
		b.consecutiveSuccesses++
		b.consecutiveFailures = 0
		if b.consecutiveSuccesses >= lb.config.HealthyThreshold {
			b.Health = Healthy
		}
		if b.CircuitState == HalfOpen {
			b.CircuitState = Closed
		}
		lb.logger.Info("health_success", "backend", id, "latency_ms", latency.Milliseconds())
	}
}
func (lb *LoadBalancer) markHealthFailure(id string) {
	lb.mu.Lock()
	defer lb.mu.Unlock()
	if b := lb.backends[id]; b != nil {
		b.consecutiveFailures++
		b.consecutiveSuccesses = 0
		if b.consecutiveFailures >= lb.config.UnhealthyThreshold {
			b.Health = Unhealthy
		}
		lb.recordFailureLocked(b)
		lb.logger.Error("health_failure", "backend", id)
	}
}
func (lb *LoadBalancer) markFailure(id string) {
	lb.mu.Lock()
	defer lb.mu.Unlock()
	if b := lb.backends[id]; b != nil {
		lb.recordFailureLocked(b)
	}
}
func (lb *LoadBalancer) recordFailureLocked(b *backendRuntime) {
	b.FailedRequests++
	b.consecutiveFailures++
	if b.consecutiveFailures >= lb.config.FailureThreshold {
		b.CircuitState = Open
		b.openedAt = time.Now()
		b.halfOpenProbe = false
		lb.logger.Error("circuit_opened", "backend", b.ID)
	}
}

func (lb *LoadBalancer) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if strings.HasPrefix(r.URL.Path, "/__lb/") {
		lb.admin(w, r)
		return
	}
	selected, ok := lb.SelectBackend()
	if !ok {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{"error": map[string]string{"code": "no_eligible_backend"}})
		return
	}
	lb.mu.Lock()
	b := lb.backends[selected.ID]
	b.ActiveConnections++
	b.TotalRequests++
	lb.metrics.RequestsTotal++
	lb.metrics.RequestsInFlight++
	lb.metrics.BackendRequests[b.ID]++
	lb.mu.Unlock()
	lb.logger.Info("proxy_request", "backend", b.ID, "method", r.Method, "path", r.URL.RequestURI())
	proxy := httputil.NewSingleHostReverseProxy(b.parsed)
	originalDirector := proxy.Director
	proxy.Director = func(req *http.Request) {
		originalDirector(req)
		req.URL.Path = singleJoiningSlash(b.parsed.Path, r.URL.Path)
		req.URL.RawQuery = r.URL.RawQuery
		req.Host = b.parsed.Host
		addForwardingHeaders(req, r)
	}
	proxy.ErrorHandler = func(rw http.ResponseWriter, req *http.Request, err error) {
		lb.markFailure(b.ID)
		writeJSON(rw, http.StatusBadGateway, map[string]any{"error": map[string]string{"code": "bad_gateway", "message": err.Error()}})
	}
	wrapped := &trackingWriter{ResponseWriter: w, status: http.StatusOK}
	proxy.ServeHTTP(wrapped, r)
	lb.mu.Lock()
	b.ActiveConnections--
	lb.metrics.RequestsInFlight--
	lb.metrics.ResponsesByStatusClass[statusClass(wrapped.status)]++
	if wrapped.status >= 500 {
		lb.recordFailureLocked(b)
	} else {
		b.consecutiveFailures = 0
		if b.CircuitState == HalfOpen {
			b.CircuitState = Closed
		}
	}
	lb.mu.Unlock()
}

func (lb *LoadBalancer) admin(w http.ResponseWriter, r *http.Request) {
	switch r.URL.Path {
	case "/__lb/health":
		snapshots := lb.Snapshots()
		summary := map[string]int{"healthy": 0, "unhealthy": 0, "openCircuits": 0}
		for _, b := range snapshots {
			if b.Health == Healthy {
				summary["healthy"]++
			}
			if b.Health == Unhealthy {
				summary["unhealthy"]++
			}
			if b.CircuitState == Open {
				summary["openCircuits"]++
			}
		}
		writeJSON(w, http.StatusOK, map[string]any{"status": "ok", "uptimeSeconds": int(time.Since(lb.startedAt).Seconds()), "backendSummary": summary})
	case "/__lb/backends":
		writeJSON(w, http.StatusOK, map[string]any{"items": lb.Snapshots()})
	case "/__lb/metrics":
		writeJSON(w, http.StatusOK, lb.Metrics())
	default:
		writeJSON(w, http.StatusNotFound, map[string]any{"error": map[string]string{"code": "not_found"}})
	}
}

type trackingWriter struct {
	http.ResponseWriter
	status int
}

func (w *trackingWriter) WriteHeader(status int) {
	w.status = status
	w.ResponseWriter.WriteHeader(status)
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("content-type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}
func statusClass(status int) string { return string(rune('0'+status/100)) + "xx" }
func singleJoiningSlash(a, b string) string {
	aslash := strings.HasSuffix(a, "/")
	bslash := strings.HasPrefix(b, "/")
	switch {
	case aslash && bslash:
		return a + b[1:]
	case !aslash && !bslash:
		return a + "/" + b
	}
	return a + b
}
func addForwardingHeaders(req *http.Request, original *http.Request) {
	requestID := original.Header.Get("x-request-id")
	if requestID == "" {
		requestID = time.Now().UTC().Format("20060102150405.000000000")
	}
	req.Header.Set("x-request-id", requestID)
	req.Header.Set("x-forwarded-host", original.Host)
	req.Header.Set("x-forwarded-proto", "http")
	prior := original.Header.Get("x-forwarded-for")
	host, _, _ := net.SplitHostPort(original.RemoteAddr)
	if prior != "" {
		req.Header.Set("x-forwarded-for", prior+", "+host)
	} else {
		req.Header.Set("x-forwarded-for", host)
	}
}
