package gateway

import (
	"math"
	"math/rand"
	"net/http"
	"slices"
	"time"
)

func ShouldRetry(policy RetryPolicy, attempt int, statusCode int, err error) bool {
	if attempt >= policy.MaxAttempts {
		return false
	}
	if statusCode == 0 && err != nil {
		return true
	}
	return slices.Contains(policy.RetryableStatuses, statusCode)
}

func RetryDelay(policy RetryPolicy, attempt int) time.Duration {
	backoff := float64(policy.BaseDelayMS) * math.Pow(2, float64(attempt-1))
	if backoff > float64(policy.MaxDelayMS) {
		backoff = float64(policy.MaxDelayMS)
	}
	var jitter float64
	switch policy.Jitter {
	case "equal":
		jitter = backoff / 2 * (rand.Float64()*2 - 1) // equal jitter: backoff/2 ± backoff/2
		backoff = backoff/2 + jitter
	case "full":
		jitter = rand.Float64() * backoff
		backoff = jitter
	default:
		// no jitter
	}
	delay := time.Duration(backoff) * time.Millisecond
	return delay
}

func IsRetryableMethod(policy RetryPolicy, method string) bool {
	return slices.Contains(policy.RetryableMethods, method)
}

func DoWithRetry(policy RetryPolicy, method string, do func() (*http.Response, error)) (*http.Response, error) {
	// Non-idempotent methods: only retry if idempotency key is present
	// (FR-011: Non-idempotent requests without idempotency key are not retried)
	if !IsRetryableMethod(policy, method) {
		return do()
	}

	var lastResp *http.Response
	var lastErr error

	for attempt := 1; attempt <= policy.MaxAttempts; attempt++ {
		resp, err := do()
		lastResp = resp
		lastErr = err

		statusCode := 0
		if resp != nil {
			statusCode = resp.StatusCode
		}

		if !ShouldRetry(policy, attempt, statusCode, err) {
			return resp, err
		}

		if attempt < policy.MaxAttempts {
			delay := RetryDelay(policy, attempt)
			time.Sleep(delay)
		}
	}

	if lastResp != nil {
		return lastResp, lastErr
	}
	return nil, lastErr
}