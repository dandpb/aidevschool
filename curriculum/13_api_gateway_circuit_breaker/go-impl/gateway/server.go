package gateway

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/url"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"
)

type Gateway struct {
	config      *Config
	routes      map[string]*RouteConfig
	circuit     map[string]*CircuitBreaker
	bulkhead    map[string]*Bulkhead
	tenantLimit map[string]*TenantLimiter
	coalescer   map[string]*Coalescer
	adaptive    map[string]*AdaptiveConcurrency
	httpClient  *http.Client
	mu          sync.RWMutex

	muMetrics           sync.Mutex
	requestCount         map[string]int64
	upstreamLatency      map[string][]time.Duration
	retryAttempts        map[string]int64
	fallbackCount        map[string]int64
	bulkheadRejections   map[string]int64
	rateLimitRejections  map[string]int64
	coalescedHits        map[string]int64
}

type RouteStatus struct {
	ID         string
	PathPrefix string
	Upstream   string
	Circuit    CircuitSnapshot
	Bulkhead   BulkheadSnapshot
	Adaptive   AdaptiveSnapshot
}

type ErrorResponse struct {
	Error        string `json:"error"`
	Message      string `json:"message"`
	RouteID      string `json:"route_id,omitempty"`
	RequestID    string `json:"request_id"`
	RetryAfterMS int    `json:"retry_after_ms,omitempty"`
}

func New(cfg *Config) (*Gateway, error) {
	gw := &Gateway{
		config:              cfg,
		routes:              make(map[string]*RouteConfig),
		circuit:             make(map[string]*CircuitBreaker),
		bulkhead:            make(map[string]*Bulkhead),
		tenantLimit:         make(map[string]*TenantLimiter),
		coalescer:           make(map[string]*Coalescer),
		adaptive:            make(map[string]*AdaptiveConcurrency),
		httpClient:          &http.Client{Timeout: 30 * time.Second},
		requestCount:        make(map[string]int64),
		upstreamLatency:     make(map[string][]time.Duration),
		retryAttempts:       make(map[string]int64),
		fallbackCount:       make(map[string]int64),
		bulkheadRejections:  make(map[string]int64),
		rateLimitRejections: make(map[string]int64),
		coalescedHits:       make(map[string]int64),
	}

	for i := range cfg.Routes {
		r := cfg.Routes[i]
		gw.routes[r.PathPrefix] = &r
		gw.circuit[r.ID] = NewCircuitBreaker(r.CircuitBreaker)
		gw.bulkhead[r.ID] = NewBulkhead(r.Bulkhead.MaxConcurrency)
		gw.tenantLimit[r.ID] = NewTenantLimiter(r.TenantLimit.Capacity, r.TenantLimit.RefillPerSecond)
		gw.coalescer[r.ID] = NewCoalescer(r.Coalescing)
		gw.adaptive[r.ID] = NewAdaptiveConcurrency(r.AdaptiveConcurrency)
	}

	return gw, nil
}

func (gw *Gateway) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	requestID := r.Header.Get("X-Request-ID")
	if requestID == "" {
		requestID = generateRequestID()
	}

	if strings.HasPrefix(r.URL.Path, "/_gateway/status") {
		gw.handleStatus(w, r)
		return
	}
	if strings.HasPrefix(r.URL.Path, "/_gateway/metrics") {
		gw.handleMetrics(w, r)
		return
	}

	route := gw.matchRoute(r.URL.Path)
	if route == nil {
		gw.writeError(w, http.StatusNotFound, "no_matching_route", "No route matches the incoming path", "", requestID, 0)
		return
	}

	cb := gw.circuit[route.ID]
	bh := gw.bulkhead[route.ID]
	tl := gw.tenantLimit[route.ID]
	co := gw.coalescer[route.ID]
	ac := gw.adaptive[route.ID]

	tenantID := r.Header.Get(route.TenantHeader)
	if tenantID == "" {
		tenantID = r.Header.Get("X-Tenant-ID")
	}
	if tenantID == "" {
		tenantID = "default"
	}

	// Rate limiting (FR-015, FR-016)
	if !tl.Allow(tenantID) {
		w.Header().Set("Retry-After", "1")
		w.Header().Set("X-RateLimit-Limit", strconv.Itoa(route.TenantLimit.Capacity))
		w.Header().Set("X-RateLimit-Remaining", "0")
		w.Header().Set("X-RateLimit-Reset", strconv.FormatInt(tl.ResetAt(tenantID).Unix(), 10))
		gw.recordRateLimitRejection(route.ID)
		gw.writeError(w, http.StatusTooManyRequests, "tenant_rate_limit_exceeded", "Tenant rate limit exceeded", route.ID, requestID, 1000)
		return
	}

	w.Header().Set("X-RateLimit-Limit", strconv.Itoa(route.TenantLimit.Capacity))
	w.Header().Set("X-RateLimit-Remaining", strconv.Itoa(int(tl.TokensRemaining(tenantID))))
	w.Header().Set("X-RateLimit-Reset", strconv.FormatInt(tl.ResetAt(tenantID).Unix(), 10))

	// Circuit breaker (FR-004 through FR-009)
	if !cb.Allow() {
		w.Header().Set("X-Circuit-State", cb.Snapshot().State)
		w.Header().Set("X-Retry-Attempts", "0")
		w.Header().Set("X-Fallback-Used", "true")
		if route.Fallback != nil {
			for k, v := range route.Fallback.Headers {
				w.Header().Set(k, v)
			}
			w.WriteHeader(route.Fallback.Status)
			json.NewEncoder(w).Encode(route.Fallback.Body)
		} else {
			gw.writeError(w, http.StatusServiceUnavailable, "circuit_open", "Circuit breaker is open", route.ID, requestID, 0)
		}
		gw.recordFallback(route.ID)
		return
	}

	// Bulkhead (FR-013, FR-014)
	if !bh.Acquire() {
		w.Header().Set("X-Circuit-State", cb.Snapshot().State)
		w.Header().Set("X-Retry-Attempts", "0")
		w.Header().Set("X-Fallback-Used", "true")
		if route.Fallback != nil {
			for k, v := range route.Fallback.Headers {
				w.Header().Set(k, v)
			}
			w.WriteHeader(route.Fallback.Status)
			json.NewEncoder(w).Encode(route.Fallback.Body)
		} else {
			gw.writeError(w, http.StatusServiceUnavailable, "bulkhead_full", "Route bulkhead is full", route.ID, requestID, 0)
		}
		gw.recordBulkheadRejection(route.ID)
		gw.recordFallback(route.ID)
		return
	}
	defer bh.Release()

	// Adaptive concurrency (FR-019)
	if !ac.Allow() {
		w.Header().Set("X-Circuit-State", cb.Snapshot().State)
		w.Header().Set("X-Retry-Attempts", "0")
		w.Header().Set("X-Fallback-Used", "true")
		if route.Fallback != nil {
			for k, v := range route.Fallback.Headers {
				w.Header().Set(k, v)
			}
			w.WriteHeader(route.Fallback.Status)
			json.NewEncoder(w).Encode(route.Fallback.Body)
		} else {
			gw.writeError(w, http.StatusServiceUnavailable, "adaptive_concurrency_rejected", "Adaptive concurrency limit reached", route.ID, requestID, 0)
		}
		gw.recordFallback(route.ID)
		return
	}
	defer ac.Release()

	// Request coalescing (FR-017, FR-018)
	if co.CanCoalesce(r) {
		key := co.Key(r, tenantID)
		if result, ok := co.Get(key); ok {
			gw.recordCoalescedHit(route.ID)
			w.Header().Set("X-Circuit-State", cb.Snapshot().State)
			w.Header().Set("X-Gateway-Route", route.ID)
			w.Header().Set("X-Request-ID", requestID)
			w.Header().Set("X-Fallback-Used", "false")
			w.Header().Set("X-Coalesced", "true")
			w.WriteHeader(result.StatusCode)
			io.Copy(w, result.Body)
			return
		}
	}

	// Proxy with retry (FR-010, FR-011)
	ctx, cancel := context.WithTimeout(r.Context(), time.Duration(route.TimeoutMS)*time.Millisecond)
	defer cancel()

	var attempts int
	start := time.Now()

	resp, err := DoWithRetry(route.Retry, r.Method, func() (*http.Response, error) {
		attempts++
		upstreamURL, _ := url.Parse(route.UpstreamURL)
		targetURL := upstreamURL.JoinPath(strings.TrimPrefix(r.URL.Path, route.PathPrefix))
		if r.URL.RawQuery != "" {
			targetURL.RawQuery = r.URL.RawQuery
		}

		var body []byte
		if r.Body != nil {
			body, _ = io.ReadAll(r.Body)
			r.Body = io.NopCloser(bytes.NewReader(body))
		}

		req, err := http.NewRequestWithContext(ctx, r.Method, targetURL.String(), bytes.NewReader(body))
		if err != nil {
			return nil, err
		}
		req.Header = r.Header.Clone()
		req.Header.Set("X-Request-ID", requestID)

		resp, err := gw.httpClient.Do(req)
		if err != nil {
			return nil, err
		}
		return resp, nil
	})

	latency := time.Since(start)
	gw.recordUpstreamLatency(route.ID, latency)
	gw.recordRequest(route.ID)
	gw.recordRetryAttempts(route.ID, int64(attempts))

	w.Header().Set("X-Circuit-State", cb.Snapshot().State)
	w.Header().Set("X-Retry-Attempts", strconv.Itoa(attempts))
	w.Header().Set("X-Gateway-Route", route.ID)
	w.Header().Set("X-Request-ID", requestID)

	if err != nil {
		cb.RecordFailure()
		w.Header().Set("X-Fallback-Used", "true")
		if route.Fallback != nil {
			for k, v := range route.Fallback.Headers {
				w.Header().Set(k, v)
			}
			w.WriteHeader(route.Fallback.Status)
			json.NewEncoder(w).Encode(route.Fallback.Body)
		} else {
			gw.writeError(w, http.StatusBadGateway, "upstream_error", "Upstream connection failed", route.ID, requestID, 0)
		}
		gw.recordFallback(route.ID)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 500 {
		cb.RecordFailure()
	} else {
		cb.RecordSuccess()
	}

	if resp.StatusCode >= 500 && route.Fallback != nil {
		w.Header().Set("X-Fallback-Used", "true")
		for k, v := range route.Fallback.Headers {
			w.Header().Set(k, v)
		}
		w.WriteHeader(route.Fallback.Status)
		json.NewEncoder(w).Encode(route.Fallback.Body)
		gw.recordFallback(route.ID)
		return
	}

	w.Header().Set("X-Fallback-Used", "false")

	// Store coalesced result
	if co.CanCoalesce(r) {
		key := co.Key(r, tenantID)
		bodyBytes, _ := io.ReadAll(resp.Body)
		co.Store(key, &CoalescedResult{StatusCode: resp.StatusCode, Body: io.NopCloser(bytes.NewReader(bodyBytes))}, route.Coalescing.TTLMS)
		w.WriteHeader(resp.StatusCode)
		w.Write(bodyBytes)
		return
	}

	w.WriteHeader(resp.StatusCode)
	io.Copy(w, resp.Body)
}

func (gw *Gateway) matchRoute(path string) *RouteConfig {
	gw.mu.RLock()
	defer gw.mu.RUnlock()

	var match *RouteConfig
	for _, r := range gw.routes {
		if strings.HasPrefix(path, r.PathPrefix) {
			if match == nil || len(r.PathPrefix) > len(match.PathPrefix) {
				match = r
			}
		}
	}
	return match
}

func (gw *Gateway) handleStatus(w http.ResponseWriter, r *http.Request) {
	gw.mu.RLock()
	defer gw.mu.RUnlock()

	var routes []RouteStatus
	for _, rc := range gw.routes {
		routes = append(routes, RouteStatus{
			ID:         rc.ID,
			PathPrefix: rc.PathPrefix,
			Upstream:   rc.UpstreamURL,
			Circuit:    gw.circuit[rc.ID].Snapshot(),
			Bulkhead:   gw.bulkhead[rc.ID].Snapshot(),
			Adaptive:   gw.adaptive[rc.ID].Snapshot(),
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{"routes": routes})
}

func (gw *Gateway) handleMetrics(w http.ResponseWriter, r *http.Request) {
	gw.mu.RLock()
	defer gw.mu.RUnlock()

	w.Header().Set("Content-Type", "application/json")
	var metrics []map[string]any
	for _, rc := range gw.routes {
		cb := gw.circuit[rc.ID].Snapshot()
		bh := gw.bulkhead[rc.ID].Snapshot()
		ac := gw.adaptive[rc.ID].Snapshot()
		metrics = append(metrics, map[string]any{
			"route_id":              rc.ID,
			"circuit_state":         cb.State,
			"failure_count":         cb.FailureCount,
			"success_count":         cb.SuccessCount,
			"bulkhead_in_flight":    bh.InFlight,
			"bulkhead_rejections":   bh.Rejections,
			"adaptive_limit":        ac.EffectiveLimit,
			"request_count":         gw.requestCount[rc.ID],
			"retry_attempts":        gw.retryAttempts[rc.ID],
			"fallback_count":        gw.fallbackCount[rc.ID],
			"rate_limit_rejections": gw.rateLimitRejections[rc.ID],
			"coalesced_hits":        gw.coalescedHits[rc.ID],
		})
	}
	json.NewEncoder(w).Encode(map[string]any{"metrics": metrics})
}

func (gw *Gateway) writeError(w http.ResponseWriter, status int, code, message, routeID, requestID string, retryAfterMS int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	errResp := ErrorResponse{
		Error:     code,
		Message:   message,
		RouteID:   routeID,
		RequestID: requestID,
	}
	if retryAfterMS > 0 {
		errResp.RetryAfterMS = retryAfterMS
	}
	json.NewEncoder(w).Encode(errResp)
}

func (gw *Gateway) recordRequest(routeID string) {
	gw.muMetrics.Lock()
	gw.requestCount[routeID]++
	gw.muMetrics.Unlock()
}

func (gw *Gateway) recordUpstreamLatency(routeID string, d time.Duration) {
	gw.muMetrics.Lock()
	gw.upstreamLatency[routeID] = append(gw.upstreamLatency[routeID], d)
	if len(gw.upstreamLatency[routeID]) > 1000 {
		gw.upstreamLatency[routeID] = gw.upstreamLatency[routeID][len(gw.upstreamLatency[routeID])-1000:]
	}
	gw.muMetrics.Unlock()
}

func (gw *Gateway) recordRetryAttempts(routeID string, count int64) {
	gw.muMetrics.Lock()
	gw.retryAttempts[routeID] += count
	gw.muMetrics.Unlock()
}

func (gw *Gateway) recordFallback(routeID string) {
	gw.muMetrics.Lock()
	gw.fallbackCount[routeID]++
	gw.muMetrics.Unlock()
}

func (gw *Gateway) recordBulkheadRejection(routeID string) {
	gw.muMetrics.Lock()
	gw.bulkheadRejections[routeID]++
	gw.muMetrics.Unlock()
}

func (gw *Gateway) recordRateLimitRejection(routeID string) {
	gw.muMetrics.Lock()
	gw.rateLimitRejections[routeID]++
	gw.muMetrics.Unlock()
}

func (gw *Gateway) recordCoalescedHit(routeID string) {
	gw.muMetrics.Lock()
	gw.coalescedHits[routeID]++
	gw.muMetrics.Unlock()
}

func generateRequestID() string {
	return strconv.FormatInt(time.Now().UnixNano(), 36)
}

func sortedHeaders(h http.Header, keys []string) string {
	var parts []string
	for _, k := range keys {
		if v := h.Get(k); v != "" {
			parts = append(parts, k+"="+v)
		}
	}
	sort.Strings(parts)
	return strings.Join(parts, "&")
}