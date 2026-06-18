package ratelimit

import (
	"net"
	"net/http"
	"strings"
)

// ClientKeyStrategy resolves a client identifier from an HTTP request.
// The identifier is used as the bucket key by the rate limiter.
// Implementations decide how to extract and normalize the client IP (or any
// other key) from the request.
type ClientKeyStrategy interface {
	ClientKey(r *http.Request) string
}

// RemoteAddrKeyStrategy uses the connection's RemoteAddr, stripping the
// port. This is the safe default when there is no trusted reverse proxy.
type RemoteAddrKeyStrategy struct{}

// ClientKey implements ClientKeyStrategy.
func (RemoteAddrKeyStrategy) ClientKey(r *http.Request) string {
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		// RemoteAddr might be a bare host (e.g. in some test harnesses).
		return r.RemoteAddr
	}
	return host
}

// ForwardedHeaderKeyStrategy reads a forwarded header (for example
// X-Forwarded-For) and uses its leftmost non-empty value as the client key,
// stripping any port. If the header is missing or empty it falls back to the
// provided strategy.
//
// Only use this when the immediate upstream is a trusted reverse proxy;
// otherwise clients can spoof their key. The spec's default behavior remains
// RemoteAddrKeyStrategy.
type ForwardedHeaderKeyStrategy struct {
	Header   string
	Fallback ClientKeyStrategy
}

// ClientKey implements ClientKeyStrategy.
func (s ForwardedHeaderKeyStrategy) ClientKey(r *http.Request) string {
	fallback := s.Fallback
	if fallback == nil {
		fallback = RemoteAddrKeyStrategy{}
	}

	h := r.Header.Get(s.Header)
	if h == "" {
		return fallback.ClientKey(r)
	}

	for _, part := range strings.Split(h, ",") {
		ip := strings.TrimSpace(part)
		if ip == "" {
			continue
		}
		host, _, err := net.SplitHostPort(ip)
		if err == nil {
			return host
		}
		return ip
	}

	return fallback.ClientKey(r)
}
