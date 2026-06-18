package gateway

import (
	"fmt"
	"net/http"
	"sort"
	"strings"
	"sync"
	"time"
)

// Coalescer deduplicates concurrent identical safe requests (FR-017, FR-018).
type Coalescer struct {
	policy CoalescingPolicy
	mu     sync.RWMutex
	store  map[string]*coalescedEntry
}

type coalescedEntry struct {
	result    *CoalescedResult
	createdAt time.Time
}

type CoalescedResult struct {
	StatusCode int
	Body       interface{ Read(p []byte) (n int, err error) }
}

func NewCoalescer(policy CoalescingPolicy) *Coalescer {
	return &Coalescer{
		policy: policy,
		store:  make(map[string]*coalescedEntry),
	}
}

// CanCoalesce returns true if the request method is coalescible for this route.
func (c *Coalescer) CanCoalesce(r *http.Request) bool {
	if !c.policy.Enabled {
		return false
	}
	for _, m := range c.policy.Methods {
		if strings.EqualFold(m, r.Method) {
			return true
		}
	}
	return false
}

// Key builds a coalescing key from route identity, method, path, query, tenant, and vary headers.
func (c *Coalescer) Key(r *http.Request, tenantID string) string {
	var parts []string
	parts = append(parts, r.Method)
	parts = append(parts, r.URL.Path)
	if r.URL.RawQuery != "" {
		parts = append(parts, r.URL.RawQuery)
	}
	parts = append(parts, "tenant="+tenantID)
	for _, h := range c.policy.VaryHeaders {
		if v := r.Header.Get(h); v != "" {
			parts = append(parts, fmt.Sprintf("%s=%s", h, v))
		}
	}
	sort.Strings(parts)
	return strings.Join(parts, "|")
}

// Get returns a cached coalesced result if present and not expired.
func (c *Coalescer) Get(key string) (*CoalescedResult, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	entry, ok := c.store[key]
	if !ok {
		return nil, false
	}
	ttl := time.Duration(c.policy.TTLMS) * time.Millisecond
	if time.Since(entry.createdAt) > ttl {
		return nil, false
	}
	return entry.result, true
}

// Store caches a coalesced result with a TTL.
func (c *Coalescer) Store(key string, result *CoalescedResult, ttlMS int) {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.store[key] = &coalescedEntry{
		result:    result,
		createdAt: time.Now(),
	}

	// Clean expired entries
	now := time.Now()
	for k, v := range c.store {
		if now.Sub(v.createdAt) > time.Duration(ttlMS)*time.Millisecond {
			delete(c.store, k)
		}
	}
}