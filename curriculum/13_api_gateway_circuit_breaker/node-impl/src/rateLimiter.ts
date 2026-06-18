interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

export class TenantLimiter {
  private buckets = new Map<string, TokenBucket>();

  constructor(private capacity: number, private refillPerSecond: number) {}

  allow(tenantId: string): boolean {
    const now = Date.now();
    let bucket = this.buckets.get(tenantId);
    if (!bucket) {
      bucket = { tokens: this.capacity, lastRefill: now };
      this.buckets.set(tenantId, bucket);
    }

    const elapsed = (now - bucket.lastRefill) / 1000;
    bucket.tokens = Math.min(this.capacity, bucket.tokens + elapsed * this.refillPerSecond);
    bucket.lastRefill = now;

    if (bucket.tokens >= 1) {
      bucket.tokens--;
      return true;
    }
    return false;
  }

  tokensRemaining(tenantId: string): number {
    const now = Date.now();
    const bucket = this.buckets.get(tenantId);
    if (!bucket) return this.capacity;

    const elapsed = (now - bucket.lastRefill) / 1000;
    return Math.min(this.capacity, bucket.tokens + elapsed * this.refillPerSecond);
  }

  resetAt(tenantId: string): Date {
    const tokens = this.tokensRemaining(tenantId);
    const needed = this.capacity - tokens;
    const seconds = needed / this.refillPerSecond;
    return new Date(Date.now() + seconds * 1000);
  }
}
