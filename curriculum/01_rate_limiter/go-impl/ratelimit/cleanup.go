package ratelimit

import (
	"context"
	"time"
)

// SetIdleTTL overrides the default 1h idle threshold. Useful for tests and
// for ops who want to tune memory pressure in real environments. Guarded
// by a RWMutex so concurrent reads from the cleanup loop never see a
// torn value.
func (rl *RateLimiter) SetIdleTTL(d time.Duration) {
	rl.idleMu.Lock()
	defer rl.idleMu.Unlock()
	rl.idleTTL = d
}

// readIdleTTL returns the current idle threshold. Safe to call without
// holding any shard mutex.
func (rl *RateLimiter) readIdleTTL() time.Duration {
	rl.idleMu.RLock()
	defer rl.idleMu.RUnlock()
	return rl.idleTTL
}

// CleanupIdle removes every bucket whose lastSeen is older than the
// configured idleTTL relative to `now`. It returns the number of buckets
// removed. Safe to call concurrently with Allow — each shard is locked
// independently and the operation is idempotent.
func (rl *RateLimiter) CleanupIdle(now time.Time) int {
	idleTTL := rl.readIdleTTL() // snapshot once; later changes don't affect this sweep
	total := 0
	for i := range rl.shards {
		rl.shards[i].mu.Lock()
		total += cleanupShardLocked(&rl.shards[i], now, idleTTL)
		rl.shards[i].mu.Unlock()
	}
	return total
}

// cleanupShardLocked must be called with s.mu held. It is a per-shard
// helper so the iteration of 32 small maps stays cache-friendly.
func cleanupShardLocked(s *shard, now time.Time, idleTTL time.Duration) int {
	removed := 0
	for k, b := range s.buckets {
		if now.Sub(b.lastSeen) > idleTTL {
			delete(s.buckets, k)
			removed++
		}
	}
	return removed
}

// CleanupLoop runs CleanupIdle on a fixed cadence until ctx is cancelled.
// It is safe to call multiple times; each call creates its own goroutine
// and ticker. The loop exits promptly on context cancellation, which is
// how main.go achieves graceful shutdown.
func (rl *RateLimiter) CleanupLoop(ctx context.Context, interval time.Duration) {
	if interval <= 0 {
		interval = 10 * time.Minute
	}
	t := time.NewTicker(interval)
	defer t.Stop()

	// Run a sweep immediately so an idle process doesn't accumulate
	// stale buckets for `interval` seconds before the first cleanup.
	rl.CleanupIdle(rl.clock.Now())

	for {
		select {
		case <-ctx.Done():
			return
		case <-t.C:
			rl.CleanupIdle(rl.clock.Now())
		}
	}
}
