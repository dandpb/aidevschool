package gateway

import (
	"sync"
	"time"
)

type TenantLimiter struct {
	mu       sync.RWMutex
	capacity int
	refill   float64
	buckets  map[string]*tokenBucket
}

type tokenBucket struct {
	tokens     float64
	lastRefill time.Time
}

func NewTenantLimiter(capacity int, refillPerSecond float64) *TenantLimiter {
	return &TenantLimiter{
		capacity: capacity,
		refill:   refillPerSecond,
		buckets:  make(map[string]*tokenBucket),
	}
}

func (tl *TenantLimiter) Allow(tenantID string) bool {
	tl.mu.Lock()
	defer tl.mu.Unlock()

	b, ok := tl.buckets[tenantID]
	if !ok {
		b = &tokenBucket{tokens: float64(tl.capacity), lastRefill: time.Now()}
		tl.buckets[tenantID] = b
	}

	now := time.Now()
	elapsed := now.Sub(b.lastRefill).Seconds()
	b.tokens = min(float64(tl.capacity), b.tokens+elapsed*tl.refill)
	b.lastRefill = now

	if b.tokens >= 1 {
		b.tokens--
		return true
	}
	return false
}

func (tl *TenantLimiter) TokensRemaining(tenantID string) float64 {
	tl.mu.RLock()
	defer tl.mu.RUnlock()

	b, ok := tl.buckets[tenantID]
	if !ok {
		return float64(tl.capacity)
	}

	now := time.Now()
	elapsed := now.Sub(b.lastRefill).Seconds()
	tokens := min(float64(tl.capacity), b.tokens+elapsed*tl.refill)
	return tokens
}

func (tl *TenantLimiter) ResetAt(tenantID string) time.Time {
	tl.mu.RLock()
	defer tl.mu.RUnlock()

	b, ok := tl.buckets[tenantID]
	if !ok {
		return time.Now()
	}

	now := time.Now()
	elapsed := now.Sub(b.lastRefill).Seconds()
	tokens := min(float64(tl.capacity), b.tokens+elapsed*tl.refill)
	needed := float64(tl.capacity) - tokens
	seconds := needed / tl.refill
	return now.Add(time.Duration(seconds) * time.Second)
}