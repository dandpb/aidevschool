package taskqueue

import (
	"context"
	"errors"
	"time"
)

type Status string

const (
	StatusScheduled    Status = "scheduled"
	StatusQueued       Status = "queued"
	StatusRunning      Status = "running"
	StatusSucceeded    Status = "succeeded"
	StatusFailed       Status = "failed"
	StatusCancelling   Status = "cancelling"
	StatusCancelled    Status = "cancelled"
	StatusDeadLettered Status = "dead_lettered"
)

var (
	ErrQueueFull        = errors.New("queue_full")
	ErrShuttingDown     = errors.New("shutting_down")
	ErrNotFound         = errors.New("task_not_found")
	ErrTerminalTask     = errors.New("task_terminal")
	ErrInvalidPayload   = errors.New("invalid_payload")
	ErrPoison           = errors.New("poison_message")
	ErrInvalidWorkerCnt = errors.New("invalid_worker_count")
)

type Config struct {
	WorkerCount     int
	Capacity        int
	MaxRetries      int
	BaseBackoff     time.Duration
	Jitter          time.Duration
	ShutdownTimeout time.Duration
}

type EnqueueRequest struct {
	Payload        map[string]any `json:"payload"`
	Priority       int            `json:"priority"`
	IdempotencyKey string         `json:"idempotency_key"`
	ScheduledFor   *time.Time     `json:"scheduled_for"`
	MaxRetries     *int           `json:"max_retries"`
	TimeoutMS      *int           `json:"timeout_ms"`
}

type Task struct {
	ID             string         `json:"id"`
	Payload        map[string]any `json:"payload"`
	Status         Status         `json:"status"`
	Retries        int            `json:"retries"`
	MaxRetries     int            `json:"max_retries"`
	Priority       int            `json:"priority"`
	IdempotencyKey string         `json:"idempotency_key,omitempty"`
	ScheduledFor   *time.Time     `json:"scheduled_for,omitempty"`
	NextAttemptAt  *time.Time     `json:"next_attempt_at,omitempty"`
	TimeoutMS      int            `json:"timeout_ms,omitempty"`
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
	StartedAt      *time.Time     `json:"started_at,omitempty"`
	CompletedAt    *time.Time     `json:"completed_at,omitempty"`
	CancelledAt    *time.Time     `json:"cancelled_at,omitempty"`
	LastError      string         `json:"last_error,omitempty"`
	DeadLetter     bool           `json:"dead_letter"`
}

type QueueStats struct {
	QueueDepth      int    `json:"queue_depth"`
	ScheduledCount  int    `json:"scheduled_count"`
	RunningCount    int    `json:"running_count"`
	CompletedCount  int    `json:"completed_count"`
	FailedCount     int    `json:"failed_count"`
	CancelledCount  int    `json:"cancelled_count"`
	DeadLetterCount int    `json:"dead_letter_count"`
	WorkerCount     int    `json:"worker_count"`
	BusyWorkerCount int    `json:"busy_worker_count"`
	Backpressure    string `json:"backpressure"`
}

type Handler interface {
	ProcessTask(ctx context.Context, task Task) error
}
