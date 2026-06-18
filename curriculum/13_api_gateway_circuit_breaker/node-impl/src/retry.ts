export interface RetryPolicy {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  retryableMethods: string[];
  retryableStatuses: number[];
}

export function shouldRetry(policy: RetryPolicy, attempt: number, statusCode: number, err: unknown): boolean {
  if (attempt >= policy.maxAttempts) return false;
  if (statusCode === 0 && err) return true;
  return policy.retryableStatuses.includes(statusCode);
}

export function retryDelay(policy: RetryPolicy, attempt: number): number {
  const backoff = policy.baseDelayMs * Math.pow(2, attempt - 1);
  const clamped = Math.min(backoff, policy.maxDelayMs);
  const jitter = Math.random() * clamped;
  return clamped + jitter;
}

export async function doWithRetry<T>(
  policy: RetryPolicy,
  method: string,
  fn: () => Promise<T>,
  getStatus: (result: T) => number,
  _isError: (err: unknown) => boolean
): Promise<T> {
  if (!policy.retryableMethods.includes(method)) {
    return fn();
  }

  let lastResult: T | undefined;
  let lastErr: unknown;

  for (let attempt = 1; attempt <= policy.maxAttempts; attempt++) {
    try {
      const result = await fn();
      lastResult = result;
      const status = getStatus(result);
      if (!shouldRetry(policy, attempt, status, null)) {
        return result;
      }
    } catch (err) {
      lastErr = err;
      if (!shouldRetry(policy, attempt, 0, err)) {
        throw err;
      }
    }

    if (attempt < policy.maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, retryDelay(policy, attempt)));
    }
  }

  if (lastResult !== undefined) {
    return lastResult;
  }
  throw lastErr;
}
