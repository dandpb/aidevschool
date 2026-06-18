package taskqueue

import (
	"context"
	"errors"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

func TestEnqueueDequeuePriorityFIFOAndIdempotency(t *testing.T) {
	clock := NewManualClock(time.Unix(100, 0))
	q := New(Config{WorkerCount: 0, Capacity: 10, MaxRetries: 1, BaseBackoff: time.Second, Jitter: 0}, nil, WithClock(clock))

	low, err := q.Enqueue(context.Background(), EnqueueRequest{Payload: map[string]any{"name": "low"}, Priority: 0, IdempotencyKey: "same"})
	if err != nil {
		t.Fatalf("enqueue low: %v", err)
	}
	dup, err := q.Enqueue(context.Background(), EnqueueRequest{Payload: map[string]any{"name": "duplicate"}, Priority: 9, IdempotencyKey: "same"})
	if err != nil {
		t.Fatalf("enqueue duplicate: %v", err)
	}
	if dup.ID != low.ID {
		t.Fatalf("expected duplicate idempotency key to return %s, got %s", low.ID, dup.ID)
	}

	firstHigh, _ := q.Enqueue(context.Background(), EnqueueRequest{Payload: map[string]any{"name": "first-high"}, Priority: 2})
	secondHigh, _ := q.Enqueue(context.Background(), EnqueueRequest{Payload: map[string]any{"name": "second-high"}, Priority: 2})

	ids := []string{}
	for i := 0; i < 3; i++ {
		task, ok := q.DequeueForTest(clock.Now())
		if !ok {
			t.Fatalf("expected task %d", i)
		}
		ids = append(ids, task.ID)
	}
	got := []string{ids[0], ids[1], ids[2]}
	want := []string{firstHigh.ID, secondHigh.ID, low.ID}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("dispatch order mismatch: got %v want %v", got, want)
		}
	}
}

func TestWorkerPoolRetriesBackoffDeadLetterAndStats(t *testing.T) {
	clock := NewManualClock(time.Unix(200, 0))
	attempts := atomic.Int32{}
	q := New(Config{WorkerCount: 1, Capacity: 5, MaxRetries: 2, BaseBackoff: time.Second, Jitter: 0}, HandlerFunc(func(ctx context.Context, task Task) error {
		attempts.Add(1)
		return errors.New("transient")
	}), WithClock(clock))
	q.Start()
	t.Cleanup(func() { _ = q.Shutdown(context.Background()) })

	task, err := q.Enqueue(context.Background(), EnqueueRequest{Payload: map[string]any{"kind": "retry"}})
	if err != nil {
		t.Fatalf("enqueue: %v", err)
	}
	waitUntil(t, func() bool { got, _ := q.Get(task.ID); return got.Retries == 1 && got.Status == StatusScheduled })
	clock.Advance(1100 * time.Millisecond)
	waitUntil(t, func() bool { got, _ := q.Get(task.ID); return got.Retries == 2 && got.Status == StatusScheduled })
	clock.Advance(2100 * time.Millisecond)
	waitUntil(t, func() bool { got, _ := q.Get(task.ID); return got.Status == StatusDeadLettered })

	got, _ := q.Get(task.ID)
	if got.Retries != 2 || got.LastError == "" {
		t.Fatalf("expected exhausted retries with last error, got %+v", got)
	}
	stats := q.Stats()
	if stats.DeadLetterCount != 1 || stats.FailedCount != 1 {
		t.Fatalf("bad stats after DLQ: %+v", stats)
	}
	if len(q.DeadLetters()) != 1 {
		t.Fatalf("expected one dead-letter task")
	}
}

func TestCapacityCancellationSchedulingAndShutdown(t *testing.T) {
	clock := NewManualClock(time.Unix(300, 0))
	q := New(Config{WorkerCount: 0, Capacity: 2, MaxRetries: 0, BaseBackoff: time.Second, Jitter: 0}, nil, WithClock(clock))

	scheduledFor := clock.Now().Add(time.Hour)
	scheduled, err := q.Enqueue(context.Background(), EnqueueRequest{Payload: map[string]any{"kind": "scheduled"}, ScheduledFor: &scheduledFor})
	if err != nil {
		t.Fatalf("scheduled enqueue: %v", err)
	}
	queued, err := q.Enqueue(context.Background(), EnqueueRequest{Payload: map[string]any{"kind": "queued"}})
	if err != nil {
		t.Fatalf("queued enqueue: %v", err)
	}
	if _, err := q.Enqueue(context.Background(), EnqueueRequest{Payload: map[string]any{"kind": "overflow"}}); !errors.Is(err, ErrQueueFull) {
		t.Fatalf("expected ErrQueueFull, got %v", err)
	}

	cancelled, err := q.Cancel(queued.ID)
	if err != nil {
		t.Fatalf("cancel queued: %v", err)
	}
	if cancelled.Status != StatusCancelled {
		t.Fatalf("expected cancelled, got %s", cancelled.Status)
	}
	if _, ok := q.DequeueForTest(clock.Now()); ok {
		t.Fatalf("cancelled/future task must not dequeue")
	}
	clock.Advance(time.Hour + time.Second)
	ready, ok := q.DequeueForTest(clock.Now())
	if !ok || ready.ID != scheduled.ID {
		t.Fatalf("expected scheduled task after clock advance")
	}

	if err := q.Shutdown(context.Background()); err != nil {
		t.Fatalf("shutdown: %v", err)
	}
	if _, err := q.Enqueue(context.Background(), EnqueueRequest{Payload: map[string]any{"kind": "late"}}); !errors.Is(err, ErrShuttingDown) {
		t.Fatalf("expected shutdown rejection, got %v", err)
	}
}

func TestConcurrentWorkersRespectLimitAndGracefulDrain(t *testing.T) {
	clock := NewManualClock(time.Unix(400, 0))
	started := make(chan struct{}, 4)
	release := make(chan struct{})
	running := atomic.Int32{}
	maxRunning := atomic.Int32{}
	q := New(Config{WorkerCount: 2, Capacity: 10, MaxRetries: 0, BaseBackoff: time.Millisecond, Jitter: 0}, HandlerFunc(func(ctx context.Context, task Task) error {
		cur := running.Add(1)
		for {
			old := maxRunning.Load()
			if cur <= old || maxRunning.CompareAndSwap(old, cur) {
				break
			}
		}
		started <- struct{}{}
		select {
		case <-release:
		case <-ctx.Done():
			return ctx.Err()
		}
		running.Add(-1)
		return nil
	}), WithClock(clock))
	q.Start()

	for i := 0; i < 4; i++ {
		_, _ = q.Enqueue(context.Background(), EnqueueRequest{Payload: map[string]any{"n": i}})
	}
	<-started
	<-started
	if maxRunning.Load() > 2 {
		t.Fatalf("worker limit exceeded: %d", maxRunning.Load())
	}
	stats := q.Stats()
	if stats.RunningCount != 2 || stats.BusyWorkerCount != 2 {
		t.Fatalf("expected two busy workers: %+v", stats)
	}

	close(release)
	if err := q.Shutdown(context.Background()); err != nil {
		t.Fatalf("shutdown drain: %v", err)
	}
	if q.Stats().CompletedCount != 4 {
		t.Fatalf("expected drain completed tasks, got %+v", q.Stats())
	}
}

func waitUntil(t *testing.T, fn func() bool) {
	t.Helper()
	deadline := time.Now().Add(2 * time.Second)
	for time.Now().Before(deadline) {
		if fn() {
			return
		}
		time.Sleep(5 * time.Millisecond)
	}
	t.Fatalf("condition not met before deadline")
}

var _ sync.Locker
