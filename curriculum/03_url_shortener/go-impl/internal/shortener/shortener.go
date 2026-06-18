package shortener

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"math"
	"net"
	"net/http"
	"net/url"
	"sort"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"time"
)

const (
	MaxURLLength = 2048
	MaxAliasLen  = 32
	MinAliasLen  = 3
	MaxBatchSize = 100
	base62Chars  = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
)

var reservedAliases = map[string]struct{}{"urls": {}, "shorten": {}, "health": {}, "healthz": {}}

type AppError struct {
	Status  int
	Code    string
	Message string
}

func (e AppError) Error() string { return e.Code }

type URLRecord struct {
	Code        string     `json:"code"`
	ShortURL    string     `json:"short_url"`
	OriginalURL string     `json:"original_url"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
	ExpiresAt   *time.Time `json:"expires_at"`
	DeletedAt   *time.Time `json:"deleted_at"`
	Clicks      int        `json:"clicks"`
}

type ClickEvent struct {
	ClickedAt    time.Time `json:"clicked_at"`
	Referrer     string    `json:"referrer,omitempty"`
	UserAgent    string    `json:"user_agent,omitempty"`
	ClientIPHash string    `json:"client_ip_hash,omitempty"`
}

type Store struct {
	mu      sync.RWMutex
	urls    map[string]*URLRecord
	clicks  map[string][]ClickEvent
	counter atomic.Uint64
	now     func() time.Time
}

func NewStore() *Store {
	return &Store{urls: map[string]*URLRecord{}, clicks: map[string][]ClickEvent{}, now: func() time.Time { return time.Now().UTC() }}
}

func (s *Store) SetNow(now func() time.Time) { s.now = now }

func ValidateURL(raw string) error {
	if raw == "" {
		return AppError{Status: http.StatusBadRequest, Code: "invalid_url", Message: "URL must use http or https and be no longer than 2048 characters."}
	}
	if len(raw) > MaxURLLength {
		return AppError{Status: http.StatusBadRequest, Code: "max_url_length_exceeded", Message: "URL must be no longer than 2048 characters."}
	}
	parsed, err := url.ParseRequestURI(raw)
	if err != nil || parsed.Scheme == "" || parsed.Host == "" || (parsed.Scheme != "http" && parsed.Scheme != "https") {
		return AppError{Status: http.StatusBadRequest, Code: "invalid_url", Message: "URL must use http or https and be absolute."}
	}
	return nil
}

func ValidateAlias(alias string) error {
	if len(alias) < MinAliasLen || len(alias) > MaxAliasLen {
		return AppError{Status: http.StatusBadRequest, Code: "invalid_alias", Message: "Alias must be 3-32 base62 characters and not reserved."}
	}
	if _, ok := reservedAliases[strings.ToLower(alias)]; ok {
		return AppError{Status: http.StatusBadRequest, Code: "invalid_alias", Message: "Alias is reserved."}
	}
	for _, r := range alias {
		if !(r >= '0' && r <= '9' || r >= 'A' && r <= 'Z' || r >= 'a' && r <= 'z') {
			return AppError{Status: http.StatusBadRequest, Code: "invalid_alias", Message: "Alias must contain only base62 characters."}
		}
	}
	return nil
}

func base62(n uint64) string {
	if n == 0 {
		return "0"
	}
	var out []byte
	for n > 0 {
		out = append([]byte{base62Chars[n%62]}, out...)
		n /= 62
	}
	for len(out) < 6 {
		out = append([]byte{'0'}, out...)
	}
	return string(out)
}

func (s *Store) nextCode(original string) string {
	n := s.counter.Add(1)
	sum := sha256.Sum256([]byte(fmt.Sprintf("%s:%d", original, n)))
	return base62(binaryPrefix(sum[:]) + n)
}

func binaryPrefix(b []byte) uint64 {
	var n uint64
	for i := 0; i < 6; i++ {
		n = (n << 8) | uint64(b[i])
	}
	return n % 56800235584 // 62^6
}

func (s *Store) Create(rawURL, customAlias string, expiresAt *time.Time, baseURL string) (URLRecord, error) {
	if err := ValidateURL(rawURL); err != nil {
		return URLRecord{}, err
	}
	if customAlias != "" {
		if err := ValidateAlias(customAlias); err != nil {
			return URLRecord{}, err
		}
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	code := customAlias
	if code != "" {
		if _, exists := s.urls[code]; exists {
			return URLRecord{}, AppError{Status: http.StatusConflict, Code: "alias_conflict", Message: "Alias already exists."}
		}
	} else {
		for attempts := 0; attempts < 10; attempts++ {
			candidate := s.nextCode(rawURL)
			if _, exists := s.urls[candidate]; !exists {
				code = candidate
				break
			}
		}
		if code == "" {
			return URLRecord{}, AppError{Status: http.StatusInternalServerError, Code: "code_generation_failed", Message: "Could not generate a unique code."}
		}
	}
	now := s.now()
	record := &URLRecord{Code: code, ShortURL: strings.TrimRight(baseURL, "/") + "/" + code, OriginalURL: rawURL, CreatedAt: now, UpdatedAt: now, ExpiresAt: expiresAt}
	s.urls[code] = record
	return *record, nil
}

func (s *Store) Resolve(code string) (URLRecord, error) {
	s.mu.RLock()
	record, ok := s.urls[code]
	s.mu.RUnlock()
	if !ok {
		return URLRecord{}, AppError{Status: http.StatusNotFound, Code: "code_not_found", Message: "Code was not found."}
	}
	if record.DeletedAt != nil {
		return URLRecord{}, AppError{Status: http.StatusGone, Code: "code_deleted", Message: "Code has been deleted."}
	}
	if record.ExpiresAt != nil && !record.ExpiresAt.After(s.now()) {
		return URLRecord{}, AppError{Status: http.StatusGone, Code: "code_expired", Message: "Code has expired."}
	}
	return *record, nil
}

func (s *Store) Delete(code string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	record, ok := s.urls[code]
	if !ok {
		return AppError{Status: http.StatusNotFound, Code: "code_not_found", Message: "Code was not found."}
	}
	if record.DeletedAt != nil {
		return AppError{Status: http.StatusGone, Code: "code_deleted", Message: "Code has been deleted."}
	}
	now := s.now()
	record.DeletedAt = &now
	record.UpdatedAt = now
	return nil
}

func (s *Store) RecordClick(code string, event ClickEvent) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if record, ok := s.urls[code]; ok && record.DeletedAt == nil {
		record.Clicks++
		record.UpdatedAt = s.now()
		s.clicks[code] = append(s.clicks[code], event)
	}
}

type Stats struct {
	Code          string       `json:"code"`
	OriginalURL   string       `json:"original_url"`
	TotalClicks   int          `json:"total_clicks"`
	CreatedAt     time.Time    `json:"created_at"`
	LastClickedAt *time.Time   `json:"last_clicked_at"`
	RecentClicks  []ClickEvent `json:"recent_clicks"`
}

func (s *Store) Stats(code string) (Stats, error) {
	record, err := s.Resolve(code)
	if err != nil {
		return Stats{}, err
	}
	s.mu.RLock()
	events := append([]ClickEvent(nil), s.clicks[code]...)
	s.mu.RUnlock()
	if len(events) > 10 {
		events = events[len(events)-10:]
	}
	var last *time.Time
	if len(events) > 0 {
		clicked := events[len(events)-1].ClickedAt
		last = &clicked
	}
	return Stats{Code: code, OriginalURL: record.OriginalURL, TotalClicks: record.Clicks, CreatedAt: record.CreatedAt, LastClickedAt: last, RecentClicks: events}, nil
}

type ListResponse struct {
	Items      []URLRecord `json:"items"`
	NextCursor *string     `json:"next_cursor"`
}

func (s *Store) List(limit int, cursor string) (ListResponse, error) {
	if limit <= 0 || limit > 100 {
		return ListResponse{}, AppError{Status: http.StatusBadRequest, Code: "invalid_pagination", Message: "Limit must be between 1 and 100."}
	}
	start := 0
	if cursor != "" {
		parsed, err := strconv.Atoi(cursor)
		if err != nil || parsed < 0 {
			return ListResponse{}, AppError{Status: http.StatusBadRequest, Code: "invalid_pagination", Message: "Cursor is invalid."}
		}
		start = parsed
	}
	s.mu.RLock()
	items := make([]URLRecord, 0, len(s.urls))
	for _, record := range s.urls {
		items = append(items, *record)
	}
	s.mu.RUnlock()
	sort.Slice(items, func(i, j int) bool { return items[i].CreatedAt.Before(items[j].CreatedAt) })
	if start > len(items) {
		start = len(items)
	}
	end := int(math.Min(float64(start+limit), float64(len(items))))
	var next *string
	if end < len(items) {
		value := strconv.Itoa(end)
		next = &value
	}
	return ListResponse{Items: items[start:end], NextCursor: next}, nil
}

type RateLimiter struct {
	mu      sync.Mutex
	limit   int
	window  time.Duration
	now     func() time.Time
	buckets map[string][]time.Time
}

func NewRateLimiter(limit int, window time.Duration) *RateLimiter {
	return &RateLimiter{limit: limit, window: window, now: func() time.Time { return time.Now().UTC() }, buckets: map[string][]time.Time{}}
}

func (r *RateLimiter) Allow(key string) (bool, time.Duration) {
	r.mu.Lock()
	defer r.mu.Unlock()
	now := r.now()
	cutoff := now.Add(-r.window)
	kept := r.buckets[key][:0]
	for _, seen := range r.buckets[key] {
		if seen.After(cutoff) {
			kept = append(kept, seen)
		}
	}
	if len(kept) >= r.limit {
		r.buckets[key] = kept
		return false, kept[0].Add(r.window).Sub(now)
	}
	r.buckets[key] = append(kept, now)
	return true, 0
}

type Server struct {
	store       *Store
	limiter     *RateLimiter
	baseURL     string
	logger      *slog.Logger
	analyticsCh chan queuedClick
	stop        chan struct{}
	wg          sync.WaitGroup
}

type queuedClick struct {
	code  string
	event ClickEvent
}

func NewServer(store *Store, baseURL string, logger *slog.Logger) *Server {
	if logger == nil {
		logger = slog.Default()
	}
	s := &Server{store: store, limiter: NewRateLimiter(60, time.Minute), baseURL: baseURL, logger: logger, analyticsCh: make(chan queuedClick, 1024), stop: make(chan struct{})}
	s.wg.Add(1)
	go s.analyticsWorker()
	return s
}

func (s *Server) Close() {
	close(s.stop)
	s.wg.Wait()
}

func (s *Server) analyticsWorker() {
	defer s.wg.Done()
	for {
		select {
		case click := <-s.analyticsCh:
			s.store.RecordClick(click.code, click.event)
		case <-s.stop:
			for {
				select {
				case click := <-s.analyticsCh:
					s.store.RecordClick(click.code, click.event)
				default:
					return
				}
			}
		}
	}
}

func (s *Server) Routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/health", s.health)
	mux.HandleFunc("/shorten", s.shorten)
	mux.HandleFunc("/shorten/batch", s.batch)
	mux.HandleFunc("/urls", s.urls)
	mux.HandleFunc("/", s.code)
	return mux
}

func (s *Server) health(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

type shortenRequest struct {
	URL         string     `json:"url"`
	CustomAlias string     `json:"custom_alias"`
	ExpiresAt   *time.Time `json:"expires_at"`
}

func (s *Server) shorten(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/shorten" {
		s.code(w, r)
		return
	}
	if r.Method != http.MethodPost {
		writeError(w, AppError{Status: http.StatusNotFound, Code: "code_not_found", Message: "Route not found."})
		return
	}
	if ok, retry := s.limiter.Allow(clientKey(r)); !ok {
		w.Header().Set("Retry-After", strconv.Itoa(int(math.Ceil(retry.Seconds()))))
		writeError(w, AppError{Status: http.StatusTooManyRequests, Code: "rate_limit_exceeded", Message: "Too many create requests."})
		return
	}
	var req shortenRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, AppError{Status: http.StatusBadRequest, Code: "invalid_url", Message: "Request body must contain a valid url."})
		return
	}
	record, err := s.store.Create(req.URL, req.CustomAlias, req.ExpiresAt, s.baseURL)
	if err != nil {
		writeError(w, err)
		return
	}
	s.logger.Info("short_url_created", "code", record.Code)
	writeJSON(w, http.StatusCreated, record)
}

func (s *Server) batch(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, AppError{Status: http.StatusNotFound, Code: "code_not_found", Message: "Route not found."})
		return
	}
	if ok, retry := s.limiter.Allow(clientKey(r)); !ok {
		w.Header().Set("Retry-After", strconv.Itoa(int(math.Ceil(retry.Seconds()))))
		writeError(w, AppError{Status: http.StatusTooManyRequests, Code: "rate_limit_exceeded", Message: "Too many create requests."})
		return
	}
	var req struct {
		URLs []shortenRequest `json:"urls"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || len(req.URLs) == 0 {
		writeError(w, AppError{Status: http.StatusBadRequest, Code: "invalid_batch", Message: "Batch must contain at least one URL."})
		return
	}
	if len(req.URLs) > MaxBatchSize {
		writeError(w, AppError{Status: http.StatusBadRequest, Code: "batch_too_large", Message: "Batch cannot contain more than 100 URLs."})
		return
	}
	type result struct {
		Index    int    `json:"index"`
		Status   int    `json:"status"`
		Code     string `json:"code,omitempty"`
		ShortURL string `json:"short_url,omitempty"`
		Error    string `json:"error,omitempty"`
	}
	results := make([]result, 0, len(req.URLs))
	for i, item := range req.URLs {
		record, err := s.store.Create(item.URL, item.CustomAlias, item.ExpiresAt, s.baseURL)
		if err != nil {
			var app AppError
			if errors.As(err, &app) {
				results = append(results, result{Index: i, Status: app.Status, Error: app.Code})
			} else {
				results = append(results, result{Index: i, Status: http.StatusInternalServerError, Error: "storage_error"})
			}
			continue
		}
		results = append(results, result{Index: i, Status: http.StatusCreated, Code: record.Code, ShortURL: record.ShortURL})
	}
	writeJSON(w, http.StatusMultiStatus, map[string]any{"results": results})
}

func (s *Server) urls(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, AppError{Status: http.StatusNotFound, Code: "code_not_found", Message: "Route not found."})
		return
	}
	limit := 50
	if value := r.URL.Query().Get("limit"); value != "" {
		parsed, err := strconv.Atoi(value)
		if err != nil {
			writeError(w, AppError{Status: http.StatusBadRequest, Code: "invalid_pagination", Message: "Limit is invalid."})
			return
		}
		limit = parsed
	}
	resp, err := s.store.List(limit, r.URL.Query().Get("cursor"))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, resp)
}

func (s *Server) code(w http.ResponseWriter, r *http.Request) {
	code := strings.Trim(strings.TrimPrefix(r.URL.Path, "/"), "/")
	if code == "" || strings.Contains(code, "/") && !strings.HasSuffix(code, "/stats") {
		writeError(w, AppError{Status: http.StatusNotFound, Code: "code_not_found", Message: "Code was not found."})
		return
	}
	if strings.HasSuffix(code, "/stats") {
		if r.Method != http.MethodGet {
			writeError(w, AppError{Status: http.StatusNotFound, Code: "code_not_found", Message: "Route not found."})
			return
		}
		stats, err := s.store.Stats(strings.TrimSuffix(code, "/stats"))
		if err != nil {
			writeError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, stats)
		return
	}
	if r.Method == http.MethodDelete {
		if err := s.store.Delete(code); err != nil {
			writeError(w, err)
			return
		}
		w.WriteHeader(http.StatusNoContent)
		return
	}
	if r.Method != http.MethodGet {
		writeError(w, AppError{Status: http.StatusNotFound, Code: "code_not_found", Message: "Route not found."})
		return
	}
	record, err := s.store.Resolve(code)
	if err != nil {
		writeError(w, err)
		return
	}
	select {
	case s.analyticsCh <- queuedClick{code: code, event: clickEventFromRequest(r)}:
	default:
		s.logger.Warn("analytics_queue_full", "code", code)
	}
	http.Redirect(w, r, record.OriginalURL, http.StatusMovedPermanently)
}

func clickEventFromRequest(r *http.Request) ClickEvent {
	hash := sha256.Sum256([]byte(clientKey(r)))
	return ClickEvent{ClickedAt: time.Now().UTC(), Referrer: truncate(r.Referer(), MaxURLLength), UserAgent: truncate(r.UserAgent(), 512), ClientIPHash: hex.EncodeToString(hash[:8])}
}

func truncate(value string, max int) string {
	if len(value) <= max {
		return value
	}
	return value[:max]
}

func clientKey(r *http.Request) string {
	if forwarded := r.Header.Get("X-Forwarded-For"); forwarded != "" {
		return strings.TrimSpace(strings.Split(forwarded, ",")[0])
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

func writeError(w http.ResponseWriter, err error) {
	var app AppError
	if !errors.As(err, &app) {
		app = AppError{Status: http.StatusInternalServerError, Code: "storage_error", Message: "Internal storage error."}
	}
	writeJSON(w, app.Status, map[string]any{"error": map[string]string{"code": app.Code, "message": app.Message}})
}

func Run(ctx context.Context, addr string, logger *slog.Logger) error {
	server := NewServer(NewStore(), "http://localhost"+addr, logger)
	defer server.Close()
	httpServer := &http.Server{Addr: addr, Handler: server.Routes(), ReadHeaderTimeout: 5 * time.Second}
	go func() {
		<-ctx.Done()
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		_ = httpServer.Shutdown(shutdownCtx)
	}()
	logger.Info("server_listening", "addr", addr)
	err := httpServer.ListenAndServe()
	if err != nil && !errors.Is(err, http.ErrServerClosed) {
		return err
	}
	return nil
}
