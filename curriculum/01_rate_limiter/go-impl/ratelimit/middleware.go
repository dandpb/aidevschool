package ratelimit

import (
	"encoding/json"
	"net"
	"net/http"
	"strconv"
)

// ClientKey extracts the client identifier used as the bucket key. We use the
// TCP peer address (the closest thing to a "client_ip" the spec asks for) and
// strip the port. In deployments behind a trusted reverse proxy you would
// also consult X-Forwarded-For, but the spec doesn't require it and trusting
// unvalidated forwarded headers is a known footgun.
func ClientKey(r *http.Request) string {
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		// RemoteAddr might be a bare host (e.g. in some test harnesses).
		return r.RemoteAddr
	}
	return host
}

// Middleware returns an http.Handler middleware that enforces the limiter on
// every incoming request. If the bucket has a token, the wrapped handler is
// invoked and rate-limit headers are set. If not, a 429 is returned with
// Retry-After and a JSON body.
func (rl *RateLimiter) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		key := ClientKey(r)
		d := rl.Allow(key)

		h := w.Header()
		h.Set("X-RateLimit-Limit", strconv.Itoa(d.Limit))
		h.Set("X-RateLimit-Remaining", strconv.Itoa(d.Remaining))
		h.Set("X-RateLimit-Reset", strconv.FormatInt(d.Reset, 10))

		if !d.Allowed {
			h.Set("Retry-After", strconv.Itoa(d.RetryAfter))
			h.Set("Content-Type", "application/json")
			// Use WriteHeader explicitly so json.Encoder writes only the
			// body, not an extra status line.
			w.WriteHeader(http.StatusTooManyRequests)
			_ = json.NewEncoder(w).Encode(rateLimitResponse{
				Error:             "Too Many Requests",
				RetryAfterSeconds: d.RetryAfter,
			})
			return
		}
		next.ServeHTTP(w, r)
	})
}

// StatusHandler returns an http.Handler that reports the caller's current
// bucket state. It is intentionally NOT rate-limited — the spec says so
// explicitly, and rate-limiting your observability endpoint is a common
// production mistake that breaks debugging.
func (rl *RateLimiter) StatusHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		key := ClientKey(r)
		tokens, _ := rl.Snapshot(key)

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(statusResponse{
			ClientIP:            key,
			TokensRemaining:     tokens,
			MaxCapacity:         rl.capacity,
			RefillRatePerSecond: rl.refillPerSec,
		})
	})
}
