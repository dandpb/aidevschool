package config

import (
	"encoding/json"
	"errors"
	"testing"
)

func TestServicePutAndGet(t *testing.T) {
	s := NewService()

	value := json.RawMessage(`{"maxRetries":3}`)
	entry, err := s.Put("payments.retry_limit", value, "application/json", nil, "user:alice", "Initial config")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if entry.Key != "payments.retry_limit" {
		t.Errorf("expected key payments.retry_limit, got %s", entry.Key)
	}
	if entry.Version != 1 {
		t.Errorf("expected version 1, got %d", entry.Version)
	}

	retrieved, err := s.Get("payments.retry_limit")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if retrieved.Version != 1 {
		t.Errorf("expected version 1, got %d", retrieved.Version)
	}
}

func TestServiceVersioning(t *testing.T) {
	s := NewService()

	v1 := json.RawMessage(`{"maxRetries":3}`)
	s.Put("config", v1, "application/json", nil, "user:alice", "v1")

	v2 := json.RawMessage(`{"maxRetries":4}`)
	expectedVersion := 1
	entry, err := s.Put("config", v2, "application/json", &expectedVersion, "user:bob", "v2")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if entry.Version != 2 {
		t.Errorf("expected version 2, got %d", entry.Version)
	}

	retrieved, _ := s.Get("config")
	if len(retrieved.History) != 2 {
		t.Errorf("expected 2 versions in history, got %d", len(retrieved.History))
	}
}

func TestServiceVersionMismatch(t *testing.T) {
	s := NewService()

	v1 := json.RawMessage(`{"maxRetries":3}`)
	s.Put("config", v1, "application/json", nil, "user:alice", "v1")

	badVersion := 99
	_, err := s.Put("config", json.RawMessage(`{"maxRetries":4}`), "application/json", &badVersion, "user:bob", "v2")
	if !errors.Is(err, ErrVersionMismatch) {
		t.Errorf("expected ErrVersionMismatch, got %v", err)
	}
}

func TestServiceRollback(t *testing.T) {
	s := NewService()

	v1 := json.RawMessage(`{"maxRetries":3}`)
	s.Put("config", v1, "application/json", nil, "user:alice", "v1")

	v2 := json.RawMessage(`{"maxRetries":4}`)
	s.Put("config", v2, "application/json", nil, "user:bob", "v2")

	expectedVersion := 2
	entry, err := s.Rollback("config", 1, &expectedVersion, "user:charlie", "Rollback to v1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if entry.Version != 3 {
		t.Errorf("expected version 3, got %d", entry.Version)
	}

	retrieved, _ := s.Get("config")
	if string(retrieved.Value) != string(v1) {
		t.Errorf("expected value %s, got %s", string(v1), string(retrieved.Value))
	}
}

func TestServiceWatch(t *testing.T) {
	s := NewService()

	watcher := s.Watch("config")

	v1 := json.RawMessage(`{"maxRetries":3}`)
	s.Put("config", v1, "application/json", nil, "user:alice", "v1")

	select {
	case event := <-watcher.Channel:
		if event.Key != "config" {
			t.Errorf("expected key config, got %s", event.Key)
		}
		if event.ChangeType != "created" {
			t.Errorf("expected change type created, got %s", event.ChangeType)
		}
	default:
		t.Error("expected watch event")
	}

	s.Unwatch("config", watcher)
}

func TestServiceFeatureFlag(t *testing.T) {
	s := NewService()

	flag := FeatureFlag{
		Name:              "new-checkout",
		Enabled:           true,
		DefaultTreatment:  "off",
		Treatments:        []string{"on", "off"},
		TargetingRules:    []TargetingRule{},
		RolloutPercentage: 0,
		RolloutSeed:       "seed-1",
	}

	created, err := s.CreateFlag(flag)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if created.Version != 1 {
		t.Errorf("expected version 1, got %d", created.Version)
	}

	retrieved, err := s.GetFlag("new-checkout")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if retrieved.Name != "new-checkout" {
		t.Errorf("expected name new-checkout, got %s", retrieved.Name)
	}
}

func TestServiceEvaluateFlagDisabled(t *testing.T) {
	s := NewService()

	flag := FeatureFlag{
		Name:              "feature-x",
		Enabled:           false,
		DefaultTreatment:  "off",
		Treatments:        []string{"on", "off"},
		TargetingRules:    []TargetingRule{},
		RolloutPercentage: 0,
		RolloutSeed:       "seed-1",
	}
	s.CreateFlag(flag)

	result, err := s.EvaluateFlag("feature-x", Subject{ID: "user-123"}, "off")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Treatment != "off" {
		t.Errorf("expected treatment off, got %s", result.Treatment)
	}
	if result.Reason != "flag_disabled" {
		t.Errorf("expected reason flag_disabled, got %s", result.Reason)
	}
}

func TestServiceEvaluateFlagTargetingRule(t *testing.T) {
	s := NewService()

	flag := FeatureFlag{
		Name:             "feature-y",
		Enabled:          true,
		DefaultTreatment: "off",
		Treatments:       []string{"on", "off"},
		TargetingRules: []TargetingRule{
			{
				RuleID:    "rule-1",
				Priority:  1,
				Attribute: "role",
				Operator:  "equals",
				Values:    []string{"admin"},
				Treatment: "on",
				Enabled:   true,
			},
		},
		RolloutPercentage: 0,
		RolloutSeed:       "seed-1",
	}
	s.CreateFlag(flag)

	result, err := s.EvaluateFlag("feature-y", Subject{ID: "user-123", Role: "admin"}, "off")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Treatment != "on" {
		t.Errorf("expected treatment on, got %s", result.Treatment)
	}
	if result.Reason != "targeting_rule_match" {
		t.Errorf("expected reason targeting_rule_match, got %s", result.Reason)
	}
}

func TestServiceEvaluateFlagRollout(t *testing.T) {
	s := NewService()

	flag := FeatureFlag{
		Name:              "feature-z",
		Enabled:           true,
		DefaultTreatment:  "on",
		Treatments:        []string{"on", "off"},
		TargetingRules:    []TargetingRule{},
		RolloutPercentage: 100,
		RolloutSeed:       "seed-1",
	}
	s.CreateFlag(flag)

	result, err := s.EvaluateFlag("feature-z", Subject{ID: "user-123"}, "off")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Reason != "gradual_rollout" {
		t.Errorf("expected reason gradual_rollout, got %s", result.Reason)
	}
}

func TestServiceHealth(t *testing.T) {
	s := NewService()
	health := s.Health()
	if health["status"] != "ok" {
		t.Errorf("expected status ok, got %s", health["status"])
	}
}

func TestServiceMetrics(t *testing.T) {
	s := NewService()
	metrics := s.Metrics()
	if metrics["config_keys"] != 0 {
		t.Errorf("expected 0 config keys, got %d", metrics["config_keys"])
	}
}
