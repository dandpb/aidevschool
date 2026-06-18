package logaggregator

import (
	"context"
	"encoding/json"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"
)

type LogEntry struct {
	LogID          string            `json:"log_id"`
	Timestamp      time.Time         `json:"timestamp"`
	IngestedAt     time.Time         `json:"ingested_at"`
	Level          string            `json:"level"`
	Message        string            `json:"message"`
	Source         LogSource         `json:"source"`
	CorrelationID  string            `json:"correlation_id,omitempty"`
	TraceID        string            `json:"trace_id,omitempty"`
	SpanID         string            `json:"span_id,omitempty"`
	ParentSpanID   string            `json:"parent_span_id,omitempty"`
	Attributes     map[string]any    `json:"attributes,omitempty"`
}

type LogSource struct {
	Service     string            `json:"service"`
	Host        string            `json:"host,omitempty"`
	Environment string            `json:"environment,omitempty"`
	Version     string            `json:"version,omitempty"`
	Labels      map[string]string `json:"labels,omitempty"`
}

type LogStore struct {
	mu       sync.RWMutex
	logs     []LogEntry
	index    map[string][]int
	maxSize  int
}

func NewLogStore(maxSize int) *LogStore {
	return &LogStore{
		logs:    make([]LogEntry, 0, maxSize),
		index:   make(map[string][]int),
		maxSize: maxSize,
	}
}

func (s *LogStore) Ingest(entry LogEntry) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if entry.LogID == "" {
		entry.LogID = strconv.FormatInt(time.Now().UnixNano(), 10)
	}
	if entry.Timestamp.IsZero() {
		entry.Timestamp = time.Now()
	}
	entry.IngestedAt = time.Now()

	if len(s.logs) >= s.maxSize {
		removed := s.logs[0]
		s.logs = s.logs[1:]
		s.removeFromIndex(removed)
	}

	s.logs = append(s.logs, entry)
	s.addToIndex(entry, len(s.logs)-1)
}

func (s *LogStore) addToIndex(entry LogEntry, idx int) {
	s.index[entry.Level] = append(s.index[entry.Level], idx)
	s.index[entry.Source.Service] = append(s.index[entry.Source.Service], idx)
	if entry.CorrelationID != "" {
		s.index[entry.CorrelationID] = append(s.index[entry.CorrelationID], idx)
	}
	if entry.TraceID != "" {
		s.index[entry.TraceID] = append(s.index[entry.TraceID], idx)
	}
	for word := range s.tokenize(entry.Message) {
		s.index[word] = append(s.index[word], idx)
	}
}

func (s *LogStore) removeFromIndex(entry LogEntry) {
	// Simplified: rebuild index on eviction
	// In production, use a more sophisticated approach
}

func (s *LogStore) tokenize(text string) map[string]struct{} {
	words := make(map[string]struct{})
	for _, word := range strings.Fields(strings.ToLower(text)) {
		words[word] = struct{}{}
	}
	return words
}

func (s *LogStore) Query(levels []string, source, correlationID, traceID, filter string, start, end time.Time, limit int, orderDesc bool) []LogEntry {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var results []LogEntry
	for _, entry := range s.logs {
		if !start.IsZero() && entry.Timestamp.Before(start) {
			continue
		}
		if !end.IsZero() && entry.Timestamp.After(end) {
			continue
		}
		if len(levels) > 0 && !contains(levels, entry.Level) {
			continue
		}
		if source != "" && entry.Source.Service != source {
			continue
		}
		if correlationID != "" && entry.CorrelationID != correlationID {
			continue
		}
		if traceID != "" && entry.TraceID != traceID {
			continue
		}
		if filter != "" && !strings.Contains(strings.ToLower(entry.Message), strings.ToLower(filter)) {
			continue
		}
		results = append(results, entry)
	}

	sort.Slice(results, func(i, j int) bool {
		if orderDesc {
			return results[i].Timestamp.After(results[j].Timestamp)
		}
		return results[i].Timestamp.Before(results[j].Timestamp)
	})

	if limit > 0 && len(results) > limit {
		results = results[:limit]
	}
	return results
}

func (s *LogStore) GetTrace(traceID string) []LogEntry {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var results []LogEntry
	for _, entry := range s.logs {
		if entry.TraceID == traceID {
			results = append(results, entry)
		}
	}
	sort.Slice(results, func(i, j int) bool {
		return results[i].Timestamp.Before(results[j].Timestamp)
	})
	return results
}

func (s *LogStore) ApplyRetention(maxAge time.Duration) {
	s.mu.Lock()
	defer s.mu.Unlock()

	cutoff := time.Now().Add(-maxAge)
	var filtered []LogEntry
	for _, entry := range s.logs {
		if entry.Timestamp.After(cutoff) {
			filtered = append(filtered, entry)
		}
	}
	s.logs = filtered
	s.rebuildIndex()
}

func (s *LogStore) rebuildIndex() {
	s.index = make(map[string][]int)
	for i, entry := range s.logs {
		s.addToIndex(entry, i)
	}
}

func (s *LogStore) Count() int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return len(s.logs)
}

func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}

type Server struct {
	store *LogStore
}

func NewServer() *Server {
	return &Server{store: NewLogStore(10000)}
}

func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	switch r.URL.Path {
	case "/logs":
		if r.Method == http.MethodPost {
			s.handleIngest(w, r)
		} else if r.Method == http.MethodGet {
			s.handleQuery(w, r)
		} else {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		}
	case "/health":
		s.handleHealth(w, r)
	case "/metrics":
		s.handleMetrics(w, r)
	default:
		if strings.HasPrefix(r.URL.Path, "/traces/") {
			s.handleTrace(w, r)
		} else {
			http.Error(w, "not found", http.StatusNotFound)
		}
	}
}

func (s *Server) handleIngest(w http.ResponseWriter, r *http.Request) {
	var entry LogEntry
	if err := json.NewDecoder(r.Body).Decode(&entry); err != nil {
		s.writeError(w, http.StatusBadRequest, "invalid_json", err.Error())
		return
	}
	if entry.Message == "" {
		s.writeError(w, http.StatusBadRequest, "invalid_log_entry", "message is required")
		return
	}
	if entry.Level == "" {
		s.writeError(w, http.StatusBadRequest, "invalid_log_entry", "level is required")
		return
	}
	if entry.Source.Service == "" {
		s.writeError(w, http.StatusBadRequest, "invalid_log_entry", "source.service is required")
		return
	}

	if entry.LogID == "" {
		entry.LogID = strconv.FormatInt(time.Now().UnixNano(), 10)
	}

	s.store.Ingest(entry)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusAccepted)
	json.NewEncoder(w).Encode(map[string]any{
		"ok": true,
		"data": map[string]any{
			"accepted": 1,
			"duplicates": 0,
			"rejected": 0,
		},
	})
}

func (s *Server) handleQuery(w http.ResponseWriter, r *http.Request) {
	levels := r.URL.Query()["level"]
	source := r.URL.Query().Get("source")
	correlationID := r.URL.Query().Get("correlation_id")
	traceID := r.URL.Query().Get("trace_id")
	filter := r.URL.Query().Get("filter")
	limitStr := r.URL.Query().Get("limit")
	order := r.URL.Query().Get("order")

	limit := 100
	if limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = l
		}
	}

	var start, end time.Time
	if startStr := r.URL.Query().Get("start"); startStr != "" {
		start, _ = time.Parse(time.RFC3339, startStr)
	}
	if endStr := r.URL.Query().Get("end"); endStr != "" {
		end, _ = time.Parse(time.RFC3339, endStr)
	}

	results := s.store.Query(levels, source, correlationID, traceID, filter, start, end, limit, order == "desc")

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{
		"ok": true,
		"data": map[string]any{
			"items":       results,
			"next_cursor": nil,
			"query": map[string]any{
				"filter":        filter,
				"levels":        levels,
				"correlation_id": correlationID,
			},
			"stats": map[string]any{
				"matched": len(results),
			},
		},
	})
}

func (s *Server) handleTrace(w http.ResponseWriter, r *http.Request) {
	traceID := strings.TrimPrefix(r.URL.Path, "/traces/")
	results := s.store.GetTrace(traceID)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{
		"ok": true,
		"data": map[string]any{
			"trace": map[string]any{
				"trace_id": traceID,
				"logs":     results,
			},
			"partial": false,
		},
	})
}

func (s *Server) handleHealth(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{
		"ok": true,
		"data": map[string]any{
			"status":         "ok",
			"durability_mode": "volatile_until_flush",
			"buffer_depth":    s.store.Count(),
		},
	})
}

func (s *Server) handleMetrics(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{
		"ok": true,
		"data": map[string]any{
			"ingested_total": s.store.Count(),
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

func NewShutdownContext(timeout time.Duration) (context.Context, context.CancelFunc) {
	return context.WithTimeout(context.Background(), timeout)
}
