// Package ratelimit implements an in-memory token-bucket rate limiter and the
// HTTP middleware that enforces it. All exported types are safe for concurrent
// use.
package ratelimit

import "time"

// Clock abstracts time access so tests can advance time deterministically
// without sleeping. Implementations must be safe for concurrent use.
type Clock interface {
	// Now returns the clock's current time.
	Now() time.Time
}

// RealClock returns the system wall clock.
type RealClock struct{}

// Now implements Clock.
func (RealClock) Now() time.Time { return time.Now() }
