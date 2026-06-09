//! `Clock` abstraction so the rate limiter can be tested without sleeping.
//!
//! In production we use [`SystemClock`] which delegates to [`std::time::Instant::now`];
//! in tests we use [`MockClock`] so the test can advance time deterministically and
//! verify lazy-refill math without `tokio::time::sleep`.

use std::sync::Mutex;
use std::time::Instant;

/// A monotonic clock. Mocked in tests; in production we use the system clock.
pub trait Clock: Send + Sync + std::fmt::Debug {
    /// Returns the current monotonic instant.
    fn now(&self) -> Instant;
}

/// Real wall-clock backed by [`std::time::Instant`].
#[derive(Debug, Clone, Copy, Default)]
pub struct SystemClock;

impl Clock for SystemClock {
    fn now(&self) -> Instant {
        Instant::now()
    }
}

/// A clock that the test can drive forward by hand.
///
/// Cheap to clone (shared `Mutex<Instant>`), so multiple components can share
/// the same time source during a test.
#[derive(Debug)]
pub struct MockClock {
    now: Mutex<Instant>,
}

impl MockClock {
    /// Build a mock clock that starts at `start`.
    pub fn new(start: Instant) -> Self {
        Self {
            now: Mutex::new(start),
        }
    }

    /// Move the clock forward by `by`. Panics if the internal mutex is poisoned
    /// — a poisoning here would only happen if a previous holder panicked
    /// mid-update, which is a bug.
    pub fn advance(&self, by: std::time::Duration) {
        let mut g = self.now.lock().expect("MockClock mutex poisoned");
        *g += by;
    }

    /// Replace the clock's current time with `instant`.
    pub fn set(&self, instant: Instant) {
        *self.now.lock().expect("MockClock mutex poisoned") = instant;
    }

    /// Read the clock's current time (test introspection helper).
    #[allow(dead_code)]
    pub fn peek(&self) -> Instant {
        *self.now.lock().expect("MockClock mutex poisoned")
    }
}

impl Clock for MockClock {
    fn now(&self) -> Instant {
        *self.now.lock().expect("MockClock mutex poisoned")
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::Duration;

    #[test]
    fn system_clock_advances() {
        let c = SystemClock;
        let t0 = c.now();
        std::thread::sleep(Duration::from_millis(2));
        let t1 = c.now();
        assert!(t1 > t0);
    }

    #[test]
    fn mock_clock_advance_and_set() {
        let start = Instant::now();
        let c = MockClock::new(start);
        assert_eq!(c.now(), start);
        c.advance(Duration::from_secs(5));
        assert_eq!(c.now(), start + Duration::from_secs(5));
        let new_t = start + Duration::from_secs(100);
        c.set(new_t);
        assert_eq!(c.now(), new_t);
    }
}
