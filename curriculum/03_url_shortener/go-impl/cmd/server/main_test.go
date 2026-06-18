package main

import (
	"context"
	"io"
	"testing"
	"time"
)

func TestListenAddrUsesDefaultAndPortEnv(t *testing.T) {
	t.Setenv("PORT", "9090")
	if got := listenAddr(); got != ":9090" {
		t.Fatalf("listenAddr() = %q", got)
	}
	t.Setenv("PORT", "")
	if got := listenAddr(); got != ":8080" {
		t.Fatalf("listenAddr() default = %q", got)
	}
}

func TestRunStopsWhenContextIsCanceled(t *testing.T) {
	t.Setenv("PORT", "0")
	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan error, 1)
	go func() { done <- run(ctx, io.Discard) }()
	time.Sleep(20 * time.Millisecond)
	cancel()
	select {
	case err := <-done:
		if err != nil {
			t.Fatalf("run returned %v", err)
		}
	case <-time.After(time.Second):
		t.Fatal("run did not stop after context cancel")
	}
}

func TestExitCodeReturnsZeroAfterContextCancel(t *testing.T) {
	t.Setenv("PORT", "0")
	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan int, 1)
	go func() { done <- exitCode(ctx, io.Discard) }()
	time.Sleep(20 * time.Millisecond)
	cancel()
	select {
	case code := <-done:
		if code != 0 {
			t.Fatalf("exitCode = %d", code)
		}
	case <-time.After(time.Second):
		t.Fatal("exitCode did not stop")
	}
}

func TestExitCodeReturnsOneWhenListenFails(t *testing.T) {
	t.Setenv("PORT", "notaport")
	if code := exitCode(context.Background(), io.Discard); code != 1 {
		t.Fatalf("exitCode = %d, want 1", code)
	}
}
