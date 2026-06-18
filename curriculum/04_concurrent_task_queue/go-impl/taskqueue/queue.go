package taskqueue

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"log/slog"
	"math"
	mathrand "math/rand"
	"sort"
	"sync"
	"time"

	"golang.org/x/sync/errgroup"
)

type HandlerFunc func(context.Context, Task) error

func (f HandlerFunc) ProcessTask(ctx context.Context, task Task) error { return f(ctx, task) }

type Option func(*Queue)

func WithClock(clock Clock) Option          { return func(q *Queue) { q.clock = clock } }
func WithLogger(logger *slog.Logger) Option { return func(q *Queue) { q.logger = logger } }

type Queue struct {
	mu        sync.Mutex
	cond      *sync.Cond
	clock     Clock
	logger    *slog.Logger
	config    Config
	handler   Handler
	tasks     map[string]*Task
	idem      map[string]string
	queue     []*queuedItem
	dlq       []Task
	running   int
	started   bool
	shutdown  bool
	workerCtx context.Context
	cancel    context.CancelFunc
	group     *errgroup.Group
	seq       int64
}

type queuedItem struct {
	id       string
	priority int
	due      time.Time
	seq      int64
}

func New(config Config, handler Handler, opts ...Option) *Queue {
	if config.Capacity <= 0 {
		config.Capacity = 100
	}
	if config.BaseBackoff <= 0 {
		config.BaseBackoff = 100 * time.Millisecond
	}
	if config.ShutdownTimeout <= 0 {
		config.ShutdownTimeout = 5 * time.Second
	}
	ctx, cancel := context.WithCancel(context.Background())
	q := &Queue{clock: RealClock{}, logger: slog.Default(), config: config, handler: handler, tasks: map[string]*Task{}, idem: map[string]string{}, workerCtx: ctx, cancel: cancel}
	q.cond = sync.NewCond(&q.mu)
	for _, opt := range opts {
		opt(q)
	}
	return q
}

func (q *Queue) Start() error {
	q.mu.Lock()
	if q.started {
		q.mu.Unlock()
		return nil
	}
	q.started = true
	workerCount := q.config.WorkerCount
	q.mu.Unlock()
	if workerCount < 0 {
		return ErrInvalidWorkerCnt
	}
	g, ctx := errgroup.WithContext(q.workerCtx)
	q.group = g
	for i := 0; i < workerCount; i++ {
		workerID := i
		g.Go(func() error { q.workerLoop(ctx, workerID); return nil })
	}
	return nil
}

func (q *Queue) Enqueue(ctx context.Context, req EnqueueRequest) (Task, error) {
	if req.Payload == nil {
		return Task{}, ErrInvalidPayload
	}
	q.mu.Lock()
	defer q.mu.Unlock()
	if q.shutdown {
		return Task{}, ErrShuttingDown
	}
	if req.IdempotencyKey != "" {
		if id, ok := q.idem[req.IdempotencyKey]; ok {
			return cloneTask(q.tasks[id]), nil
		}
	}
	if q.activeCountLocked() >= q.config.Capacity {
		return Task{}, ErrQueueFull
	}
	now := q.clock.Now()
	maxRetries := q.config.MaxRetries
	if req.MaxRetries != nil {
		maxRetries = *req.MaxRetries
	}
	status := StatusQueued
	if req.ScheduledFor != nil && req.ScheduledFor.After(now) {
		status = StatusScheduled
	}
	task := &Task{ID: newID(), Payload: req.Payload, Status: status, MaxRetries: maxRetries, Priority: req.Priority, IdempotencyKey: req.IdempotencyKey, ScheduledFor: req.ScheduledFor, CreatedAt: now, UpdatedAt: now}
	if req.TimeoutMS != nil {
		task.TimeoutMS = *req.TimeoutMS
	}
	q.tasks[task.ID] = task
	if task.IdempotencyKey != "" {
		q.idem[task.IdempotencyKey] = task.ID
	}
	due := now
	if task.ScheduledFor != nil {
		due = *task.ScheduledFor
	}
	q.pushLocked(task.ID, task.Priority, due)
	q.logTransition("", task.Status, task, "enqueue")
	q.cond.Broadcast()
	return cloneTask(task), nil
}

func (q *Queue) Get(id string) (Task, error) {
	q.mu.Lock()
	defer q.mu.Unlock()
	t, ok := q.tasks[id]
	if !ok {
		return Task{}, ErrNotFound
	}
	return cloneTask(t), nil
}

func (q *Queue) Cancel(id string) (Task, error) {
	q.mu.Lock()
	defer q.mu.Unlock()
	t, ok := q.tasks[id]
	if !ok {
		return Task{}, ErrNotFound
	}
	now := q.clock.Now()
	switch t.Status {
	case StatusQueued, StatusScheduled:
		prev := t.Status
		t.Status = StatusCancelled
		t.CancelledAt = &now
		t.UpdatedAt = now
		q.logTransition(prev, t.Status, t, "cancel")
	case StatusRunning:
		prev := t.Status
		t.Status = StatusCancelling
		t.UpdatedAt = now
		q.logTransition(prev, t.Status, t, "cancel")
	default:
		return Task{}, ErrTerminalTask
	}
	q.cond.Broadcast()
	return cloneTask(t), nil
}

func (q *Queue) Stats() QueueStats {
	q.mu.Lock()
	defer q.mu.Unlock()
	s := QueueStats{WorkerCount: q.config.WorkerCount, BusyWorkerCount: q.running}
	for _, t := range q.tasks {
		switch t.Status {
		case StatusQueued:
			s.QueueDepth++
		case StatusScheduled:
			s.ScheduledCount++
		case StatusRunning, StatusCancelling:
			s.RunningCount++
		case StatusSucceeded:
			s.CompletedCount++
		case StatusFailed:
			s.FailedCount++
		case StatusCancelled:
			s.CancelledCount++
		case StatusDeadLettered:
			s.DeadLetterCount++
			s.FailedCount++
		}
	}
	s.Backpressure = q.backpressureLocked()
	return s
}

func (q *Queue) DeadLetters() []Task {
	q.mu.Lock()
	defer q.mu.Unlock()
	out := make([]Task, len(q.dlq))
	copy(out, q.dlq)
	return out
}

func (q *Queue) Shutdown(ctx context.Context) error {
	q.mu.Lock()
	q.shutdown = true
	q.cond.Broadcast()
	q.mu.Unlock()
	done := make(chan error, 1)
	go func() {
		if q.group != nil {
			done <- q.group.Wait()
		} else {
			done <- nil
		}
	}()
	select {
	case err := <-done:
		q.cancel()
		return err
	case <-ctx.Done():
		q.cancel()
		return ctx.Err()
	case <-time.After(q.config.ShutdownTimeout):
		q.cancel()
		return context.DeadlineExceeded
	}
}

func (q *Queue) DequeueForTest(now time.Time) (Task, bool) {
	q.mu.Lock()
	defer q.mu.Unlock()
	return q.dequeueLocked(now)
}

func (q *Queue) workerLoop(ctx context.Context, workerID int) {
	for {
		q.mu.Lock()
		for {
			if (ctx.Err() != nil || q.shutdown) && q.noRunnableLocked() {
				q.mu.Unlock()
				return
			}
			if task, ok := q.dequeueLocked(q.clock.Now()); ok {
				q.running++
				q.mu.Unlock()
				q.runTask(ctx, workerID, task)
				break
			}
			q.mu.Unlock()
			select {
			case <-ctx.Done():
			case <-time.After(5 * time.Millisecond):
			}
			q.mu.Lock()
		}
	}
}

func (q *Queue) runTask(parent context.Context, workerID int, task Task) {
	ctx := parent
	var cancel context.CancelFunc
	if task.TimeoutMS > 0 {
		ctx, cancel = context.WithTimeout(parent, time.Duration(task.TimeoutMS)*time.Millisecond)
		defer cancel()
	}
	err := error(nil)
	if q.handler != nil {
		err = q.handler.ProcessTask(ctx, task)
	}
	q.finish(workerID, task.ID, err)
}

func (q *Queue) finish(workerID int, id string, err error) {
	q.mu.Lock()
	defer q.mu.Unlock()
	q.running--
	t := q.tasks[id]
	if t == nil {
		q.cond.Broadcast()
		return
	}
	now := q.clock.Now()
	if t.Status == StatusCancelling || errors.Is(err, context.Canceled) {
		prev := t.Status
		t.Status = StatusCancelled
		t.CancelledAt = &now
		t.UpdatedAt = now
		q.logTransition(prev, t.Status, t, "worker_cancelled")
		q.cond.Broadcast()
		return
	}
	if err == nil {
		prev := t.Status
		t.Status = StatusSucceeded
		t.CompletedAt = &now
		t.UpdatedAt = now
		q.logTransition(prev, t.Status, t, "worker_succeeded")
		q.cond.Broadcast()
		return
	}
	t.LastError = err.Error()
	if errors.Is(err, ErrPoison) || t.Retries >= t.MaxRetries {
		prev := t.Status
		t.Status = StatusDeadLettered
		t.DeadLetter = true
		t.CompletedAt = &now
		t.UpdatedAt = now
		q.dlq = append(q.dlq, cloneTask(t))
		q.logTransition(prev, t.Status, t, "worker_failed")
		q.cond.Broadcast()
		return
	}
	t.Retries++
	backoff := q.backoff(t.Retries)
	next := now.Add(backoff)
	prev := t.Status
	t.Status = StatusScheduled
	t.NextAttemptAt = &next
	t.UpdatedAt = now
	q.pushLocked(t.ID, t.Priority, next)
	q.logTransition(prev, t.Status, t, "retry_scheduled")
	q.cond.Broadcast()
	_ = workerID
}

func (q *Queue) dequeueLocked(now time.Time) (Task, bool) {
	q.sortLocked()
	for len(q.queue) > 0 {
		item := q.queue[0]
		if item.due.After(now) {
			return Task{}, false
		}
		q.queue = q.queue[1:]
		t := q.tasks[item.id]
		if t == nil || t.Status == StatusCancelled {
			continue
		}
		if t.Status != StatusQueued && t.Status != StatusScheduled {
			continue
		}
		due := item.due
		if t.NextAttemptAt != nil {
			due = *t.NextAttemptAt
		} else if t.ScheduledFor != nil {
			due = *t.ScheduledFor
		}
		if due.After(now) {
			q.pushLocked(t.ID, t.Priority, due)
			return Task{}, false
		}
		prev := t.Status
		t.Status = StatusRunning
		t.StartedAt = &now
		t.UpdatedAt = now
		q.logTransition(prev, t.Status, t, "dequeue")
		return cloneTask(t), true
	}
	return Task{}, false
}

func (q *Queue) pushLocked(id string, priority int, due time.Time) {
	q.seq++
	q.queue = append(q.queue, &queuedItem{id: id, priority: priority, due: due, seq: q.seq})
}
func (q *Queue) sortLocked() {
	sort.SliceStable(q.queue, func(i, j int) bool {
		if !q.queue[i].due.Equal(q.queue[j].due) {
			return q.queue[i].due.Before(q.queue[j].due)
		}
		if q.queue[i].priority != q.queue[j].priority {
			return q.queue[i].priority > q.queue[j].priority
		}
		return q.queue[i].seq < q.queue[j].seq
	})
}
func (q *Queue) noRunnableLocked() bool {
	for _, t := range q.tasks {
		if t.Status == StatusQueued || t.Status == StatusScheduled || t.Status == StatusRunning || t.Status == StatusCancelling {
			return false
		}
	}
	return true
}
func (q *Queue) activeCountLocked() int {
	n := 0
	for _, t := range q.tasks {
		if t.Status == StatusQueued || t.Status == StatusScheduled || t.Status == StatusRunning || t.Status == StatusCancelling {
			n++
		}
	}
	return n
}
func (q *Queue) backpressureLocked() string {
	if q.shutdown {
		return "shutting_down"
	}
	active := q.activeCountLocked()
	if active >= q.config.Capacity {
		return "full"
	}
	if active*100 >= q.config.Capacity*80 {
		return "limited"
	}
	return "open"
}
func (q *Queue) backoff(retry int) time.Duration {
	base := float64(q.config.BaseBackoff) * math.Pow(2, float64(retry-1))
	jitter := time.Duration(0)
	if q.config.Jitter > 0 {
		jitter = time.Duration(mathrand.Int63n(int64(q.config.Jitter)))
	}
	return time.Duration(base) + jitter
}
func (q *Queue) logTransition(prev Status, next Status, task *Task, reason string) {
	q.logger.Info("task_transition", "task_id", task.ID, "previous_status", prev, "next_status", next, "retries", task.Retries, "reason", reason)
}

func cloneTask(t *Task) Task {
	if t == nil {
		return Task{}
	}
	cp := *t
	if t.Payload != nil {
		cp.Payload = map[string]any{}
		for k, v := range t.Payload {
			cp.Payload[k] = v
		}
	}
	return cp
}
func newID() string {
	var b [16]byte
	if _, err := rand.Read(b[:]); err == nil {
		return hex.EncodeToString(b[:])
	}
	return time.Now().Format("20060102150405.000000000")
}
