package metrics

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"sort"
	"strings"
	"sync"
	"time"
)

type MetricType string

const (
	TypeCounter  MetricType = "counter"
	TypeGauge    MetricType = "gauge"
	TypeHistogram MetricType = "histogram"
	TypeTimer    MetricType = "timer"
)

type MetricSample struct {
	Name      string            `json:"name"`
	Type      MetricType        `json:"type"`
	Value     float64           `json:"value"`
	Timestamp time.Time         `json:"timestamp"`
	Labels    map[string]string `json:"labels"`
}

type MetricSeries struct {
	Name   string
	Type   MetricType
	Labels map[string]string
}

func (s MetricSeries) Key() string {
	var parts []string
	parts = append(parts, string(s.Type), s.Name)
	var keys []string
	for k := range s.Labels {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	for _, k := range keys {
		parts = append(parts, k+"="+s.Labels[k])
	}
	return strings.Join(parts, ",")
}

type TimeSeriesPoint struct {
	Timestamp time.Time `json:"timestamp"`
	Value     float64   `json:"value"`
}

type HistogramBucket struct {
	UpperBound      float64 `json:"upper_bound"`
	CumulativeCount int64   `json:"cumulative_count"`
}

type HistogramData struct {
	Buckets []HistogramBucket `json:"buckets"`
	Count   int64             `json:"count"`
	Sum     float64           `json:"sum"`
}

type AlertRule struct {
	RuleID    string  `json:"rule_id"`
	Name      string  `json:"name"`
	Enabled   bool    `json:"enabled"`
	Query     string  `json:"query"`
	Operator  string  `json:"operator"`
	Threshold float64 `json:"threshold"`
	WindowSeconds int `json:"window_seconds"`
	Severity  string  `json:"severity"`
}

type AlertEvent struct {
	AlertEventID string    `json:"alert_event_id"`
	RuleID       string    `json:"rule_id"`
	TriggeredAt  time.Time `json:"triggered_at"`
	ObservedValue float64  `json:"observed_value"`
	Threshold    float64   `json:"threshold"`
	Severity     string    `json:"severity"`
}

type MetricStore struct {
	mu         sync.RWMutex
	samples    map[string][]TimeSeriesPoint
	histograms map[string]*HistogramData
	alerts     map[string]*AlertRule
	events     []AlertEvent
	maxSize    int
}

func NewMetricStore(maxSize int) *MetricStore {
	return &MetricStore{
		samples:    make(map[string][]TimeSeriesPoint),
		histograms: make(map[string]*HistogramData),
		alerts:     make(map[string]*AlertRule),
		events:     make([]AlertEvent, 0),
		maxSize:    maxSize,
	}
}

func (s *MetricStore) Record(sample MetricSample) {
	s.mu.Lock()
	defer s.mu.Unlock()

	key := MetricSeries{Name: sample.Name, Type: sample.Type, Labels: sample.Labels}.Key()

	switch sample.Type {
	case TypeCounter, TypeGauge:
		points := s.samples[key]
		if len(points) >= s.maxSize {
			points = points[1:]
		}
		points = append(points, TimeSeriesPoint{Timestamp: sample.Timestamp, Value: sample.Value})
		s.samples[key] = points
	case TypeHistogram, TypeTimer:
		h := s.histograms[key]
		if h == nil {
			h = &HistogramData{
				Buckets: []HistogramBucket{
					{UpperBound: 0.005}, {UpperBound: 0.01}, {UpperBound: 0.025},
					{UpperBound: 0.05}, {UpperBound: 0.1}, {UpperBound: 0.25},
					{UpperBound: 0.5}, {UpperBound: 1}, {UpperBound: 2.5},
					{UpperBound: 5}, {UpperBound: 10}, {UpperBound: float64(int64(^uint64(0) >> 1))},
				},
			}
			s.histograms[key] = h
		}
		h.Count++
		h.Sum += sample.Value
		for i := range h.Buckets {
			if sample.Value <= h.Buckets[i].UpperBound {
				h.Buckets[i].CumulativeCount++
			}
		}
	}
}

func (s *MetricStore) Query(name string, metricType MetricType, labels map[string]string, start, end time.Time, aggregation string) float64 {
	s.mu.RLock()
	defer s.mu.RUnlock()

	key := MetricSeries{Name: name, Type: metricType, Labels: labels}.Key()
	points := s.samples[key]

	var values []float64
	for _, p := range points {
		if !start.IsZero() && p.Timestamp.Before(start) {
			continue
		}
		if !end.IsZero() && p.Timestamp.After(end) {
			continue
		}
		values = append(values, p.Value)
	}

	return s.aggregate(values, aggregation)
}

func (s *MetricStore) aggregate(values []float64, aggregation string) float64 {
	if len(values) == 0 {
		return 0
	}

	switch aggregation {
	case "sum":
		var sum float64
		for _, v := range values {
			sum += v
		}
		return sum
	case "avg":
		var sum float64
		for _, v := range values {
			sum += v
		}
		return sum / float64(len(values))
	case "min":
		min := values[0]
		for _, v := range values {
			if v < min {
				min = v
			}
		}
		return min
	case "max":
		max := values[0]
		for _, v := range values {
			if v > max {
				max = v
			}
		}
		return max
	case "count":
		return float64(len(values))
	case "p50", "p95", "p99":
		sort.Float64s(values)
		idx := 0
		switch aggregation {
		case "p50":
			idx = int(float64(len(values)-1) * 0.50)
		case "p95":
			idx = int(float64(len(values)-1) * 0.95)
		case "p99":
			idx = int(float64(len(values)-1) * 0.99)
		}
		return values[idx]
	}
	return 0
}

func (s *MetricStore) HistogramPercentile(name string, labels map[string]string, percentile float64) float64 {
	s.mu.RLock()
	defer s.mu.RUnlock()

	key := MetricSeries{Name: name, Type: TypeHistogram, Labels: labels}.Key()
	h := s.histograms[key]
	if h == nil || h.Count == 0 {
		key = MetricSeries{Name: name, Type: TypeTimer, Labels: labels}.Key()
		h = s.histograms[key]
	}
	if h == nil || h.Count == 0 {
		return 0
	}

	target := int64(float64(h.Count) * percentile)
	for _, b := range h.Buckets {
		if b.CumulativeCount >= target {
			return b.UpperBound
		}
	}
	return 0
}

func (s *MetricStore) CreateAlert(rule AlertRule) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.alerts[rule.RuleID] = &rule
}

func (s *MetricStore) EvaluateAlerts() {
	s.mu.Lock()
	defer s.mu.Unlock()

	for _, rule := range s.alerts {
		if !rule.Enabled {
			continue
		}
		// Simplified: evaluate against counter/gauge samples
		parts := strings.Split(rule.Query, "(")
		if len(parts) < 2 {
			continue
		}
		agg := strings.TrimSpace(parts[0])
		name := strings.TrimSuffix(strings.TrimSpace(parts[1]), ")")

		value := s.aggregateQuery(name, agg, time.Now().Add(-time.Duration(rule.WindowSeconds)*time.Second), time.Now())
		triggered := false
		switch rule.Operator {
		case "gt":
			triggered = value > rule.Threshold
		case "gte":
			triggered = value >= rule.Threshold
		case "lt":
			triggered = value < rule.Threshold
		case "lte":
			triggered = value <= rule.Threshold
		}

		if triggered {
			s.events = append(s.events, AlertEvent{
				AlertEventID:  fmt.Sprintf("evt_%d", time.Now().UnixNano()),
				RuleID:        rule.RuleID,
				TriggeredAt:   time.Now(),
				ObservedValue: value,
				Threshold:     rule.Threshold,
				Severity:      rule.Severity,
			})
		}
	}
}

func (s *MetricStore) aggregateQuery(name, aggregation string, start, end time.Time) float64 {
	var allValues []float64
	for key, points := range s.samples {
		if strings.Contains(key, name) {
			for _, p := range points {
				if p.Timestamp.After(start) && p.Timestamp.Before(end) {
					allValues = append(allValues, p.Value)
				}
			}
		}
	}
	return s.aggregate(allValues, aggregation)
}

func (s *MetricStore) PrometheusExport() string {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var output strings.Builder
	for key, points := range s.samples {
		parts := strings.SplitN(key, ",", 3)
		if len(parts) < 2 {
			continue
		}
		name := parts[1]
		value := 0.0
		if len(points) > 0 {
			value = points[len(points)-1].Value
		}
		output.WriteString(fmt.Sprintf("# TYPE %s %s\n", name, parts[0]))
		output.WriteString(fmt.Sprintf("%s %s %g\n", name, formatLabels(parts[2:]), value))
	}

	for key, h := range s.histograms {
		parts := strings.SplitN(key, ",", 3)
		if len(parts) < 2 {
			continue
		}
		name := parts[1]
		output.WriteString(fmt.Sprintf("# TYPE %s histogram\n", name))
		for _, b := range h.Buckets {
			output.WriteString(fmt.Sprintf("%s_bucket{le=\"%g\"} %d\n", name, b.UpperBound, b.CumulativeCount))
		}
		output.WriteString(fmt.Sprintf("%s_sum %g\n", name, h.Sum))
		output.WriteString(fmt.Sprintf("%s_count %d\n", name, h.Count))
	}

	return output.String()
}

func formatLabels(parts []string) string {
	if len(parts) == 0 || parts[0] == "" {
		return ""
	}
	var labels []string
	for _, p := range parts {
		labels = append(labels, p)
	}
	return "{" + strings.Join(labels, ",") + "}"
}

type Server struct {
	store *MetricStore
}

func NewServer() *Server {
	return &Server{store: NewMetricStore(10000)}
}

func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	switch r.URL.Path {
	case "/metrics/counter", "/metrics/gauge", "/metrics/histogram", "/metrics/timer":
		if r.Method == http.MethodPost {
			s.handleRecord(w, r)
		} else {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		}
	case "/metrics":
		if r.Method == http.MethodGet {
			if r.URL.Query().Get("query") != "" {
				s.handleQuery(w, r)
			} else {
				s.handlePrometheus(w, r)
			}
		} else {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		}
	case "/dashboard":
		if r.Method == http.MethodGet {
			s.handleDashboard(w, r)
		} else {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		}
	case "/alerts/rules":
		if r.Method == http.MethodPost {
			s.handleCreateAlert(w, r)
		} else if r.Method == http.MethodGet {
			s.handleListAlerts(w, r)
		} else {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		}
	case "/health":
		s.handleHealth(w, r)
	default:
		http.Error(w, "not found", http.StatusNotFound)
	}
}

func (s *Server) handleRecord(w http.ResponseWriter, r *http.Request) {
	var sample MetricSample
	if err := json.NewDecoder(r.Body).Decode(&sample); err != nil {
		s.writeError(w, http.StatusBadRequest, "invalid_metric_sample", err.Error())
		return
	}
	if sample.Name == "" {
		s.writeError(w, http.StatusBadRequest, "invalid_metric_sample", "name is required")
		return
	}
	if sample.Timestamp.IsZero() {
		sample.Timestamp = time.Now()
	}

	metricType := MetricType(strings.TrimPrefix(r.URL.Path, "/metrics/"))
	sample.Type = metricType

	s.store.Record(sample)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusAccepted)
	json.NewEncoder(w).Encode(map[string]any{
		"ok": true,
		"data": map[string]any{"accepted": 1, "duplicates": 0, "rejected": 0},
	})
}

func (s *Server) handleQuery(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query().Get("query")
	startStr := r.URL.Query().Get("start")
	endStr := r.URL.Query().Get("end")

	var start, end time.Time
	if startStr != "" {
		start, _ = time.Parse(time.RFC3339, startStr)
	}
	if endStr != "" {
		end, _ = time.Parse(time.RFC3339, endStr)
	}

	// Parse simple query: aggregation(name)
	agg, name := parseQuery(query)
	value := s.store.Query(name, TypeGauge, nil, start, end, agg)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{
		"ok": true,
		"data": map[string]any{
			"query": query,
			"value": value,
		},
	})
}

func (s *Server) handlePrometheus(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "text/plain; version=0.0.4")
	w.Write([]byte(s.store.PrometheusExport()))
}

func (s *Server) handleDashboard(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{
		"ok": true,
		"data": map[string]any{
			"dashboard_id": "default",
			"panels":       []any{},
			"alerts":       []any{},
		},
	})
}

func (s *Server) handleCreateAlert(w http.ResponseWriter, r *http.Request) {
	var rule AlertRule
	if err := json.NewDecoder(r.Body).Decode(&rule); err != nil {
		s.writeError(w, http.StatusBadRequest, "invalid_alert_rule", err.Error())
		return
	}
	s.store.CreateAlert(rule)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]any{
		"ok": true,
		"data": map[string]any{"rule_id": rule.RuleID, "status": "enabled"},
	})
}

func (s *Server) handleListAlerts(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{
		"ok": true,
		"data": map[string]any{"items": []any{}},
	})
}

func (s *Server) handleHealth(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{
		"ok": true,
		"data": map[string]any{
			"status":         "ok",
			"durability_mode": "volatile_until_flush",
			"active_series":   0,
		},
	})
}

func (s *Server) writeError(w http.ResponseWriter, status int, code, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]any{
		"ok": false,
		"error": map[string]any{
			"code":    code,
			"message": message,
		},
	})
}

func parseQuery(query string) (string, string) {
	// Simple parser for aggregation(name)
	idx := strings.Index(query, "(")
	if idx == -1 {
		return "sum", query
	}
	agg := strings.TrimSpace(query[:idx])
	name := strings.TrimSuffix(strings.TrimSpace(query[idx+1:]), ")")
	return agg, name
}

func NewShutdownContext(timeout time.Duration) (context.Context, context.CancelFunc) {
	return context.WithTimeout(context.Background(), timeout)
}
