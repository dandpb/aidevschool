package ratelimit

import (
	"encoding/json"
	"net/http"
	"strconv"
)

// rateLimitResponse is the JSON body of a 429.
type rateLimitResponse struct {
	Error             string `json:"error"`
	RetryAfterSeconds int    `json:"retry_after_seconds"`
}

// statusResponse is the JSON body of /status. Field names match the spec
// verbatim (snake_case) so cross-language clients see the same shape.
type statusResponse struct {
	ClientIP            string  `json:"client_ip"`
	TokensRemaining     float64 `json:"tokens_remaining"`
	MaxCapacity         float64 `json:"max_capacity"`
	RefillRatePerSecond float64 `json:"refill_rate_per_second"`
}

// StatusInfo is the data required to render the /status response.
type StatusInfo struct {
	ClientKey    string
	Tokens       float64
	Capacity     float64
	RefillPerSec float64
}

// ResponseComposer centralizes the HTTP response contract for the rate
// limiter. It is the only place that knows about header names, JSON body
// shapes, status codes, and Content-Type. Callers decide *whether* to allow
// or block a request; the composer decides how that decision is expressed
// over HTTP.
type ResponseComposer interface {
	// WriteAllowed sets the standard rate-limit headers on a response that
	// will proceed to the wrapped handler. The caller must invoke
	// next.ServeHTTP after this returns.
	WriteAllowed(w http.ResponseWriter, d Decision)

	// WriteBlocked writes a complete 429 Too Many Requests response,
	// including rate-limit headers, Retry-After, Content-Type, and a JSON
	// body.
	WriteBlocked(w http.ResponseWriter, d Decision)

	// WriteStatus writes a complete 200 OK /status response with the
	// caller's current bucket state.
	WriteStatus(w http.ResponseWriter, info StatusInfo)
}

// JSONComposer is the default ResponseComposer. All bodies are JSON and
// header names match the spec.
type JSONComposer struct{}

// WriteAllowed sets X-RateLimit-* headers.
func (JSONComposer) WriteAllowed(w http.ResponseWriter, d Decision) {
	h := w.Header()
	h.Set("X-RateLimit-Limit", strconv.Itoa(d.Limit))
	h.Set("X-RateLimit-Remaining", strconv.Itoa(d.Remaining))
	h.Set("X-RateLimit-Reset", strconv.FormatInt(d.Reset, 10))
}

// WriteBlocked writes a 429 with rate-limit headers, Retry-After, and a JSON
// body. It uses WriteHeader explicitly so json.Encoder writes only the body,
// not an extra status line.
func (JSONComposer) WriteBlocked(w http.ResponseWriter, d Decision) {
	h := w.Header()
	h.Set("X-RateLimit-Limit", strconv.Itoa(d.Limit))
	h.Set("X-RateLimit-Remaining", strconv.Itoa(d.Remaining))
	h.Set("X-RateLimit-Reset", strconv.FormatInt(d.Reset, 10))
	h.Set("Retry-After", strconv.Itoa(d.RetryAfter))
	h.Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusTooManyRequests)
	_ = json.NewEncoder(w).Encode(rateLimitResponse{
		Error:             "Too Many Requests",
		RetryAfterSeconds: d.RetryAfter,
	})
}

// WriteStatus writes a JSON status payload.
func (JSONComposer) WriteStatus(w http.ResponseWriter, info StatusInfo) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(statusResponse{
		ClientIP:            info.ClientKey,
		TokensRemaining:     info.Tokens,
		MaxCapacity:         info.Capacity,
		RefillRatePerSecond: info.RefillPerSec,
	})
}
