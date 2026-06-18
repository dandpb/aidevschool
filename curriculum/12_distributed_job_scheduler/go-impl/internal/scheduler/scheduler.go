package scheduler

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"sort"
	"strings"
	"sync"
	"time"
)

type Clock struct {
	Now func() time.Time
}

func (c Clock) now() time.Time {
	if c.Now == nil {
		return time.Now().UTC()
	}
	return c.Now().UTC()
}

type Priority string

const (
	PriorityHigh   Priority = "high"
	PriorityNormal Priority = "normal"
	PriorityLow    Priority = "low"
)

type Status string

const (
	StatusPending   Status = "pending"
	StatusRunning   Status = "running"
	StatusCompleted Status = "completed"
	StatusFailed    Status = "failed"
	StatusCancelled Status = "cancelled"
)

type Result string

const (
	ResultCompleted Result = "completed"
	ResultFailed    Result = "failed"
	ResultCancelled Result = "cancelled"
)

type JobRequest struct {
	Name           string
	Payload        map[string]string
	Interval       string
	Priority       Priority
	Dependencies   []string
	MaxAttempts    int
	InitialBackoff time.Duration
	RunAfter       time.Duration
}

type Job struct {
	ID             string            `json:"id"`
	Name           string            `json:"name"`
	Payload        map[string]string `json:"payload,omitempty"`
	Status         Status            `json:"status"`
	Priority       Priority          `json:"priority"`
	Dependencies   []string          `json:"dependencies"`
	Interval       time.Duration     `json:"interval"`
	DueAt          time.Time         `json:"due_at"`
	CreatedAt      time.Time         `json:"created_at"`
	UpdatedAt      time.Time         `json:"updated_at"`
	Attempt        int               `json:"attempt"`
	MaxAttempts    int               `json:"max_attempts"`
	InitialBackoff time.Duration     `json:"initial_backoff"`
	LastError      string            `json:"last_error,omitempty"`
	CancelReason   string            `json:"cancel_reason,omitempty"`
}

type Lock struct {
	ResourceID     string    `json:"resource_id"`
	OwnerNodeID    string    `json:"owner_node_id"`
	OwnerWorkerID  string    `json:"owner_worker_id"`
	FencingToken   int64     `json:"fencing_token"`
	LeaseExpiresAt time.Time `json:"lease_expires_at"`
}

type Health struct {
	NodeID       string `json:"node_id"`
	LeaderID     string `json:"leader_id"`
	QueueDepth   int    `json:"queue_depth"`
	RunningJobs  int    `json:"running_jobs"`
	ExpiredLocks int    `json:"expired_locks"`
}

type Scheduler struct {
	mu       sync.Mutex
	nodeID   string
	clock    Clock
	jobs     map[string]Job
	locks    *LockManager
	election *Election
	seq      int
}

func NewScheduler(nodeID string, clock Clock) *Scheduler {
	return &Scheduler{
		nodeID:   nodeID,
		clock:    clock,
		jobs:     map[string]Job{},
		locks:    NewLockManager(clock),
		election: NewElection(clock, 5*time.Second),
	}
}

func (s *Scheduler) Submit(_ context.Context, req JobRequest) (Job, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if strings.TrimSpace(req.Name) == "" {
		return Job{}, errors.New("job name is required")
	}
	interval := time.Duration(0)
	if req.Interval != "" {
		parsed, err := time.ParseDuration(req.Interval)
		if err != nil || parsed <= 0 {
			return Job{}, fmt.Errorf("invalid interval %q", req.Interval)
		}
		interval = parsed
	}
	priority := req.Priority
	if priority == "" {
		priority = PriorityNormal
	}
	if priorityRank(priority) == 0 {
		return Job{}, fmt.Errorf("invalid priority %q", priority)
	}
	for _, parentID := range req.Dependencies {
		_, ok := s.jobs[parentID]
		if !ok {
			return Job{}, fmt.Errorf("dependency %s does not exist", parentID)
		}
		if parentID == "" {
			return Job{}, errors.New("empty dependency id")
		}
	}
	now := s.clock.now()
	s.seq++
	maxAttempts := req.MaxAttempts
	if maxAttempts <= 0 {
		maxAttempts = 1
	}
	backoff := req.InitialBackoff
	if backoff <= 0 {
		backoff = time.Second
	}
	job := Job{
		ID:             fmt.Sprintf("job-%06d", s.seq),
		Name:           req.Name,
		Payload:        req.Payload,
		Status:         StatusPending,
		Priority:       priority,
		Dependencies:   append([]string(nil), req.Dependencies...),
		Interval:       interval,
		DueAt:          now.Add(req.RunAfter),
		CreatedAt:      now,
		UpdatedAt:      now,
		MaxAttempts:    maxAttempts,
		InitialBackoff: backoff,
	}
	s.jobs[job.ID] = job
	slog.Info("job_submitted", "job_id", job.ID, "priority", job.Priority, "dependencies", len(job.Dependencies))
	return job, nil
}

func (s *Scheduler) BecomeLeader(peers []string, lease time.Duration) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.election.lease = lease
	s.election.Elect(peers)
}

func (s *Scheduler) DispatchNext(ctx context.Context, workerID string, lease time.Duration) (Job, Lock, error) {
	s.mu.Lock()
	candidates := make([]Job, 0, len(s.jobs))
	for _, job := range s.jobs {
		if job.Status == StatusPending && s.dependenciesCompletedLocked(job) {
			candidates = append(candidates, job)
		}
	}
	s.mu.Unlock()

	sortJobs(candidates)
	for _, job := range candidates {
		dispatched, lock, err := s.DispatchJob(ctx, job.ID, workerID, lease)
		if err == nil {
			return dispatched, lock, nil
		}
	}
	return Job{}, Lock{}, errors.New("no dispatchable job")
}

func (s *Scheduler) DispatchJob(_ context.Context, jobID string, workerID string, lease time.Duration) (Job, Lock, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if !s.election.IsLeader(s.nodeID) {
		return Job{}, Lock{}, errors.New("not leader")
	}
	job, ok := s.jobs[jobID]
	if !ok {
		return Job{}, Lock{}, errors.New("job not found")
	}
	if job.Status != StatusPending {
		return Job{}, Lock{}, fmt.Errorf("job is %s", job.Status)
	}
	if !s.dependenciesCompletedLocked(job) {
		return Job{}, Lock{}, errors.New("dependencies not completed")
	}
	lock, err := s.locks.acquireLocked(jobID, s.nodeID, workerID, lease)
	if err != nil {
		return Job{}, Lock{}, err
	}
	job.Status = StatusRunning
	job.Attempt++
	job.UpdatedAt = s.clock.now()
	s.jobs[jobID] = job
	slog.Info("job_dispatched", "job_id", job.ID, "worker_id", workerID, "fencing_token", lock.FencingToken)
	return job, lock, nil
}

func (s *Scheduler) Complete(_ context.Context, jobID string, token int64, result Result, message string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if err := s.locks.validateLocked(jobID, token); err != nil {
		return err
	}
	job, ok := s.jobs[jobID]
	if !ok {
		return errors.New("job not found")
	}
	now := s.clock.now()
	switch result {
	case ResultCompleted:
		job.Status = StatusCompleted
	case ResultCancelled:
		job.Status = StatusCancelled
	case ResultFailed:
		job.LastError = message
		if job.Attempt < job.MaxAttempts {
			job.Status = StatusPending
			job.DueAt = now.Add(backoff(job.InitialBackoff, job.Attempt))
		} else {
			job.Status = StatusFailed
		}
	default:
		return fmt.Errorf("unknown result %q", result)
	}
	job.UpdatedAt = now
	s.jobs[jobID] = job
	s.locks.releaseLocked(jobID)
	slog.Info("job_completed", "job_id", job.ID, "status", job.Status, "attempt", job.Attempt)
	return nil
}

func (s *Scheduler) Cancel(_ context.Context, jobID string, reason string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	job, ok := s.jobs[jobID]
	if !ok {
		return errors.New("job not found")
	}
	if job.Status == StatusCompleted || job.Status == StatusFailed || job.Status == StatusCancelled {
		return fmt.Errorf("terminal job state %s", job.Status)
	}
	job.Status = StatusCancelled
	job.CancelReason = reason
	job.UpdatedAt = s.clock.now()
	s.jobs[jobID] = job
	s.locks.releaseLocked(jobID)
	slog.Info("job_cancelled", "job_id", job.ID, "reason", reason)
	return nil
}

func (s *Scheduler) GetJob(jobID string) (Job, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	job, ok := s.jobs[jobID]
	return job, ok
}

func (s *Scheduler) Health() Health {
	s.mu.Lock()
	defer s.mu.Unlock()
	health := Health{NodeID: s.nodeID, LeaderID: s.election.leaderID, ExpiredLocks: s.locks.expiredLocked()}
	for _, job := range s.jobs {
		switch job.Status {
		case StatusPending:
			if s.dependenciesCompletedLocked(job) {
				health.QueueDepth++
			}
		case StatusRunning:
			health.RunningJobs++
		}
	}
	return health
}

func (s *Scheduler) dependenciesCompletedLocked(job Job) bool {
	for _, parentID := range job.Dependencies {
		parent := s.jobs[parentID]
		if parent.Status != StatusCompleted {
			return false
		}
	}
	return true
}

type Election struct {
	clock       Clock
	lease       time.Duration
	leaderID    string
	leaseExpiry time.Time
}

func NewElection(clock Clock, lease time.Duration) *Election {
	return &Election{clock: clock, lease: lease}
}

func (e *Election) Elect(processIDs []string) string {
	if len(processIDs) == 0 {
		e.leaderID = ""
		return ""
	}
	leader := processIDs[0]
	for _, id := range processIDs[1:] {
		if id > leader {
			leader = id
		}
	}
	e.leaderID = leader
	e.leaseExpiry = e.clock.now().Add(e.lease)
	return leader
}

func (e *Election) IsLeader(processID string) bool {
	return e.leaderID == processID && e.clock.now().Before(e.leaseExpiry)
}

type LockManager struct {
	mu     sync.Mutex
	clock  Clock
	locks  map[string]Lock
	tokens map[string]int64
}

func NewLockManager(clock Clock) *LockManager {
	return &LockManager{clock: clock, locks: map[string]Lock{}, tokens: map[string]int64{}}
}

func (l *LockManager) Acquire(resourceID string, ownerNodeID string, ownerWorkerID string, lease time.Duration) (Lock, error) {
	l.mu.Lock()
	defer l.mu.Unlock()
	return l.acquireLocked(resourceID, ownerNodeID, ownerWorkerID, lease)
}

func (l *LockManager) Validate(resourceID string, token int64) error {
	l.mu.Lock()
	defer l.mu.Unlock()
	return l.validateLocked(resourceID, token)
}

func (l *LockManager) acquireLocked(resourceID string, ownerNodeID string, ownerWorkerID string, lease time.Duration) (Lock, error) {
	now := l.clock.now()
	if current, ok := l.locks[resourceID]; ok && now.Before(current.LeaseExpiresAt) {
		return Lock{}, fmt.Errorf("resource %s is locked", resourceID)
	}
	l.tokens[resourceID]++
	lock := Lock{ResourceID: resourceID, OwnerNodeID: ownerNodeID, OwnerWorkerID: ownerWorkerID, FencingToken: l.tokens[resourceID], LeaseExpiresAt: now.Add(lease)}
	l.locks[resourceID] = lock
	return lock, nil
}

func (l *LockManager) validateLocked(resourceID string, token int64) error {
	lock, ok := l.locks[resourceID]
	if !ok {
		return errors.New("lock not found")
	}
	if l.clock.now().After(lock.LeaseExpiresAt) {
		return errors.New("lock expired")
	}
	if token != lock.FencingToken {
		return errors.New("stale fencing token")
	}
	return nil
}

func (l *LockManager) releaseLocked(resourceID string) {
	delete(l.locks, resourceID)
}

func (l *LockManager) expiredLocked() int {
	now := l.clock.now()
	count := 0
	for _, lock := range l.locks {
		if now.After(lock.LeaseExpiresAt) {
			count++
		}
	}
	return count
}

func sortJobs(jobs []Job) {
	sort.SliceStable(jobs, func(i, j int) bool {
		left := jobs[i]
		right := jobs[j]
		if priorityRank(left.Priority) != priorityRank(right.Priority) {
			return priorityRank(left.Priority) > priorityRank(right.Priority)
		}
		if !left.DueAt.Equal(right.DueAt) {
			return left.DueAt.Before(right.DueAt)
		}
		return left.CreatedAt.Before(right.CreatedAt)
	})
}

func priorityRank(priority Priority) int {
	switch priority {
	case PriorityHigh:
		return 3
	case PriorityNormal:
		return 2
	case PriorityLow:
		return 1
	default:
		return 0
	}
}

func backoff(initial time.Duration, attempt int) time.Duration {
	if attempt <= 1 {
		return initial
	}
	return initial << (attempt - 1)
}
