package gateway

import (
	"sync"
	"time"
)

type CircuitState int

const (
	StateClosed CircuitState = iota
	StateOpen
	StateHalfOpen
)

func (s CircuitState) String() string {
	switch s {
	case StateClosed:
		return "closed"
	case StateOpen:
		return "open"
	case StateHalfOpen:
		return "half_open"
	}
	return "unknown"
}

type CircuitBreaker struct {
	mu                  sync.RWMutex
	state               CircuitState
	policy              CircuitBreakerPolicy
	window              []windowEntry
	openedAt            time.Time
	halfOpenSuccesses   int
	halfOpenInFlight    int
	lastTransitionState string
}

type windowEntry struct {
	success   bool
	timestamp time.Time
}

type CircuitSnapshot struct {
	State                 string
	FailureCount           int64
	SuccessCount           int64
	OpenedAt               *time.Time
	HalfOpenProbeInFlight  int
	LastTransitionReason   string
}

func NewCircuitBreaker(policy CircuitBreakerPolicy) *CircuitBreaker {
	return &CircuitBreaker{policy: policy, state: StateClosed, lastTransitionState: "initial"}
}

func (cb *CircuitBreaker) Allow() bool {
	cb.mu.Lock()
	defer cb.mu.Unlock()

	cb.cleanWindow()

	switch cb.state {
	case StateClosed:
		return true
	case StateOpen:
		if time.Since(cb.openedAt) >= time.Duration(cb.policy.OpenCooldownMS)*time.Millisecond {
			cb.state = StateHalfOpen
			cb.halfOpenSuccesses = 0
			cb.halfOpenInFlight = 0
			cb.lastTransitionState = "cooldown_expired"
			return true
		}
		return false
	case StateHalfOpen:
		if cb.halfOpenInFlight < cb.policy.HalfOpenMaxProbes {
			cb.halfOpenInFlight++
			return true
		}
		return false
	}
	return false
}

func (cb *CircuitBreaker) RecordSuccess() {
	cb.mu.Lock()
	defer cb.mu.Unlock()

	cb.window = append(cb.window, windowEntry{success: true, timestamp: time.Now()})
	cb.cleanWindow()

	if cb.state == StateHalfOpen {
		cb.halfOpenSuccesses++
		cb.halfOpenInFlight--
		if cb.halfOpenSuccesses >= cb.policy.HalfOpenSuccessesToClose {
			cb.state = StateClosed
			cb.halfOpenSuccesses = 0
			cb.halfOpenInFlight = 0
			cb.lastTransitionState = "half_open_successes"
		}
	}
}

func (cb *CircuitBreaker) RecordFailure() {
	cb.mu.Lock()
	defer cb.mu.Unlock()

	cb.window = append(cb.window, windowEntry{success: false, timestamp: time.Now()})
	cb.cleanWindow()

	if cb.state == StateHalfOpen {
		cb.halfOpenInFlight--
		cb.state = StateOpen
		cb.openedAt = time.Now()
		cb.lastTransitionState = "half_open_failure"
		return
	}

	var failures, total int64
	for _, e := range cb.window {
		total++
		if !e.success {
			failures++
		}
	}
	if total >= cb.policy.MinimumRequests && float64(failures)/float64(total) >= cb.policy.FailureRateThreshold {
		cb.state = StateOpen
		cb.openedAt = time.Now()
		cb.lastTransitionState = "failure_threshold"
	}
}

func (cb *CircuitBreaker) cleanWindow() {
	cutoff := time.Now().Add(-time.Duration(cb.policy.WindowMS) * time.Millisecond)
	i := 0
	for ; i < len(cb.window) && cb.window[i].timestamp.Before(cutoff); i++ {
	}
	if i > 0 {
		cb.window = cb.window[i:]
	}
}

func (cb *CircuitBreaker) Snapshot() CircuitSnapshot {
	cb.mu.RLock()
	defer cb.mu.RUnlock()

	var failures, successes int64
	for _, e := range cb.window {
		if e.success {
			successes++
		} else {
			failures++
		}
	}

	snap := CircuitSnapshot{
		State:                 cb.state.String(),
		FailureCount:          failures,
		SuccessCount:          successes,
		HalfOpenProbeInFlight: cb.halfOpenInFlight,
		LastTransitionReason:  cb.lastTransitionState,
	}
	if !cb.openedAt.IsZero() {
		t := cb.openedAt
		snap.OpenedAt = &t
	}
	return snap
}