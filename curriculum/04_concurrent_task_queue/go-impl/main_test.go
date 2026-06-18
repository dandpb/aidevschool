package main

import (
	"os"
	"syscall"
	"testing"
	"time"
)

func TestLoadConfigFromEnv(t *testing.T) {
	t.Setenv("WORKER_COUNT", "7")
	t.Setenv("QUEUE_CAPACITY", "11")
	t.Setenv("MAX_RETRIES", "5")
	t.Setenv("BASE_BACKOFF_MS", "250")
	t.Setenv("JITTER_MS", "25")
	cfg := loadConfig()
	if cfg.WorkerCount != 7 || cfg.Capacity != 11 || cfg.MaxRetries != 5 || cfg.BaseBackoff.Milliseconds() != 250 || cfg.Jitter.Milliseconds() != 25 {
		t.Fatalf("unexpected config: %+v", cfg)
	}
}

func TestEnvFallback(t *testing.T) {
	_ = os.Unsetenv("MISSING_FOR_TEST")
	if env("MISSING_FOR_TEST", "fallback") != "fallback" {
		t.Fatalf("expected fallback")
	}
	t.Setenv("BAD_INT", "nope")
	if envInt("BAD_INT", 42) != 42 {
		t.Fatalf("expected bad int fallback")
	}
	t.Setenv("GOOD_INT", "12")
	if envInt("GOOD_INT", 42) != 12 {
		t.Fatalf("expected parsed int")
	}
}

func TestMainStartsAndStopsOnSignal(t *testing.T) {
	t.Setenv("PORT", "0")
	done := make(chan struct{})
	go func() {
		main()
		close(done)
	}()
	time.Sleep(25 * time.Millisecond)
	if err := syscall.Kill(os.Getpid(), syscall.SIGTERM); err != nil {
		t.Fatalf("signal process: %v", err)
	}
	select {
	case <-done:
	case <-time.After(2 * time.Second):
		t.Fatalf("main did not stop after SIGTERM")
	}
}
