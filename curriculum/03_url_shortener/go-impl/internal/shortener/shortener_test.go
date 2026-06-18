package shortener

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"
)

func TestValidateURLAndAlias(t *testing.T) {
	validURLs := []string{"https://example.com/a", "http://example.com"}
	for _, raw := range validURLs {
		if err := ValidateURL(raw); err != nil {
			t.Fatalf("ValidateURL(%q) returned %v", raw, err)
		}
	}
	invalidURLs := []string{"", "ftp://example.com", "javascript:alert(1)", "/relative"}
	for _, raw := range invalidURLs {
		if err := ValidateURL(raw); err == nil {
			t.Fatalf("ValidateURL(%q) succeeded", raw)
		}
	}
	if err := ValidateAlias("abc123"); err != nil {
		t.Fatalf("valid alias rejected: %v", err)
	}
	for _, alias := range []string{"ab", "has-dash", "shorten"} {
		if err := ValidateAlias(alias); err == nil {
			t.Fatalf("invalid alias %q accepted", alias)
		}
	}
}

func TestStoreCreateResolveStatsDeleteAndList(t *testing.T) {
	store := NewStore()
	now := time.Date(2026, 6, 17, 12, 0, 0, 0, time.UTC)
	store.SetNow(func() time.Time { return now })
	record, err := store.Create("https://example.com/a", "abc", nil, "http://localhost:8080")
	if err != nil {
		t.Fatalf("Create returned %v", err)
	}
	if record.Code != "abc" || record.ShortURL != "http://localhost:8080/abc" {
		t.Fatalf("unexpected record: %+v", record)
	}
	if _, err := store.Create("https://example.com/b", "abc", nil, "http://localhost:8080"); err == nil {
		t.Fatal("expected alias conflict")
	}
	resolved, err := store.Resolve("abc")
	if err != nil || resolved.OriginalURL != "https://example.com/a" {
		t.Fatalf("Resolve = %+v, %v", resolved, err)
	}
	store.RecordClick("abc", ClickEvent{ClickedAt: now, Referrer: "https://ref.example"})
	stats, err := store.Stats("abc")
	if err != nil || stats.TotalClicks != 1 || len(stats.RecentClicks) != 1 {
		t.Fatalf("Stats = %+v, %v", stats, err)
	}
	listed, err := store.List(1, "")
	if err != nil || len(listed.Items) != 1 {
		t.Fatalf("List = %+v, %v", listed, err)
	}
	if err := store.Delete("abc"); err != nil {
		t.Fatalf("Delete returned %v", err)
	}
	if _, err := store.Resolve("abc"); err == nil {
		t.Fatal("deleted code still resolves")
	}
}

func TestGeneratedCodesExpiryPaginationAndErrorBranches(t *testing.T) {
	store := NewStore()
	now := time.Date(2026, 6, 17, 12, 0, 0, 0, time.UTC)
	store.SetNow(func() time.Time { return now })
	expires := now.Add(time.Hour)
	first, err := store.Create("https://example.com/first", "", &expires, "http://localhost")
	if err != nil {
		t.Fatalf("generated create failed: %v", err)
	}
	second, err := store.Create("https://example.com/second", "", nil, "http://localhost")
	if err != nil {
		t.Fatalf("second generated create failed: %v", err)
	}
	if first.Code == second.Code || len(first.Code) < MinAliasLen {
		t.Fatalf("generated codes are not unique/useful: %q %q", first.Code, second.Code)
	}
	page, err := store.List(1, "")
	if err != nil || len(page.Items) != 1 || page.NextCursor == nil {
		t.Fatalf("first page = %+v, %v", page, err)
	}
	if _, err := store.List(0, ""); err == nil {
		t.Fatal("invalid limit accepted")
	}
	if _, err := store.List(10, "not-a-number"); err == nil {
		t.Fatal("invalid cursor accepted")
	}
	store.SetNow(func() time.Time { return expires.Add(time.Second) })
	if _, err := store.Resolve(first.Code); err == nil {
		t.Fatal("expired code resolved")
	}
	if err := store.Delete("missing"); err == nil {
		t.Fatal("missing delete succeeded")
	}
	if got := base62(0); got != "0" {
		t.Fatalf("base62(0) = %q", got)
	}
}

func TestConcurrentCustomAliasAllowsExactlyOneWinner(t *testing.T) {
	store := NewStore()
	var wg sync.WaitGroup
	successes := 0
	var mu sync.Mutex
	for i := 0; i < 20; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			_, err := store.Create("https://example.com", "race", nil, "http://localhost")
			if err == nil {
				mu.Lock()
				successes++
				mu.Unlock()
			}
		}()
	}
	wg.Wait()
	if successes != 1 {
		t.Fatalf("successes = %d, want 1", successes)
	}
}

func TestHTTPContract(t *testing.T) {
	store := NewStore()
	srv := NewServer(store, "http://localhost:8080", slog.New(slog.NewTextHandler(io.Discard, nil)))
	defer srv.Close()
	h := srv.Routes()

	createBody := `{"url":"https://example.com/long","custom_alias":"mine"}`
	req := httptest.NewRequest(http.MethodPost, "/shorten", strings.NewReader(createBody))
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("POST /shorten status = %d, body=%s", rec.Code, rec.Body.String())
	}

	redirect := httptest.NewRecorder()
	h.ServeHTTP(redirect, httptest.NewRequest(http.MethodGet, "/mine", nil))
	if redirect.Code != http.StatusMovedPermanently || redirect.Header().Get("Location") != "https://example.com/long" {
		t.Fatalf("redirect status=%d location=%q", redirect.Code, redirect.Header().Get("Location"))
	}
	waitForClicks(t, store, "mine", 1)

	stats := httptest.NewRecorder()
	h.ServeHTTP(stats, httptest.NewRequest(http.MethodGet, "/mine/stats", nil))
	if stats.Code != http.StatusOK || !strings.Contains(stats.Body.String(), `"total_clicks":1`) {
		t.Fatalf("stats status=%d body=%s", stats.Code, stats.Body.String())
	}

	deleted := httptest.NewRecorder()
	h.ServeHTTP(deleted, httptest.NewRequest(http.MethodDelete, "/mine", nil))
	if deleted.Code != http.StatusNoContent {
		t.Fatalf("delete status = %d", deleted.Code)
	}
	gone := httptest.NewRecorder()
	h.ServeHTTP(gone, httptest.NewRequest(http.MethodGet, "/mine", nil))
	if gone.Code != http.StatusGone {
		t.Fatalf("deleted redirect status = %d", gone.Code)
	}
}

func TestBatchListHealthAndErrors(t *testing.T) {
	srv := NewServer(NewStore(), "http://localhost:8080", slog.New(slog.NewTextHandler(io.Discard, nil)))
	defer srv.Close()
	h := srv.Routes()

	batchBody := `{"urls":[{"url":"https://example.com/one","custom_alias":"one"},{"url":"ftp://bad"}]}`
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodPost, "/shorten/batch", strings.NewReader(batchBody)))
	if rec.Code != http.StatusMultiStatus || !strings.Contains(rec.Body.String(), `"status":201`) || !strings.Contains(rec.Body.String(), `"error":"invalid_url"`) {
		t.Fatalf("batch status=%d body=%s", rec.Code, rec.Body.String())
	}

	list := httptest.NewRecorder()
	h.ServeHTTP(list, httptest.NewRequest(http.MethodGet, "/urls?limit=10", nil))
	if list.Code != http.StatusOK || !strings.Contains(list.Body.String(), `"items"`) {
		t.Fatalf("list status=%d body=%s", list.Code, list.Body.String())
	}

	health := httptest.NewRecorder()
	h.ServeHTTP(health, httptest.NewRequest(http.MethodGet, "/health", nil))
	if health.Code != http.StatusOK || !strings.Contains(health.Body.String(), "ok") {
		t.Fatalf("health status=%d body=%s", health.Code, health.Body.String())
	}

	bad := httptest.NewRecorder()
	h.ServeHTTP(bad, httptest.NewRequest(http.MethodPost, "/shorten", bytes.NewBufferString(`{"url":"file:///tmp/a"}`)))
	if bad.Code != http.StatusBadRequest || !strings.Contains(bad.Body.String(), "invalid_url") {
		t.Fatalf("bad status=%d body=%s", bad.Code, bad.Body.String())
	}
}

func TestHTTPErrorBranchesAndRateLimit(t *testing.T) {
	srv := NewServer(NewStore(), "http://localhost:8080", slog.New(slog.NewTextHandler(io.Discard, nil)))
	defer srv.Close()
	srv.limiter = NewRateLimiter(1, time.Minute)
	h := srv.Routes()

	first := httptest.NewRecorder()
	h.ServeHTTP(first, httptest.NewRequest(http.MethodPost, "/shorten", strings.NewReader(`{"url":"https://example.com","custom_alias":"lim"}`)))
	if first.Code != http.StatusCreated {
		t.Fatalf("first create = %d %s", first.Code, first.Body.String())
	}
	limited := httptest.NewRecorder()
	h.ServeHTTP(limited, httptest.NewRequest(http.MethodPost, "/shorten", strings.NewReader(`{"url":"https://example.com/two","custom_alias":"lim2"}`)))
	if limited.Code != http.StatusTooManyRequests || limited.Header().Get("Retry-After") == "" {
		t.Fatalf("limited response = %d headers=%v body=%s", limited.Code, limited.Header(), limited.Body.String())
	}

	for _, tc := range []struct {
		method string
		path   string
	}{
		{http.MethodGet, "/shorten"},
		{http.MethodGet, "/shorten/batch"},
		{http.MethodPost, "/urls"},
		{http.MethodPost, "/lim/stats"},
		{http.MethodPut, "/lim"},
		{http.MethodGet, "/a/b/c"},
	} {
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, httptest.NewRequest(tc.method, tc.path, nil))
		if rec.Code == http.StatusOK || rec.Code == http.StatusCreated || rec.Code == http.StatusMovedPermanently {
			t.Fatalf("%s %s unexpectedly succeeded with %d", tc.method, tc.path, rec.Code)
		}
	}

	badJSON := httptest.NewRecorder()
	h.ServeHTTP(badJSON, httptest.NewRequest(http.MethodPost, "/shorten", strings.NewReader(`{`)))
	if badJSON.Code != http.StatusTooManyRequests {
		t.Fatalf("rate limiter should run before JSON decode, got %d", badJSON.Code)
	}

	if got := truncate(strings.Repeat("a", 600), 512); len(got) != 512 {
		t.Fatalf("truncate length = %d", len(got))
	}
	forwarded := httptest.NewRequest(http.MethodGet, "/lim", nil)
	forwarded.Header.Set("X-Forwarded-For", "203.0.113.1, 10.0.0.1")
	if got := clientKey(forwarded); got != "203.0.113.1" {
		t.Fatalf("clientKey forwarded = %q", got)
	}
}

func TestRunStartsAndStops(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan error, 1)
	go func() { done <- Run(ctx, ":0", slog.New(slog.NewTextHandler(io.Discard, nil))) }()
	time.Sleep(20 * time.Millisecond)
	cancel()
	select {
	case err := <-done:
		if err != nil {
			t.Fatalf("Run returned %v", err)
		}
	case <-time.After(time.Second):
		t.Fatal("Run did not stop")
	}
}

func TestRateLimiterRejectsExcessCreates(t *testing.T) {
	limiter := NewRateLimiter(1, time.Minute)
	allowed, _ := limiter.Allow("client")
	if !allowed {
		t.Fatal("first request rejected")
	}
	allowed, retry := limiter.Allow("client")
	if allowed || retry <= 0 {
		t.Fatalf("second request allowed=%v retry=%v", allowed, retry)
	}
}

func waitForClicks(t *testing.T, store *Store, code string, want int) {
	t.Helper()
	for i := 0; i < 50; i++ {
		stats, _ := store.Stats(code)
		if stats.TotalClicks == want {
			return
		}
		time.Sleep(10 * time.Millisecond)
	}
	encoded, _ := json.Marshal(store.clicks[code])
	t.Fatalf("clicks did not reach %d: %s", want, string(encoded))
}
