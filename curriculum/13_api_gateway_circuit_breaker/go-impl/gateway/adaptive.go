package gateway

import "sync"

// AdaptiveConcurrency implements a simple adaptive concurrency limiter.
// It rejects requests when the current in-flight count exceeds the limit.

type AdaptiveSnapshot struct {
	EffectiveLimit int   `json:"effective_limit"`
	InFlight       int   `json:"in_flight"`
	Rejected       int64 `json:"rejected"`
}

type AdaptiveConcurrency struct {
	mu       sync.Mutex
	limit    int
	inFlight int
	rejected int64
	policy   AdaptiveConcurrencyPolicy
}

func NewAdaptiveConcurrency(policy AdaptiveConcurrencyPolicy) *AdaptiveConcurrency {
	limit := 10
	if policy.MaxLimit > 0 {
		limit = policy.MaxLimit
	}
	if policy.MinLimit > 0 && limit < policy.MinLimit {
		limit = policy.MinLimit
	}
	return &AdaptiveConcurrency{
		limit:  limit,
		policy: policy,
	}
}

func (a *AdaptiveConcurrency) Allow() bool {
	a.mu.Lock()
	defer a.mu.Unlock()
	if a.inFlight >= a.limit {
		a.rejected++
		return false
	}
	a.inFlight++
	return true
}

func (a *AdaptiveConcurrency) Release() {
	a.mu.Lock()
	defer a.mu.Unlock()
	if a.inFlight > 0 {
		a.inFlight--
	}
}

func (a *AdaptiveConcurrency) Snapshot() AdaptiveSnapshot {
	a.mu.Lock()
	defer a.mu.Unlock()
	return AdaptiveSnapshot{
		EffectiveLimit: a.limit,
		InFlight:       a.inFlight,
		Rejected:       a.rejected,
	}
}
