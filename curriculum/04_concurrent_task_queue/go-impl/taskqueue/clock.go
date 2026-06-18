package taskqueue

import (
	"sync"
	"time"
)

type Clock interface{ Now() time.Time }

type RealClock struct{}

func (RealClock) Now() time.Time { return time.Now().UTC() }

type ManualClock struct {
	mu  sync.Mutex
	now time.Time
}

func NewManualClock(now time.Time) *ManualClock { return &ManualClock{now: now.UTC()} }

func (c *ManualClock) Now() time.Time {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.now
}

func (c *ManualClock) Advance(d time.Duration) {
	c.mu.Lock()
	c.now = c.now.Add(d)
	c.mu.Unlock()
}
