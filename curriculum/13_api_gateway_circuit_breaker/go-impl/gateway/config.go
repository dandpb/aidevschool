package gateway

import (
	"context"
	"time"
)

type Config struct {
	Port   string
	Routes []RouteConfig
}

type RouteConfig struct {
	ID                   string
	PathPrefix           string
	UpstreamURL          string
	TenantHeader         string
	TimeoutMS            int
	Retry                RetryPolicy
	CircuitBreaker       CircuitBreakerPolicy
	Fallback             *FallbackPolicy
	Bulkhead             BulkheadPolicy
	TenantLimit          TenantLimitPolicy
	Coalescing           CoalescingPolicy
	AdaptiveConcurrency  AdaptiveConcurrencyPolicy
}

type RetryPolicy struct {
	MaxAttempts       int
	BaseDelayMS       int
	MaxDelayMS        int
	Jitter            string // "none", "equal", "full"
	RetryableMethods  []string
	RetryableStatuses []int
}

type CircuitBreakerPolicy struct {
	WindowMS                 int64
	MinimumRequests          int64
	FailureRateThreshold     float64
	OpenCooldownMS           int64
	HalfOpenMaxProbes        int
	HalfOpenSuccessesToClose int
}

type FallbackPolicy struct {
	Status  int
	Body    map[string]any
	Headers map[string]string
}

type BulkheadPolicy struct {
	MaxConcurrency int
	MaxQueue       int
}

type TenantLimitPolicy struct {
	Capacity        int
	RefillPerSecond float64
}

type CoalescingPolicy struct {
	Enabled     bool
	TTLMS       int
	Methods     []string
	VaryHeaders []string
}

type AdaptiveConcurrencyPolicy struct {
	Enabled            bool
	MinLimit           int
	MaxLimit           int
	TargetP95LatencyMS int
}

func DefaultConfig() *Config {
	return &Config{
		Port: "8080",
		Routes: []RouteConfig{
			{
				ID:           "orders",
				PathPrefix:   "/api/orders",
				UpstreamURL:  "http://127.0.0.1:9001",
				TenantHeader: "X-Tenant-ID",
				TimeoutMS:    250,
				Retry: RetryPolicy{
					MaxAttempts:       3,
					BaseDelayMS:       10,
					MaxDelayMS:        100,
					Jitter:            "full",
					RetryableMethods:  []string{"GET", "HEAD", "PUT", "DELETE"},
					RetryableStatuses: []int{502, 503, 504},
				},
				CircuitBreaker: CircuitBreakerPolicy{
					WindowMS:                 10000,
					MinimumRequests:          20,
					FailureRateThreshold:     0.5,
					OpenCooldownMS:           5000,
					HalfOpenMaxProbes:        3,
					HalfOpenSuccessesToClose: 3,
				},
				Fallback: &FallbackPolicy{
					Status: 503,
					Body:   map[string]any{"error": "orders temporarily unavailable"},
				},
				Bulkhead:    BulkheadPolicy{MaxConcurrency: 64, MaxQueue: 0},
				TenantLimit: TenantLimitPolicy{Capacity: 120, RefillPerSecond: 20},
				Coalescing: CoalescingPolicy{
					Enabled:     true,
					TTLMS:       100,
					Methods:     []string{"GET", "HEAD"},
					VaryHeaders: []string{"Accept", "Authorization"},
				},
				AdaptiveConcurrency: AdaptiveConcurrencyPolicy{
					Enabled:            true,
					MinLimit:           8,
					MaxLimit:           128,
					TargetP95LatencyMS: 75,
				},
			},
		},
	}
}

func NewShutdownContext(timeout time.Duration) (context.Context, context.CancelFunc) {
	return context.WithTimeout(context.Background(), timeout)
}
