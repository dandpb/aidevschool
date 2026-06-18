package metrics

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestMetricSeriesKey(t *testing.T) {
	s := MetricSeries{Name: "cpu", Type: TypeGauge, Labels: map[string]string{"host": "a"}}
	got := s.Key()
	if !strings.Contains(got, "gauge") || !strings.Contains(got, "cpu") {
		t.Fatalf("expected key to contain gauge and cpu, got %s", got)
	}
}

func TestStoreRecordCounter(t *testing.T) {
	store := NewMetricStore(1000)
	store.Record(MetricSample{Name: "reqs", Type: TypeCounter, Value: 1, Timestamp: time.Now()})
	store.Record(MetricSample{Name: "reqs", Type: TypeCounter, Value: 2, Timestamp: time.Now()})

	v := store.Query("reqs", TypeCounter, nil, time.Time{}, time.Time{}, "sum")
	if v != 3 {
		t.Fatalf("expected sum 3, got %v", v)
	}
}

func TestStoreRecordGauge(t *testing.T) {
	store := NewMetricStore(1000)
	store.Record(MetricSample{Name: "cpu", Type: TypeGauge, Value: 10, Timestamp: time.Now()})
	store.Record(MetricSample{Name: "cpu", Type: TypeGauge, Value: 20, Timestamp: time.Now()})

	v := store.Query("cpu", TypeGauge, nil, time.Time{}, time.Time{}, "avg")
	if v != 15 {
		t.Fatalf("expected avg 15, got %v", v)
	}
}

func TestStoreRecordHistogram(t *testing.T) {
	store := NewMetricStore(1000)
	for i := 0; i < 10; i++ {
		store.Record(MetricSample{Name: "lat", Type: TypeHistogram, Value: float64(i) * 0.1, Timestamp: time.Now()})
	}

	p95 := store.HistogramPercentile("lat", nil, 0.95)
	if p95 == 0 {
		t.Fatal("expected non-zero p95")
	}
}

func TestStoreRecordTimer(t *testing.T) {
	store := NewMetricStore(1000)
	store.Record(MetricSample{Name: "dur", Type: TypeTimer, Value: 0.01, Timestamp: time.Now()})
	store.Record(MetricSample{Name: "dur", Type: TypeTimer, Value: 0.05, Timestamp: time.Now()})

	p50 := store.HistogramPercentile("dur", nil, 0.50)
	if p50 == 0 {
		t.Fatal("expected non-zero p50")
	}
}

func TestStoreQueryWithTimeRange(t *testing.T) {
	store := NewMetricStore(1000)
	now := time.Now()
	store.Record(MetricSample{Name: "cpu", Type: TypeGauge, Value: 10, Timestamp: now.Add(-2 * time.Hour)})
	store.Record(MetricSample{Name: "cpu", Type: TypeGauge, Value: 20, Timestamp: now})

	v := store.Query("cpu", TypeGauge, nil, now.Add(-time.Hour), now.Add(time.Hour), "sum")
	if v != 20 {
		t.Fatalf("expected 20, got %v", v)
	}
}

func TestStoreCreateAlertAndEvaluate(t *testing.T) {
	store := NewMetricStore(1000)
	store.CreateAlert(AlertRule{
		RuleID:    "rule1",
		Name:      "high-cpu",
		Enabled:   true,
		Query:     "avg(cpu)",
		Operator:  "gt",
		Threshold: 5,
		WindowSeconds: 300,
		Severity:  "warning",
	})
	store.Record(MetricSample{Name: "cpu", Type: TypeGauge, Value: 10, Timestamp: time.Now()})
	store.EvaluateAlerts()

	if len(store.events) != 1 {
		t.Fatalf("expected 1 alert event, got %d", len(store.events))
	}
}

func TestServerRecordCounter(t *testing.T) {
	srv := NewServer()
	body := map[string]any{"name": "reqs", "value": 1.0}
	b, _ := json.Marshal(body)
	req := httptest.NewRequest(http.MethodPost, "/metrics/counter", bytes.NewReader(b))
	rec := httptest.NewRecorder()
	srv.ServeHTTP(rec, req)

	if rec.Code != http.StatusAccepted {
		t.Fatalf("expected 202, got %d", rec.Code)
	}
}

func TestServerRecordGauge(t *testing.T) {
	srv := NewServer()
	body := map[string]any{"name": "cpu", "value": 10.0}
	b, _ := json.Marshal(body)
	req := httptest.NewRequest(http.MethodPost, "/metrics/gauge", bytes.NewReader(b))
	rec := httptest.NewRecorder()
	srv.ServeHTTP(rec, req)

	if rec.Code != http.StatusAccepted {
		t.Fatalf("expected 202, got %d", rec.Code)
	}
}

func TestServerQuery(t *testing.T) {
	srv := NewServer()
	for i := 0; i < 5; i++ {
		body := map[string]any{"name": "cpu", "value": float64(i + 1)}
		b, _ := json.Marshal(body)
		req := httptest.NewRequest(http.MethodPost, "/metrics/gauge", bytes.NewReader(b))
		rec := httptest.NewRecorder()
		srv.ServeHTTP(rec, req)
	}

	req := httptest.NewRequest(http.MethodGet, "/metrics?query=avg(cpu)", nil)
	rec := httptest.NewRecorder()
	srv.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
	var resp map[string]any
	json.Unmarshal(rec.Body.Bytes(), &resp)
	data, _ := resp["data"].(map[string]any)
	if data["value"] == nil {
		t.Fatal("expected value in response")
	}
}

func TestServerPrometheusExport(t *testing.T) {
	srv := NewServer()
	body := map[string]any{"name": "cpu", "value": 10.0}
	b, _ := json.Marshal(body)
	req := httptest.NewRequest(http.MethodPost, "/metrics/gauge", bytes.NewReader(b))
	rec := httptest.NewRecorder()
	srv.ServeHTTP(rec, req)

	req = httptest.NewRequest(http.MethodGet, "/metrics", nil)
	rec = httptest.NewRecorder()
	srv.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
	bodyStr := rec.Body.String()
	if !strings.Contains(bodyStr, "cpu") {
		t.Fatalf("expected cpu in prometheus output, got %s", bodyStr)
	}
}

func TestServerCreateAlert(t *testing.T) {
	srv := NewServer()
	body := map[string]any{
		"rule_id": "rule1",
		"name":    "high-cpu",
		"enabled": true,
		"query":   "avg(cpu)",
		"operator": "gt",
		"threshold": 5.0,
		"window_seconds": 300,
		"severity": "warning",
	}
	b, _ := json.Marshal(body)
	req := httptest.NewRequest(http.MethodPost, "/alerts/rules", bytes.NewReader(b))
	rec := httptest.NewRecorder()
	srv.ServeHTTP(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d", rec.Code)
	}
}

func TestServerHealth(t *testing.T) {
	srv := NewServer()
	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	rec := httptest.NewRecorder()
	srv.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
}

func TestServerMethodNotAllowed(t *testing.T) {
	srv := NewServer()
	req := httptest.NewRequest(http.MethodDelete, "/metrics/counter", nil)
	rec := httptest.NewRecorder()
	srv.ServeHTTP(rec, req)

	if rec.Code != http.StatusMethodNotAllowed {
		t.Fatalf("expected 405, got %d", rec.Code)
	}
}

func TestServerNotFound(t *testing.T) {
	srv := NewServer()
	req := httptest.NewRequest(http.MethodGet, "/unknown", nil)
	rec := httptest.NewRecorder()
	srv.ServeHTTP(rec, req)

	if rec.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", rec.Code)
	}
}

func TestStoreAggregatePercentiles(t *testing.T) {
	store := NewMetricStore(1000)
	for i := 0; i < 100; i++ {
		store.Record(MetricSample{Name: "lat", Type: TypeGauge, Value: float64(i), Timestamp: time.Now()})
	}

	p50 := store.Query("lat", TypeGauge, nil, time.Time{}, time.Time{}, "p50")
	p95 := store.Query("lat", TypeGauge, nil, time.Time{}, time.Time{}, "p95")
	p99 := store.Query("lat", TypeGauge, nil, time.Time{}, time.Time{}, "p99")

	if p50 != 49 {
		t.Fatalf("expected p50 49, got %v", p50)
	}
	if p95 != 94 {
		t.Fatalf("expected p95 94, got %v", p95)
	}
	if p99 != 98 {
		t.Fatalf("expected p99 98, got %v", p99)
	}
}

func TestStoreRingBufferEviction(t *testing.T) {
	store := NewMetricStore(3)
	now := time.Now()
	for i := 0; i < 5; i++ {
		store.Record(MetricSample{Name: "cpu", Type: TypeGauge, Value: float64(i), Timestamp: now.Add(time.Duration(i) * time.Second)})
	}

	v := store.Query("cpu", TypeGauge, nil, time.Time{}, time.Time{}, "count")
	if v != 3 {
		t.Fatalf("expected count 3 after eviction, got %v", v)
	}
}

func TestStoreAggregateMinMax(t *testing.T) {
	store := NewMetricStore(1000)
	store.Record(MetricSample{Name: "cpu", Type: TypeGauge, Value: 10, Timestamp: time.Now()})
	store.Record(MetricSample{Name: "cpu", Type: TypeGauge, Value: 5, Timestamp: time.Now()})
	store.Record(MetricSample{Name: "cpu", Type: TypeGauge, Value: 20, Timestamp: time.Now()})

	min := store.Query("cpu", TypeGauge, nil, time.Time{}, time.Time{}, "min")
	max := store.Query("cpu", TypeGauge, nil, time.Time{}, time.Time{}, "max")

	if min != 5 {
		t.Fatalf("expected min 5, got %v", min)
	}
	if max != 20 {
		t.Fatalf("expected max 20, got %v", max)
	}
}

func TestServerRecordInvalidJSON(t *testing.T) {
	srv := NewServer()
	req := httptest.NewRequest(http.MethodPost, "/metrics/counter", strings.NewReader("not json"))
	rec := httptest.NewRecorder()
	srv.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rec.Code)
	}
}

func TestServerRecordMissingName(t *testing.T) {
	srv := NewServer()
	body := map[string]any{"value": 1.0}
	b, _ := json.Marshal(body)
	req := httptest.NewRequest(http.MethodPost, "/metrics/counter", bytes.NewReader(b))
	rec := httptest.NewRecorder()
	srv.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rec.Code)
	}
}

func TestServerDashboard(t *testing.T) {
	srv := NewServer()
	req := httptest.NewRequest(http.MethodGet, "/dashboard", nil)
	rec := httptest.NewRecorder()
	srv.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
}

func TestServerListAlerts(t *testing.T) {
	srv := NewServer()
	req := httptest.NewRequest(http.MethodGet, "/alerts/rules", nil)
	rec := httptest.NewRecorder()
	srv.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
}

func TestNewShutdownContext(t *testing.T) {
	ctx, cancel := NewShutdownContext(100 * time.Millisecond)
	defer cancel()
	select {
	case <-ctx.Done():
		// expected
	case <-time.After(200 * time.Millisecond):
		t.Fatal("expected context to be done")
	}
}

func TestFormatLabels(t *testing.T) {
	got := formatLabels([]string{"host=a", "env=prod"})
	if got != "{host=a,env=prod}" {
		t.Fatalf("unexpected format: %s", got)
	}
	got = formatLabels([]string{})
	if got != "" {
		t.Fatalf("expected empty, got %s", got)
	}
}

func BenchmarkStoreRecord(b *testing.B) {
	store := NewMetricStore(10000)
	for i := 0; i < b.N; i++ {
		store.Record(MetricSample{
			Name:      "cpu",
			Type:      TypeGauge,
			Value:     float64(i),
			Timestamp: time.Now(),
		})
	}
}

func BenchmarkStoreQuery(b *testing.B) {
	store := NewMetricStore(10000)
	for i := 0; i < 1000; i++ {
		store.Record(MetricSample{
			Name:      "cpu",
			Type:      TypeGauge,
			Value:     float64(i),
			Timestamp: time.Now(),
		})
	}
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		store.Query("cpu", TypeGauge, nil, time.Time{}, time.Time{}, "avg")
	}
}

func ExampleServer_handlePrometheus() {
	srv := NewServer()
	body := map[string]any{"name": "cpu", "value": 10.0}
	b, _ := json.Marshal(body)
	req := httptest.NewRequest(http.MethodPost, "/metrics/gauge", bytes.NewReader(b))
	rec := httptest.NewRecorder()
	srv.ServeHTTP(rec, req)

	req = httptest.NewRequest(http.MethodGet, "/metrics", nil)
	rec = httptest.NewRecorder()
	srv.ServeHTTP(rec, req)
	fmt.Println(rec.Code)
	// Output: 200
}
