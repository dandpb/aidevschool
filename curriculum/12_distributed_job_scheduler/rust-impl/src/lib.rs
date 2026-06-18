use serde::Serialize;
use std::collections::HashMap;
use std::time::Duration;

#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Priority {
    Low,
    Normal,
    High,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum JobStatus {
    Pending,
    Running,
    Completed,
    Failed,
    Cancelled,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum JobResult {
    Completed,
    Failed,
    Cancelled,
}

#[derive(Clone, Debug)]
pub struct JobRequest {
    pub name: String,
    pub interval: Option<String>,
    pub priority: Priority,
    pub dependencies: Vec<String>,
    pub max_attempts: u32,
    pub initial_backoff: Duration,
    pub run_after: Duration,
}

impl JobRequest {
    #[must_use]
    pub fn new(name: impl Into<String>) -> Self {
        Self {
            name: name.into(),
            interval: None,
            priority: Priority::Normal,
            dependencies: Vec::new(),
            max_attempts: 1,
            initial_backoff: Duration::from_secs(1),
            run_after: Duration::ZERO,
        }
    }

    #[must_use]
    pub fn interval(mut self, interval: impl Into<String>) -> Self {
        self.interval = Some(interval.into());
        self
    }

    #[must_use]
    pub fn priority(mut self, priority: Priority) -> Self {
        self.priority = priority;
        self
    }

    #[must_use]
    pub fn dependency(mut self, job_id: impl Into<String>) -> Self {
        self.dependencies.push(job_id.into());
        self
    }

    #[must_use]
    pub fn max_attempts(mut self, max_attempts: u32) -> Self {
        self.max_attempts = max_attempts;
        self
    }

    #[must_use]
    pub fn initial_backoff(mut self, backoff: Duration) -> Self {
        self.initial_backoff = backoff;
        self
    }

    #[must_use]
    pub fn run_after(mut self, run_after: Duration) -> Self {
        self.run_after = run_after;
        self
    }
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
pub struct Job {
    pub id: String,
    pub name: String,
    pub status: JobStatus,
    pub priority: Priority,
    pub dependencies: Vec<String>,
    #[serde(skip)]
    pub interval: Option<Duration>,
    #[serde(skip)]
    pub due_at: Duration,
    #[serde(skip)]
    pub created_at: Duration,
    pub attempt: u32,
    pub max_attempts: u32,
    #[serde(skip)]
    pub initial_backoff: Duration,
    pub last_error: Option<String>,
    pub cancel_reason: Option<String>,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
pub struct Lock {
    pub resource_id: String,
    pub owner_node_id: String,
    pub owner_worker_id: String,
    pub fencing_token: u64,
    #[serde(skip)]
    pub lease_expires_at: Duration,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
pub struct Health {
    pub node_id: String,
    pub leader_id: Option<String>,
    pub queue_depth: usize,
    pub running_jobs: usize,
    pub expired_locks: usize,
}

#[derive(Debug)]
pub struct Scheduler {
    node_id: String,
    now: Duration,
    jobs: HashMap<String, Job>,
    locks: LockManager,
    election: Election,
    sequence: u64,
}

impl Scheduler {
    #[must_use]
    pub fn new(node_id: impl Into<String>) -> Self {
        Self {
            node_id: node_id.into(),
            now: Duration::ZERO,
            jobs: HashMap::new(),
            locks: LockManager::new(),
            election: Election::new(Duration::from_secs(5)),
            sequence: 0,
        }
    }

    pub fn submit(&mut self, request: JobRequest) -> Result<Job, String> {
        if request.name.trim().is_empty() {
            return Err("job name is required".to_string());
        }
        let interval = request
            .interval
            .as_deref()
            .map(parse_duration)
            .transpose()?;
        for dependency in &request.dependencies {
            if !self.jobs.contains_key(dependency) {
                return Err(format!("dependency {dependency} does not exist"));
            }
        }
        self.sequence += 1;
        let max_attempts = request.max_attempts.max(1);
        let job = Job {
            id: format!("job-{sequence:06}", sequence = self.sequence),
            name: request.name,
            status: JobStatus::Pending,
            priority: request.priority,
            dependencies: request.dependencies,
            interval,
            due_at: self.now + request.run_after,
            created_at: self.now,
            attempt: 0,
            max_attempts,
            initial_backoff: request.initial_backoff.max(Duration::from_millis(1)),
            last_error: None,
            cancel_reason: None,
        };
        self.jobs.insert(job.id.clone(), job.clone());
        tracing::info!(job_id = job.id, priority = ?job.priority, "job_submitted");
        Ok(job)
    }

    pub fn become_leader<'a>(&mut self, peers: impl IntoIterator<Item = &'a str>, lease: Duration) {
        self.election.lease = lease;
        self.election.elect(peers);
    }

    pub fn dispatch_next(
        &mut self,
        worker_id: &str,
        lease: Duration,
    ) -> Result<(Job, Lock), String> {
        let mut candidates = self
            .jobs
            .values()
            .filter(|job| job.status == JobStatus::Pending && self.dependencies_completed(job))
            .cloned()
            .collect::<Vec<_>>();
        sort_jobs(&mut candidates);
        for candidate in candidates {
            if let Ok(dispatched) = self.dispatch_job(&candidate.id, worker_id, lease) {
                return Ok(dispatched);
            }
        }
        Err("no dispatchable job".to_string())
    }

    pub fn dispatch_job(
        &mut self,
        job_id: &str,
        worker_id: &str,
        lease: Duration,
    ) -> Result<(Job, Lock), String> {
        if !self.election.is_leader(&self.node_id) {
            return Err("not leader".to_string());
        }
        let job_for_dependency_check = self
            .jobs
            .get(job_id)
            .cloned()
            .ok_or_else(|| "job not found".to_string())?;
        if job_for_dependency_check.status != JobStatus::Pending {
            return Err(format!("job is {:?}", job_for_dependency_check.status));
        }
        if !self.dependencies_completed(&job_for_dependency_check) {
            return Err("dependencies not completed".to_string());
        }
        let lock = self
            .locks
            .acquire_at(job_id, &self.node_id, worker_id, lease, self.now)?;
        let job = self
            .jobs
            .get_mut(job_id)
            .ok_or_else(|| "job not found".to_string())?;
        job.status = JobStatus::Running;
        job.attempt += 1;
        tracing::info!(
            job_id = job.id,
            worker_id,
            fencing_token = lock.fencing_token,
            "job_dispatched"
        );
        Ok((job.clone(), lock))
    }

    pub fn complete(
        &mut self,
        job_id: &str,
        fencing_token: u64,
        result: JobResult,
        message: Option<String>,
    ) -> Result<(), String> {
        self.locks.validate_at(job_id, fencing_token, self.now)?;
        let job = self
            .jobs
            .get_mut(job_id)
            .ok_or_else(|| "job not found".to_string())?;
        match result {
            JobResult::Completed => job.status = JobStatus::Completed,
            JobResult::Cancelled => job.status = JobStatus::Cancelled,
            JobResult::Failed => {
                job.last_error = message;
                if job.attempt < job.max_attempts {
                    job.status = JobStatus::Pending;
                    job.due_at = self.now + retry_backoff(job.initial_backoff, job.attempt);
                } else {
                    job.status = JobStatus::Failed;
                }
            }
        }
        self.locks.release(job_id);
        tracing::info!(job_id, status = ?job.status, attempt = job.attempt, "job_completed");
        Ok(())
    }

    pub fn cancel(&mut self, job_id: &str, reason: &str) -> Result<(), String> {
        let job = self
            .jobs
            .get_mut(job_id)
            .ok_or_else(|| "job not found".to_string())?;
        if matches!(
            job.status,
            JobStatus::Completed | JobStatus::Failed | JobStatus::Cancelled
        ) {
            return Err(format!("terminal job state {:?}", job.status));
        }
        job.status = JobStatus::Cancelled;
        job.cancel_reason = Some(reason.to_string());
        self.locks.release(job_id);
        tracing::info!(job_id, reason, "job_cancelled");
        Ok(())
    }

    pub fn get_job(&self, job_id: &str) -> Option<Job> {
        self.jobs.get(job_id).cloned()
    }

    #[must_use]
    pub fn health(&self) -> Health {
        let queue_depth = self
            .jobs
            .values()
            .filter(|job| job.status == JobStatus::Pending && self.dependencies_completed(job))
            .count();
        let running_jobs = self
            .jobs
            .values()
            .filter(|job| job.status == JobStatus::Running)
            .count();
        Health {
            node_id: self.node_id.clone(),
            leader_id: self.election.leader_id.clone(),
            queue_depth,
            running_jobs,
            expired_locks: self.locks.expired_at(self.now),
        }
    }

    fn dependencies_completed(&self, job: &Job) -> bool {
        job.dependencies.iter().all(|parent_id| {
            self.jobs
                .get(parent_id)
                .is_some_and(|parent| parent.status == JobStatus::Completed)
        })
    }
}

#[derive(Debug)]
pub struct Election {
    lease: Duration,
    leader_id: Option<String>,
    lease_expires_at: Duration,
    now: Duration,
}

impl Election {
    #[must_use]
    pub fn new(lease: Duration) -> Self {
        Self {
            lease,
            leader_id: None,
            lease_expires_at: Duration::ZERO,
            now: Duration::ZERO,
        }
    }

    pub fn elect<'a>(&mut self, process_ids: impl IntoIterator<Item = &'a str>) -> Option<String> {
        let leader = process_ids.into_iter().max().map(str::to_string);
        self.leader_id = leader.clone();
        self.lease_expires_at = self.now + self.lease;
        leader
    }

    #[must_use]
    pub fn is_leader(&self, process_id: &str) -> bool {
        self.leader_id.as_deref() == Some(process_id) && self.now < self.lease_expires_at
    }

    pub fn advance(&mut self, elapsed: Duration) {
        self.now += elapsed;
    }
}

#[derive(Debug)]
pub struct LockManager {
    now: Duration,
    locks: HashMap<String, Lock>,
    tokens: HashMap<String, u64>,
}

impl LockManager {
    #[must_use]
    pub fn new() -> Self {
        Self {
            now: Duration::ZERO,
            locks: HashMap::new(),
            tokens: HashMap::new(),
        }
    }

    pub fn acquire(
        &mut self,
        resource_id: &str,
        owner_node_id: &str,
        owner_worker_id: &str,
        lease: Duration,
    ) -> Result<Lock, String> {
        self.acquire_at(resource_id, owner_node_id, owner_worker_id, lease, self.now)
    }

    pub fn validate(&self, resource_id: &str, fencing_token: u64) -> Result<(), String> {
        self.validate_at(resource_id, fencing_token, self.now)
    }

    pub fn advance(&mut self, elapsed: Duration) {
        self.now += elapsed;
    }

    fn acquire_at(
        &mut self,
        resource_id: &str,
        owner_node_id: &str,
        owner_worker_id: &str,
        lease: Duration,
        now: Duration,
    ) -> Result<Lock, String> {
        if let Some(current) = self.locks.get(resource_id) {
            if now < current.lease_expires_at {
                return Err(format!("resource {resource_id} is locked"));
            }
        }
        let token = self.tokens.entry(resource_id.to_string()).or_insert(0);
        *token += 1;
        let lock = Lock {
            resource_id: resource_id.to_string(),
            owner_node_id: owner_node_id.to_string(),
            owner_worker_id: owner_worker_id.to_string(),
            fencing_token: *token,
            lease_expires_at: now + lease,
        };
        self.locks.insert(resource_id.to_string(), lock.clone());
        Ok(lock)
    }

    fn validate_at(
        &self,
        resource_id: &str,
        fencing_token: u64,
        now: Duration,
    ) -> Result<(), String> {
        let lock = self
            .locks
            .get(resource_id)
            .ok_or_else(|| "lock not found".to_string())?;
        if now > lock.lease_expires_at {
            return Err("lock expired".to_string());
        }
        if fencing_token != lock.fencing_token {
            return Err("stale fencing token".to_string());
        }
        Ok(())
    }

    fn release(&mut self, resource_id: &str) {
        self.locks.remove(resource_id);
    }

    fn expired_at(&self, now: Duration) -> usize {
        self.locks
            .values()
            .filter(|lock| now > lock.lease_expires_at)
            .count()
    }
}

impl Default for LockManager {
    fn default() -> Self {
        Self::new()
    }
}

fn parse_duration(input: &str) -> Result<Duration, String> {
    if let Some(seconds) = input.strip_suffix('s') {
        return seconds
            .parse::<u64>()
            .ok()
            .filter(|value| *value > 0)
            .map(Duration::from_secs)
            .ok_or_else(|| format!("invalid interval {input}"));
    }
    if let Some(minutes) = input.strip_suffix('m') {
        return minutes
            .parse::<u64>()
            .ok()
            .filter(|value| *value > 0)
            .map(|value| Duration::from_secs(value * 60))
            .ok_or_else(|| format!("invalid interval {input}"));
    }
    Err(format!("invalid interval {input}"))
}

fn sort_jobs(jobs: &mut [Job]) {
    jobs.sort_by(|left, right| {
        priority_rank(right.priority)
            .cmp(&priority_rank(left.priority))
            .then_with(|| left.due_at.cmp(&right.due_at))
            .then_with(|| left.created_at.cmp(&right.created_at))
    });
}

fn priority_rank(priority: Priority) -> u8 {
    match priority {
        Priority::High => 3,
        Priority::Normal => 2,
        Priority::Low => 1,
    }
}

fn retry_backoff(initial: Duration, attempt: u32) -> Duration {
    if attempt <= 1 {
        return initial;
    }
    initial.saturating_mul(2_u32.saturating_pow(attempt - 1))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::Duration;

    #[test]
    fn submit_validates_interval_and_tracks_status() {
        let mut scheduler = Scheduler::new("node-a");
        let job = scheduler
            .submit(
                JobRequest::new("digest")
                    .interval("5s")
                    .priority(Priority::Normal),
            )
            .expect("valid job");
        let minute_job = scheduler
            .submit(JobRequest::new("minute").interval("1m"))
            .expect("minute interval");

        assert_eq!(job.status, JobStatus::Pending);
        assert_eq!(job.interval, Some(Duration::from_secs(5)));
        assert_eq!(minute_job.interval, Some(Duration::from_secs(60)));
        assert!(scheduler
            .submit(JobRequest::new("bad").interval("cron * * *"))
            .is_err());
        assert!(scheduler
            .submit(JobRequest::new("zero").interval("0s"))
            .is_err());
        assert!(scheduler
            .submit(JobRequest::new("missing-parent").dependency("missing"))
            .is_err());
    }

    #[test]
    fn leader_election_uses_highest_process_id_with_lease() {
        let mut election = Election::new(Duration::from_secs(2));
        assert_eq!(
            election.elect(["pid-2", "pid-9", "pid-3"]),
            Some("pid-9".to_string())
        );
        assert!(election.is_leader("pid-9"));
        election.advance(Duration::from_secs(3));
        assert!(!election.is_leader("pid-9"));
    }

    #[test]
    fn dispatch_orders_by_priority_due_time_and_creation() {
        let mut scheduler = Scheduler::new("node-a");
        scheduler.become_leader(["node-a"], Duration::from_secs(60));
        let low = scheduler
            .submit(JobRequest::new("low").priority(Priority::Low))
            .unwrap();
        let high_late = scheduler
            .submit(
                JobRequest::new("high-late")
                    .priority(Priority::High)
                    .run_after(Duration::from_secs(2)),
            )
            .unwrap();
        let high_early = scheduler
            .submit(JobRequest::new("high-early").priority(Priority::High))
            .unwrap();

        let first = scheduler
            .dispatch_next("worker-1", Duration::from_secs(1))
            .unwrap()
            .0;
        let second = scheduler
            .dispatch_next("worker-1", Duration::from_secs(1))
            .unwrap()
            .0;
        let third = scheduler
            .dispatch_next("worker-1", Duration::from_secs(1))
            .unwrap()
            .0;

        assert_eq!(
            [first.id, second.id, third.id],
            [high_early.id, high_late.id, low.id]
        );
    }

    #[test]
    fn distributed_lock_rejects_concurrent_and_stale_tokens() {
        let mut locks = LockManager::new();
        let lock = locks
            .acquire("job-1", "leader-a", "worker-a", Duration::from_secs(1))
            .unwrap();
        assert!(locks
            .acquire("job-1", "leader-b", "worker-b", Duration::from_secs(1))
            .is_err());
        assert!(locks.validate("job-1", lock.fencing_token - 1).is_err());
        locks.advance(Duration::from_secs(2));
        assert!(locks
            .acquire("job-1", "leader-b", "worker-b", Duration::from_secs(1))
            .is_ok());
    }

    #[test]
    fn rejects_stale_leadership_and_expired_lock_completion() {
        let mut scheduler = Scheduler::new("node-a");
        let job = scheduler
            .submit(JobRequest::new("lease-sensitive"))
            .unwrap();

        assert!(scheduler
            .dispatch_job(&job.id, "worker-1", Duration::from_secs(1))
            .is_err());

        scheduler.become_leader(["node-a"], Duration::from_secs(60));
        let (_, lock) = scheduler
            .dispatch_job(&job.id, "worker-1", Duration::from_secs(0))
            .unwrap();
        assert!(scheduler
            .complete(&job.id, lock.fencing_token, JobResult::Completed, None)
            .is_ok());

        let mut locks = LockManager::default();
        let lock = locks
            .acquire("job-2", "leader-a", "worker-a", Duration::from_secs(1))
            .unwrap();
        locks.advance(Duration::from_secs(2));
        assert!(locks.validate("job-2", lock.fencing_token).is_err());
    }

    #[test]
    fn dag_dependencies_retry_backoff_and_cancellation() {
        let mut scheduler = Scheduler::new("node-a");
        scheduler.become_leader(["node-a"], Duration::from_secs(60));
        let parent = scheduler
            .submit(JobRequest::new("parent").max_attempts(1))
            .unwrap();
        let child = scheduler
            .submit(
                JobRequest::new("child")
                    .priority(Priority::High)
                    .dependency(parent.id.clone())
                    .max_attempts(1),
            )
            .unwrap();

        let (job, lock) = scheduler
            .dispatch_next("worker-1", Duration::from_secs(1))
            .unwrap();
        assert_eq!(job.id, parent.id);
        scheduler
            .complete(&parent.id, lock.fencing_token, JobResult::Completed, None)
            .unwrap();
        let (job, _) = scheduler
            .dispatch_next("worker-1", Duration::from_secs(1))
            .unwrap();
        assert_eq!(job.id, child.id);

        let retry = scheduler
            .submit(
                JobRequest::new("retry")
                    .max_attempts(3)
                    .initial_backoff(Duration::from_secs(1)),
            )
            .unwrap();
        let (_, retry_lock) = scheduler
            .dispatch_job(&retry.id, "worker-2", Duration::from_secs(1))
            .unwrap();
        scheduler
            .complete(
                &retry.id,
                retry_lock.fencing_token,
                JobResult::Failed,
                Some("temporary".to_string()),
            )
            .unwrap();
        let retry_status = scheduler.get_job(&retry.id).unwrap();
        assert_eq!(retry_status.status, JobStatus::Pending);
        assert_eq!(retry_status.due_at, Duration::from_secs(1));

        let permanent_failure = scheduler
            .submit(JobRequest::new("fail").max_attempts(1))
            .unwrap();
        let (_, failure_lock) = scheduler
            .dispatch_job(&permanent_failure.id, "worker-3", Duration::from_secs(1))
            .unwrap();
        scheduler
            .complete(
                &permanent_failure.id,
                failure_lock.fencing_token,
                JobResult::Failed,
                Some("permanent".to_string()),
            )
            .unwrap();
        assert_eq!(
            scheduler.get_job(&permanent_failure.id).unwrap().status,
            JobStatus::Failed
        );

        let worker_cancel = scheduler.submit(JobRequest::new("worker-cancel")).unwrap();
        let (_, worker_cancel_lock) = scheduler
            .dispatch_job(&worker_cancel.id, "worker-4", Duration::from_secs(1))
            .unwrap();
        scheduler
            .complete(
                &worker_cancel.id,
                worker_cancel_lock.fencing_token,
                JobResult::Cancelled,
                None,
            )
            .unwrap();
        assert_eq!(
            scheduler.get_job(&worker_cancel.id).unwrap().status,
            JobStatus::Cancelled
        );

        let cancel = scheduler.submit(JobRequest::new("cancel-me")).unwrap();
        scheduler.cancel(&cancel.id, "client request").unwrap();
        assert_eq!(
            scheduler.get_job(&cancel.id).unwrap().status,
            JobStatus::Cancelled
        );
        assert!(scheduler.cancel(&cancel.id, "again").is_err());
        assert!(scheduler.get_job("missing").is_none());
    }

    #[test]
    fn health_reports_leader_queues_and_running_jobs() {
        let mut scheduler = Scheduler::new("node-a");
        scheduler.become_leader(["node-a"], Duration::from_secs(60));
        scheduler.submit(JobRequest::new("queued")).unwrap();
        scheduler
            .dispatch_next("worker-1", Duration::from_secs(1))
            .unwrap();
        let health = scheduler.health();
        assert_eq!(health.node_id, "node-a");
        assert_eq!(health.leader_id, Some("node-a".to_string()));
        assert_eq!(health.running_jobs, 1);
    }
}
