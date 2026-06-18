package scheduler

import (
	"context"
	"testing"
	"time"
)

func TestSubmitValidatesIntervalAndTracksStatus(t *testing.T) {
	s := NewScheduler("node-a", Clock{Now: time.Now})

	job, err := s.Submit(context.Background(), JobRequest{
		Name:        "email-digest",
		Payload:     map[string]string{"tenant": "school"},
		Interval:    "5s",
		Priority:    PriorityNormal,
		MaxAttempts: 2,
	})
	if err != nil {
		t.Fatalf("submit valid job: %v", err)
	}
	if job.Status != StatusPending {
		t.Fatalf("status = %s, want %s", job.Status, StatusPending)
	}
	if job.Interval != 5*time.Second {
		t.Fatalf("interval = %s, want 5s", job.Interval)
	}

	if _, err := s.Submit(context.Background(), JobRequest{Name: "bad", Interval: "cron * * *", Priority: PriorityLow}); err == nil {
		t.Fatal("expected invalid interval error")
	}
}

func TestLeaderElectionUsesHighestProcessIDWithLease(t *testing.T) {
	now := time.Date(2026, 6, 17, 12, 0, 0, 0, time.UTC)
	clock := Clock{Now: func() time.Time { return now }}
	e := NewElection(clock, 2*time.Second)

	if leader := e.Elect([]string{"pid-2", "pid-9", "pid-3"}); leader != "pid-9" {
		t.Fatalf("leader = %s, want pid-9", leader)
	}
	if !e.IsLeader("pid-9") {
		t.Fatal("pid-9 should hold leader lease")
	}
	now = now.Add(3 * time.Second)
	if e.IsLeader("pid-9") {
		t.Fatal("expired leader lease should not be active")
	}
}

func TestDispatchOrdersByPriorityDueTimeAndCreation(t *testing.T) {
	now := fixedTime()
	s := NewScheduler("node-a", Clock{Now: func() time.Time { return now }})
	s.BecomeLeader([]string{"node-a"}, time.Minute)

	low, _ := s.Submit(context.Background(), JobRequest{Name: "low", Priority: PriorityLow})
	highLate, _ := s.Submit(context.Background(), JobRequest{Name: "high-late", Priority: PriorityHigh, RunAfter: 2 * time.Second})
	highEarly, _ := s.Submit(context.Background(), JobRequest{Name: "high-early", Priority: PriorityHigh})

	got := []string{}
	for range 3 {
		job, _, err := s.DispatchNext(context.Background(), "worker-1", time.Second)
		if err != nil {
			t.Fatalf("dispatch: %v", err)
		}
		got = append(got, job.ID)
	}
	want := []string{highEarly.ID, highLate.ID, low.ID}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("dispatch order = %v, want %v", got, want)
		}
	}
}

func TestDistributedLockRejectsConcurrentAndStaleTokens(t *testing.T) {
	now := fixedTime()
	lm := NewLockManager(Clock{Now: func() time.Time { return now }})

	lock, err := lm.Acquire("job-1", "leader-a", "worker-a", time.Second)
	if err != nil {
		t.Fatalf("acquire: %v", err)
	}
	if _, err := lm.Acquire("job-1", "leader-b", "worker-b", time.Second); err == nil {
		t.Fatal("expected active lease conflict")
	}
	if err := lm.Validate("job-1", lock.FencingToken-1); err == nil {
		t.Fatal("expected stale fencing token rejection")
	}
	now = now.Add(2 * time.Second)
	if _, err := lm.Acquire("job-1", "leader-b", "worker-b", time.Second); err != nil {
		t.Fatalf("expired lease should be recoverable: %v", err)
	}
}

func TestDAGDependenciesRetryBackoffAndCancellation(t *testing.T) {
	now := fixedTime()
	s := NewScheduler("node-a", Clock{Now: func() time.Time { return now }})
	s.BecomeLeader([]string{"node-a"}, time.Minute)

	parent, _ := s.Submit(context.Background(), JobRequest{Name: "parent", Priority: PriorityNormal, MaxAttempts: 1})
	child, _ := s.Submit(context.Background(), JobRequest{Name: "child", Priority: PriorityHigh, Dependencies: []string{parent.ID}, MaxAttempts: 1})

	job, lock, err := s.DispatchNext(context.Background(), "worker-1", time.Second)
	if err != nil {
		t.Fatalf("dispatch parent: %v", err)
	}
	if job.ID != parent.ID {
		t.Fatalf("dispatched %s, want parent %s", job.ID, parent.ID)
	}
	if err := s.Complete(context.Background(), parent.ID, lock.FencingToken, ResultCompleted, ""); err != nil {
		t.Fatalf("complete parent: %v", err)
	}
	job, _, err = s.DispatchNext(context.Background(), "worker-1", time.Second)
	if err != nil {
		t.Fatalf("dispatch child after parent completed: %v", err)
	}
	if job.ID != child.ID {
		t.Fatalf("dispatched %s, want child %s", job.ID, child.ID)
	}

	retrying, _ := s.Submit(context.Background(), JobRequest{Name: "retry", Priority: PriorityNormal, MaxAttempts: 3, InitialBackoff: time.Second})
	lockJob, retryLock, err := s.DispatchJob(context.Background(), retrying.ID, "worker-2", time.Second)
	if err != nil || lockJob.ID != retrying.ID {
		t.Fatalf("dispatch retry job: %v", err)
	}
	if err := s.Complete(context.Background(), retrying.ID, retryLock.FencingToken, ResultFailed, "temporary"); err != nil {
		t.Fatalf("complete failed retry: %v", err)
	}
	status, _ := s.GetJob(retrying.ID)
	if status.Status != StatusPending || !status.DueAt.Equal(now.Add(time.Second)) {
		t.Fatalf("retry status/due = %s/%s, want pending/%s", status.Status, status.DueAt, now.Add(time.Second))
	}

	toCancel, _ := s.Submit(context.Background(), JobRequest{Name: "cancel-me", Priority: PriorityNormal})
	if err := s.Cancel(context.Background(), toCancel.ID, "client request"); err != nil {
		t.Fatalf("cancel: %v", err)
	}
	cancelled, _ := s.GetJob(toCancel.ID)
	if cancelled.Status != StatusCancelled {
		t.Fatalf("cancelled status = %s, want %s", cancelled.Status, StatusCancelled)
	}
}

func TestHealthReportsLeaderQueuesAndRunningJobs(t *testing.T) {
	s := NewScheduler("node-a", Clock{Now: fixedTime})
	s.BecomeLeader([]string{"node-a"}, time.Minute)
	_, _ = s.Submit(context.Background(), JobRequest{Name: "queued", Priority: PriorityNormal})
	_, _, _ = s.DispatchNext(context.Background(), "worker-1", time.Second)

	health := s.Health()
	if health.NodeID != "node-a" || health.LeaderID != "node-a" || health.RunningJobs != 1 {
		t.Fatalf("unexpected health: %+v", health)
	}
}

func fixedTime() time.Time {
	return time.Date(2026, 6, 17, 12, 0, 0, 0, time.UTC)
}
