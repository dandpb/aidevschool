export interface CircuitBreakerPolicy {
  windowMs: number;
  minimumRequests: number;
  failureRateThreshold: number;
  openCooldownMs: number;
  halfOpenMaxProbes: number;
  halfOpenSuccessesToClose: number;
}

export interface CircuitSnapshot {
  state: string;
  failureCount: number;
  successCount: number;
  openedAt: Date | null;
  halfOpenProbeInFlight: number;
}

interface WindowEntry {
  success: boolean;
  timestamp: number;
}

export class CircuitBreaker {
  private state: 'closed' | 'open' | 'half_open' = 'closed';
  private window: WindowEntry[] = [];
  private openedAt: number | null = null;
  private halfOpenSuccesses = 0;
  private halfOpenInFlight = 0;

  constructor(private policy: CircuitBreakerPolicy) {}

  allow(): boolean {
    this.cleanWindow();
    switch (this.state) {
      case 'closed':
        return true;
      case 'open':
        if (this.openedAt && Date.now() - this.openedAt >= this.policy.openCooldownMs) {
          this.state = 'half_open';
          this.halfOpenSuccesses = 0;
          this.halfOpenInFlight = 1;
          return true;
        }
        return false;
      case 'half_open':
        if (this.halfOpenInFlight < this.policy.halfOpenMaxProbes) {
          this.halfOpenInFlight++;
          return true;
        }
        return false;
    }
  }

  recordSuccess(): void {
    this.window.push({ success: true, timestamp: Date.now() });
    this.cleanWindow();
    if (this.state === 'half_open') {
      this.halfOpenSuccesses++;
      this.halfOpenInFlight--;
      if (this.halfOpenSuccesses >= this.policy.halfOpenSuccessesToClose) {
        this.state = 'closed';
        this.halfOpenSuccesses = 0;
        this.halfOpenInFlight = 0;
        this.openedAt = null;
      }
    }
  }

  recordFailure(): void {
    this.window.push({ success: false, timestamp: Date.now() });
    this.cleanWindow();
    if (this.state === 'half_open') {
      this.halfOpenInFlight--;
      this.state = 'open';
      this.openedAt = Date.now();
      return;
    }
    const total = this.window.length;
    const failures = this.window.filter((e) => !e.success).length;
    if (total >= this.policy.minimumRequests && failures / total >= this.policy.failureRateThreshold) {
      this.state = 'open';
      this.openedAt = Date.now();
    }
  }

  snapshot(): CircuitSnapshot {
    const failures = this.window.filter((e) => !e.success).length;
    const successes = this.window.filter((e) => e.success).length;
    return {
      state: this.state,
      failureCount: failures,
      successCount: successes,
      openedAt: this.openedAt ? new Date(this.openedAt) : null,
      halfOpenProbeInFlight: this.halfOpenInFlight,
    };
  }

  private cleanWindow(): void {
    const cutoff = Date.now() - this.policy.windowMs;
    this.window = this.window.filter((e) => e.timestamp >= cutoff);
  }
}
