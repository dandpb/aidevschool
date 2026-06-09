package ratelimit

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strconv"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

// fakeClock is a deterministic Clock for tests. Tests advance time via
// Advance() so lazy-refill behavior is reproducible without time.Sleep.
type fakeClock struct {
	mu sync.Mutex
	t  time.Time
}

func newFakeClock() *fakeClock {
	return &fakeClock{t: time.Unix(1_700_000_000, 0).UTC()}
}

func (c *fakeClock) Now() time.Time {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.t
}

func (c *fakeClock) Advance(d time.Duration) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.t = c.t.Add(d)
}

// noopHandler is the inner handler used by middleware tests. It does
// nothing so headers we observe come from the middleware, not the body.
var noopHandler = http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
	w.WriteHeader(http.StatusOK)
})

// doGet fires one request through the wrapped handler. Centralized here
// because every middleware test would otherwise repeat the same five lines.
func doGet(h http.Handler, remoteAddr string) *httptest.ResponseRecorder {
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.RemoteAddr = remoteAddr
	h.ServeHTTP(rec, req)
	return rec
}

// ---------------------------------------------------------------------------
// Functional requirement 1: token-bucket algorithm (capacity, refill rate).
// ---------------------------------------------------------------------------

func TestRateLimiter_StartsFullAndConsumes(t *testing.T) {
	clk := newFakeClock()
	rl := NewRateLimiter(10, 2, clk)

	// First 10 calls must all be allowed: bucket starts full.
	for i := 0; i < 10; i++ {
		d := rl.Allow("1.2.3.4")
		if !d.Allowed {
			t.Fatalf("call %d: expected allowed, got blocked (remaining=%d)", i+1, d.Remaining)
		}
	}
	// 11th call must be blocked.
	d := rl.Allow("1.2.3.4")
	if d.Allowed {
		t.Fatalf("call 11: expected blocked, got allowed (remaining=%d)", d.Remaining)
	}
}

func TestRateLimiter_LazyRefillAfterAdvance(t *testing.T) {
	clk := newFakeClock()
	rl := NewRateLimiter(2, 2, clk) // 2 tokens, 2 t/s → bucket recovers in 1s

	// Drain.
	rl.Allow("a")
	rl.Allow("a")
	if d := rl.Allow("a"); d.Allowed {
		t.Fatalf("expected blocked after drain, got allowed")
	}

	// Advance 1s → bucket should be full again (2 tokens regenerated).
	clk.Advance(time.Second)
	if d := rl.Allow("a"); !d.Allowed {
		t.Fatalf("expected allowed after 1s refill, got blocked (remaining=%d)", d.Remaining)
	}
}

func TestRateLimiter_RefillIsCappedAtCapacity(t *testing.T) {
	clk := newFakeClock()
	rl := NewRateLimiter(5, 100, clk) // very fast refill; cap is the ceiling

	// Consume 1.
	rl.Allow("x")
	// Advance "1 hour" — refill should cap at capacity, not overflow.
	clk.Advance(time.Hour)
	tokens, _ := rl.Snapshot("x")
	if tokens != 5 {
		t.Fatalf("expected tokens capped at 5, got %v", tokens)
	}
}

func TestRateLimiter_PerClientIsolation(t *testing.T) {
	clk := newFakeClock()
	rl := NewRateLimiter(1, 0, clk) // 1 token, no refill

	if d := rl.Allow("alice"); !d.Allowed {
		t.Fatalf("alice first: expected allowed")
	}
	if d := rl.Allow("bob"); !d.Allowed {
		t.Fatalf("bob first: expected allowed (separate bucket)")
	}
	if d := rl.Allow("alice"); d.Allowed {
		t.Fatalf("alice second: expected blocked (own bucket drained)")
	}
}

// ---------------------------------------------------------------------------
// Functional requirement 4: HTTP headers on every response.
// ---------------------------------------------------------------------------

func TestMiddleware_HeadersOnSuccess(t *testing.T) {
	clk := newFakeClock()
	rl := NewRateLimiter(10, 2, clk)
	h := rl.Middleware(noopHandler)

	rec := doGet(h, "1.2.3.4:5555")
	if rec.Code != http.StatusOK {
		t.Fatalf("status: got %d, want 200", rec.Code)
	}
	if got := rec.Header().Get("X-RateLimit-Limit"); got != "10" {
		t.Errorf("X-RateLimit-Limit: got %q, want 10", got)
	}
	if got := rec.Header().Get("X-RateLimit-Remaining"); got != "9" {
		t.Errorf("X-RateLimit-Remaining: got %q, want 9", got)
	}
	if got := rec.Header().Get("X-RateLimit-Reset"); got == "" {
		t.Errorf("X-RateLimit-Reset: missing")
	}
	// Retry-After must NOT be set on a successful response.
	if got := rec.Header().Get("Retry-After"); got != "" {
		t.Errorf("Retry-After: should be empty on 200, got %q", got)
	}
}

func TestMiddleware_HeadersOn429(t *testing.T) {
	clk := newFakeClock()
	rl := NewRateLimiter(1, 2, clk)
	h := rl.Middleware(noopHandler)

	_ = doGet(h, "1.2.3.4:1")    // consume the single token
	rec := doGet(h, "1.2.3.4:1") // blocked

	if rec.Code != http.StatusTooManyRequests {
		t.Fatalf("status: got %d, want 429", rec.Code)
	}
	if got := rec.Header().Get("X-RateLimit-Limit"); got != "1" {
		t.Errorf("X-RateLimit-Limit: got %q, want 1", got)
	}
	if got := rec.Header().Get("X-RateLimit-Remaining"); got != "0" {
		t.Errorf("X-RateLimit-Remaining: got %q, want 0", got)
	}
	// Retry-After must be present and >= 1.
	raStr := rec.Header().Get("Retry-After")
	if raStr == "" {
		t.Fatalf("Retry-After: missing on 429")
	}
	ra, err := strconv.Atoi(raStr)
	if err != nil || ra < 1 {
		t.Errorf("Retry-After: got %q, want positive integer", raStr)
	}
}

func TestMiddleware_429BodyShape(t *testing.T) {
	clk := newFakeClock()
	rl := NewRateLimiter(1, 2, clk)
	h := rl.Middleware(noopHandler)

	_ = doGet(h, "1.2.3.4:1")
	rec := doGet(h, "1.2.3.4:1")

	if ct := rec.Header().Get("Content-Type"); ct == "" {
		t.Errorf("expected Content-Type on 429 body")
	}
	var body map[string]interface{}
	if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
		t.Fatalf("decode 429 body: %v", err)
	}
	if body["error"] != "Too Many Requests" {
		t.Errorf("body.error: got %v, want 'Too Many Requests'", body["error"])
	}
	if _, ok := body["retry_after_seconds"].(float64); !ok {
		t.Errorf("body.retry_after_seconds: missing or wrong type, got %v", body["retry_after_seconds"])
	}
}

func TestMiddleware_RetryAfterMatchesRefillRate(t *testing.T) {
	// Cap=1, rate=0.5 t/s → 1 token takes 2s. retry_after must round up to 2.
	clk := newFakeClock()
	rl := NewRateLimiter(1, 0.5, clk)
	h := rl.Middleware(noopHandler)

	_ = doGet(h, "1.2.3.4:1")
	rec := doGet(h, "1.2.3.4:1")

	if rec.Code != http.StatusTooManyRequests {
		t.Fatalf("expected 429, got %d", rec.Code)
	}
	if got := rec.Header().Get("Retry-After"); got != "2" {
		t.Errorf("Retry-After: got %q, want 2 (0.5 t/s → 2s wait)", got)
	}
}

// ---------------------------------------------------------------------------
// Functional requirement 3: /status endpoint.
// ---------------------------------------------------------------------------

func TestStatusHandler_ShapeAndValues(t *testing.T) {
	clk := newFakeClock()
	rl := NewRateLimiter(10, 2, clk)
	// Consume 1 token to make Remaining observably < capacity. Use the
	// post-strip key ("9.9.9.9") — the same form the handler derives from
	// req.RemoteAddr via ClientKey.
	rl.Allow("9.9.9.9")

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/status", nil)
	req.RemoteAddr = "9.9.9.9:54321"
	rl.StatusHandler().ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status: got %d, want 200", rec.Code)
	}
	var body map[string]interface{}
	if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if body["client_ip"] != "9.9.9.9" {
		t.Errorf("client_ip: got %v, want 9.9.9.9", body["client_ip"])
	}
	if cap, ok := body["max_capacity"].(float64); !ok || cap != 10 {
		t.Errorf("max_capacity: got %v, want 10", body["max_capacity"])
	}
	if rate, ok := body["refill_rate_per_second"].(float64); !ok || rate != 2 {
		t.Errorf("refill_rate_per_second: got %v, want 2", body["refill_rate_per_second"])
	}
	if rem, ok := body["tokens_remaining"].(float64); !ok || rem < 8.9 || rem > 9.1 {
		t.Errorf("tokens_remaining: got %v, want ~9.0", body["tokens_remaining"])
	}
}

func TestStatusHandler_FullBucketForUnknownClient(t *testing.T) {
	clk := newFakeClock()
	rl := NewRateLimiter(10, 2, clk)
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/status", nil)
	req.RemoteAddr = "5.5.5.5:1"
	rl.StatusHandler().ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("status: got %d, want 200", rec.Code)
	}
	var body map[string]interface{}
	_ = json.NewDecoder(rec.Body).Decode(&body)
	if rem, _ := body["tokens_remaining"].(float64); rem != 10 {
		t.Errorf("tokens_remaining: got %v, want 10 for unknown client", rem)
	}
}

func TestStatusHandler_NotRateLimited(t *testing.T) {
	clk := newFakeClock()
	rl := NewRateLimiter(1, 0, clk) // tiny bucket, no refill
	h := rl.StatusHandler()

	// Hit /status way more than the bucket capacity; all must return 200.
	for i := 0; i < 50; i++ {
		rec := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, "/status", nil)
		req.RemoteAddr = "1.2.3.4:1"
		h.ServeHTTP(rec, req)
		if rec.Code != http.StatusOK {
			t.Fatalf("call %d: /status must never 429, got %d", i, rec.Code)
		}
	}
}

// ---------------------------------------------------------------------------
// Functional requirement 6: concurrency safety.
// ---------------------------------------------------------------------------

func TestRateLimiter_ConcurrentAccessNoRace(t *testing.T) {
	// 50 goroutines × 200 calls each on the same key. With capacity=1000 and
	// rate=1000, the exact allowed/blocked split is timing-dependent; the
	// invariants we check are: (a) no data race, (b) the total allowed count
	// never exceeds what a single-threaded run would allow (sanity).
	clk := newFakeClock()
	rl := NewRateLimiter(1000, 1000, clk)

	const goroutines = 50
	const perGoroutine = 200
	var allowed int64
	var wg sync.WaitGroup
	wg.Add(goroutines)
	for i := 0; i < goroutines; i++ {
		go func() {
			defer wg.Done()
			for j := 0; j < perGoroutine; j++ {
				if d := rl.Allow("shared"); d.Allowed {
					atomic.AddInt64(&allowed, 1)
				}
			}
		}()
	}
	wg.Wait()

	// Bucket starts with 1000 tokens; rate is high enough that a single
	// second of fake time will refill all consumed tokens back to 1000.
	// So total allowed should be at least 1000 (the initial grant) and at
	// most 1000 + (refill opportunities * 1000). With Advance(0) in this
	// test we expect exactly 1000 allowed (the starting bucket).
	if allowed < 1000 || allowed > 1000 {
		t.Errorf("allowed count: got %d, want exactly 1000 (initial bucket, no time advanced)", allowed)
	}
}

func TestRateLimiter_ConcurrentDifferentKeys(t *testing.T) {
	clk := newFakeClock()
	rl := NewRateLimiter(1, 0, clk)
	const goroutines = 100
	var wg sync.WaitGroup
	wg.Add(goroutines)
	for i := 0; i < goroutines; i++ {
		i := i
		go func() {
			defer wg.Done()
			// Each goroutine uses its own key — every call must succeed.
			key := "client-" + strconv.Itoa(i)
			if d := rl.Allow(key); !d.Allowed {
				t.Errorf("client %d first call: expected allowed, got blocked", i)
			}
		}()
	}
	wg.Wait()
}

func TestMiddleware_ConcurrentRequests(t *testing.T) {
	// Drive the full HTTP stack concurrently to catch data races in the
	// response header path as well as the limiter.
	clk := newFakeClock()
	rl := NewRateLimiter(100, 100, clk)
	h := rl.Middleware(noopHandler)

	const goroutines = 50
	const perGoroutine = 20
	var wg sync.WaitGroup
	wg.Add(goroutines)
	for i := 0; i < goroutines; i++ {
		go func() {
			defer wg.Done()
			for j := 0; j < perGoroutine; j++ {
				rec := doGet(h, "1.2.3.4:1")
				if rec.Header().Get("X-RateLimit-Limit") == "" {
					t.Errorf("missing X-RateLimit-Limit on concurrent call")
				}
			}
		}()
	}
	wg.Wait()
}

// ---------------------------------------------------------------------------
// Functional requirement 7: cleanup of idle buckets.
// ---------------------------------------------------------------------------

func TestCleanupIdle_RemovesOnlyIdleBuckets(t *testing.T) {
	clk := newFakeClock()
	rl := NewRateLimiter(10, 2, clk)
	rl.SetIdleTTL(time.Hour)

	rl.Allow("idle-bob")
	rl.Allow("active-alice")

	// Advance 2h; only "active-alice" remains seen recently.
	clk.Advance(2 * time.Hour)
	rl.Allow("active-alice")

	// Touch both buckets, then move forward a short time and run cleanup
	// at the boundary. We re-touch "active-alice" above; we need to make
	// sure "idle-bob" is still untouched, so we don't touch it again.
	// Cleanup uses lastSeen, so "idle-bob" hasn't been seen for 2h, while
	// "active-alice" was just seen.
	clk.Advance(1 * time.Minute) // small extra advance
	removed := rl.CleanupIdle(clk.Now())
	if removed != 1 {
		t.Errorf("expected 1 bucket removed, got %d", removed)
	}
	if rl.Size() != 1 {
		t.Errorf("expected 1 bucket remaining, got %d", rl.Size())
	}
}

func TestCleanupIdle_RespectsTTL(t *testing.T) {
	clk := newFakeClock()
	rl := NewRateLimiter(10, 2, clk)
	rl.SetIdleTTL(30 * time.Minute)

	rl.Allow("a")
	clk.Advance(31 * time.Minute)
	if removed := rl.CleanupIdle(clk.Now()); removed != 1 {
		t.Errorf("expected 1 removed at 31min, got %d", removed)
	}

	rl.Allow("b")
	clk.Advance(29 * time.Minute)
	if removed := rl.CleanupIdle(clk.Now()); removed != 0 {
		t.Errorf("expected 0 removed at 29min, got %d", removed)
	}
}

func TestCleanupLoop_StopsOnContextCancel(t *testing.T) {
	clk := newFakeClock()
	rl := NewRateLimiter(10, 2, clk)
	ctx, cancel := context.WithCancel(context.Background())

	done := make(chan struct{})
	go func() {
		rl.CleanupLoop(ctx, 10*time.Millisecond)
		close(done)
	}()

	// Let it run a couple of ticks.
	time.Sleep(30 * time.Millisecond)
	cancel()

	select {
	case <-done:
		// success
	case <-time.After(time.Second):
		t.Fatal("CleanupLoop did not exit within 1s of context cancel")
	}
}

// ---------------------------------------------------------------------------
// Reset epoch and Retry-After edge cases.
// ---------------------------------------------------------------------------

func TestResetEpoch_AdvancesAfterConsumption(t *testing.T) {
	clk := newFakeClock()
	rl := NewRateLimiter(10, 2, clk)

	d := rl.Allow("a")
	// tokens = 9, deficit = 1, rate = 2 → 0.5s to full
	expected := clk.Now().Add(500 * time.Millisecond).Unix()
	if d.Reset != expected {
		t.Errorf("Reset: got %d, want %d (now+0.5s)", d.Reset, expected)
	}
}

func TestRetryAfter_NeverZeroWhenBlocked(t *testing.T) {
	// Pathological config: very high refill rate → sub-second wait.
	// The header must still be at least 1 second to avoid hot loops.
	clk := newFakeClock()
	rl := NewRateLimiter(1, 1000, clk)
	_ = rl.Allow("a")
	d := rl.Allow("a")
	if d.Allowed {
		t.Fatal("expected blocked")
	}
	if d.RetryAfter < 1 {
		t.Errorf("RetryAfter: got %d, want >= 1", d.RetryAfter)
	}
}

func TestZeroRefill_StaysBlocked(t *testing.T) {
	clk := newFakeClock()
	rl := NewRateLimiter(2, 0, clk)
	rl.Allow("a")
	rl.Allow("a")
	for i := 0; i < 5; i++ {
		clk.Advance(time.Second)
		if d := rl.Allow("a"); d.Allowed {
			t.Fatalf("call %d: expected blocked with zero refill", i)
		}
	}
}

// ---------------------------------------------------------------------------
// ClientKey extraction
// ---------------------------------------------------------------------------

func TestClientKey_StripsPort(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.RemoteAddr = "192.0.2.1:54321"
	if got := ClientKey(req); got != "192.0.2.1" {
		t.Errorf("got %q, want 192.0.2.1", got)
	}
}

func TestClientKey_BareHost(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.RemoteAddr = "192.0.2.1" // no port
	if got := ClientKey(req); got != "192.0.2.1" {
		t.Errorf("got %q, want 192.0.2.1", got)
	}
}

// ---------------------------------------------------------------------------
// Misc helpers: capacity/refill getters, real clock, constructor edge cases.
// ---------------------------------------------------------------------------

func TestRateLimiter_Getters(t *testing.T) {
	rl := NewRateLimiter(7, 3, nil)
	if rl.Capacity() != 7 {
		t.Errorf("Capacity: got %v, want 7", rl.Capacity())
	}
	if rl.RefillRate() != 3 {
		t.Errorf("RefillRate: got %v, want 3", rl.RefillRate())
	}
}

func TestNewRateLimiter_NilClockUsesReal(t *testing.T) {
	rl := NewRateLimiter(1, 1, nil)
	if rl.clock == nil {
		t.Fatal("expected default clock to be set when nil is passed")
	}
	// We don't actually call rl.clock.Now() because we don't want a
	// time-based flake, but the type assertion is enough.
	if _, ok := rl.clock.(RealClock); !ok {
		t.Errorf("expected RealClock, got %T", rl.clock)
	}
}

func TestNewRateLimiter_NegativeValuesClamped(t *testing.T) {
	rl := NewRateLimiter(-1, -2, nil)
	if rl.capacity != 0 {
		t.Errorf("capacity: got %v, want 0", rl.capacity)
	}
	if rl.refillPerSec != 0 {
		t.Errorf("refillPerSec: got %v, want 0", rl.refillPerSec)
	}
}

func TestRealClock_NowIsRecent(t *testing.T) {
	before := time.Now()
	got := RealClock{}.Now()
	after := time.Now()
	if got.Before(before) || got.After(after) {
		t.Errorf("RealClock.Now returned out-of-range value: %v (window %v..%v)", got, before, after)
	}
}

func TestRefill_ClampsNegativeElapsed(t *testing.T) {
	// We can't easily make the fake clock go backwards because the API only
	// exposes Advance(+). Instead, directly verify the clamp by manipulating
	// the bucket after construction.
	clk := newFakeClock()
	rl := NewRateLimiter(10, 2, clk)
	b := &ClientBucket{tokens: 5, lastRefill: clk.Now()}
	// Call refill with a "now" earlier than lastRefill — simulates clock skew.
	rl.refill(b, clk.Now().Add(-time.Hour))
	if b.tokens != 5 {
		t.Errorf("tokens should be unchanged on negative elapsed, got %v", b.tokens)
	}
}

func TestRateLimiter_TableDrivenFunctionalSpec(t *testing.T) {
	type tc struct {
		name        string
		capacity    float64
		rate        float64
		calls       int
		advanceEach time.Duration
		wantAllowed int
	}
	cases := []tc{
		{"cap=5, no time, 5 calls: all 5 allowed", 5, 100, 5, 0, 5},
		{"cap=5, no time, 10 calls: only 5 allowed", 5, 100, 10, 0, 5},
		{"cap=1, 1t/s, 3 calls, 1s advance: all 3 allowed (refill catches up)", 1, 1, 3, time.Second, 3},
		{"cap=1, 1t/s, 3 calls, 500ms advance: 2 allowed (last BLOCKED)", 1, 1, 3, 500 * time.Millisecond, 2},
		{"cap=3, 0t/s, 6 calls, 1s advance: only 3 allowed", 3, 0, 6, time.Second, 3},
		{"cap=10, 10t/s, 15 calls, 100ms advance: all 15 allowed (refill keeps up)", 10, 10, 15, 100 * time.Millisecond, 15},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			clk := newFakeClock()
			rl := NewRateLimiter(c.capacity, c.rate, clk)
			allowed := 0
			for i := 0; i < c.calls; i++ {
				if d := rl.Allow("k"); d.Allowed {
					allowed++
				}
				if c.advanceEach > 0 {
					clk.Advance(c.advanceEach)
				}
			}
			if allowed != c.wantAllowed {
				t.Errorf("allowed: got %d, want %d", allowed, c.wantAllowed)
			}
		})
	}
}
