package config

import (
	"crypto/sha256"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"sync"
	"time"
)

var (
	ErrKeyNotFound      = errors.New("key not found")
	ErrVersionMismatch  = errors.New("version mismatch")
	ErrInvalidKey       = errors.New("invalid key")
	ErrInvalidValue     = errors.New("invalid value")
	ErrVersionNotFound  = errors.New("version not found")
	ErrFlagNotFound     = errors.New("flag not found")
	ErrInvalidSubject   = errors.New("invalid subject")
)

type ConfigEntry struct {
	Key         string    `json:"key"`
	Value       json.RawMessage `json:"value"`
	ContentType string    `json:"contentType"`
	Version     int       `json:"version"`
	LogIndex    int       `json:"logIndex"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
	CreatedBy   string    `json:"createdBy"`
	UpdatedBy   string    `json:"updatedBy"`
	History     []Version `json:"history,omitempty"`
}

type Version struct {
	Key             string          `json:"key"`
	Version         int             `json:"version"`
	LogIndex        int             `json:"logIndex"`
	Value           json.RawMessage `json:"value,omitempty"`
	ContentType     string          `json:"contentType"`
	Author          string          `json:"author"`
	Reason          string          `json:"reason"`
	ChangeType      string          `json:"changeType"`
	PreviousVersion *int            `json:"previousVersion,omitempty"`
	CommittedAt     time.Time       `json:"committedAt"`
}

type FeatureFlag struct {
	Name              string          `json:"name"`
	Description       string          `json:"description,omitempty"`
	Enabled           bool            `json:"enabled"`
	DefaultTreatment  string          `json:"defaultTreatment"`
	Treatments        []string        `json:"treatments"`
	TargetingRules    []TargetingRule `json:"targetingRules"`
	RolloutPercentage float64         `json:"rolloutPercentage"`
	RolloutSeed       string          `json:"rolloutSeed"`
	Version           int             `json:"version"`
	LogIndex          int             `json:"logIndex"`
	CreatedAt         time.Time       `json:"createdAt"`
	UpdatedAt         time.Time       `json:"updatedAt"`
}

type TargetingRule struct {
	RuleID    string      `json:"ruleId"`
	Priority  int         `json:"priority"`
	Attribute string      `json:"attribute"`
	Operator  string      `json:"operator"`
	Values    []string    `json:"values"`
	Treatment string      `json:"treatment"`
	Enabled   bool        `json:"enabled"`
}

type Subject struct {
	ID         string                 `json:"id"`
	Tenant     string                 `json:"tenant,omitempty"`
	Region     string                 `json:"region,omitempty"`
	Role       string                 `json:"role,omitempty"`
	Attributes map[string]interface{} `json:"attributes,omitempty"`
}

type EvaluationResult struct {
	Flag          string  `json:"flag"`
	Enabled       bool    `json:"enabled"`
	Treatment     string  `json:"treatment"`
	MatchedRuleID *string `json:"matchedRuleId,omitempty"`
	Reason        string  `json:"reason"`
	Version       int     `json:"version"`
	HashBucket    float64 `json:"hashBucket"`
}

type Watcher struct {
	ID      string
	Key     string
	Channel chan WatchEvent
}

type WatchEvent struct {
	Key             string    `json:"key"`
	ChangeType      string    `json:"changeType"`
	Version         int       `json:"version"`
	PreviousVersion *int      `json:"previousVersion,omitempty"`
	LogIndex        int       `json:"logIndex"`
	CommittedAt     time.Time `json:"committedAt"`
}

type Service struct {
	store      map[string]*ConfigEntry
	flags      map[string]*FeatureFlag
	watchers   map[string][]*Watcher
	logIndex   int
	mu         sync.RWMutex
	maxHistory int
}

func NewService() *Service {
	return &Service{
		store:      make(map[string]*ConfigEntry),
		flags:      make(map[string]*FeatureFlag),
		watchers:   make(map[string][]*Watcher),
		maxHistory: 100,
	}
}

func (s *Service) Get(key string) (*ConfigEntry, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	entry, ok := s.store[key]
	if !ok {
		return nil, fmt.Errorf("%w: %s", ErrKeyNotFound, key)
	}

	result := *entry
	result.History = make([]Version, len(entry.History))
	copy(result.History, entry.History)
	return &result, nil
}

func (s *Service) Put(key string, value json.RawMessage, contentType string, expectedVersion *int, author, reason string) (*ConfigEntry, error) {
	if key == "" {
		return nil, fmt.Errorf("%w: key is empty", ErrInvalidKey)
	}
	if len(value) == 0 {
		return nil, fmt.Errorf("%w: value is empty", ErrInvalidValue)
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	entry, exists := s.store[key]
	if exists && expectedVersion != nil && entry.Version != *expectedVersion {
		return nil, fmt.Errorf("%w: expected %d, got %d", ErrVersionMismatch, *expectedVersion, entry.Version)
	}

	s.logIndex++
	now := time.Now().UTC()

	var prevVersion *int
	if exists {
		v := entry.Version
		prevVersion = &v
	}

	newVersion := 1
	if exists {
		newVersion = entry.Version + 1
	}

	version := Version{
		Key:             key,
		Version:         newVersion,
		LogIndex:        s.logIndex,
		Value:           value,
		ContentType:     contentType,
		Author:          author,
		Reason:          reason,
		ChangeType:      "created",
		PreviousVersion: prevVersion,
		CommittedAt:     now,
	}

	if exists {
		version.ChangeType = "updated"
		entry.History = append(entry.History, version)
		if len(entry.History) > s.maxHistory {
			entry.History = entry.History[len(entry.History)-s.maxHistory:]
		}
		entry.Value = value
		entry.ContentType = contentType
		entry.Version = newVersion
		entry.LogIndex = s.logIndex
		entry.UpdatedAt = now
		entry.UpdatedBy = author
	} else {
		entry = &ConfigEntry{
			Key:         key,
			Value:       value,
			ContentType: contentType,
			Version:     newVersion,
			LogIndex:    s.logIndex,
			CreatedAt:   now,
			UpdatedAt:   now,
			CreatedBy:   author,
			UpdatedBy:   author,
			History:     []Version{version},
		}
		s.store[key] = entry
	}

	s.notifyWatchers(key, WatchEvent{
		Key:             key,
		ChangeType:      version.ChangeType,
		Version:         newVersion,
		PreviousVersion: prevVersion,
		LogIndex:        s.logIndex,
		CommittedAt:     now,
	})

	return entry, nil
}

func (s *Service) Rollback(key string, targetVersion int, expectedCurrentVersion *int, author, reason string) (*ConfigEntry, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	entry, ok := s.store[key]
	if !ok {
		return nil, fmt.Errorf("%w: %s", ErrKeyNotFound, key)
	}

	if expectedCurrentVersion != nil && entry.Version != *expectedCurrentVersion {
		return nil, fmt.Errorf("%w: expected %d, got %d", ErrVersionMismatch, *expectedCurrentVersion, entry.Version)
	}

	var targetValue json.RawMessage
	var found bool
	for _, v := range entry.History {
		if v.Version == targetVersion {
			targetValue = v.Value
			found = true
			break
		}
	}

	if !found {
		return nil, fmt.Errorf("%w: version %d", ErrVersionNotFound, targetVersion)
	}

	s.logIndex++
	now := time.Now().UTC()
	prevVersion := entry.Version

	newVersion := entry.Version + 1
	version := Version{
		Key:             key,
		Version:         newVersion,
		LogIndex:        s.logIndex,
		Value:           targetValue,
		ContentType:     entry.ContentType,
		Author:          author,
		Reason:          reason,
		ChangeType:      "rolled_back",
		PreviousVersion: &prevVersion,
		CommittedAt:     now,
	}

	entry.History = append(entry.History, version)
	if len(entry.History) > s.maxHistory {
		entry.History = entry.History[len(entry.History)-s.maxHistory:]
	}
	entry.Value = targetValue
	entry.Version = newVersion
	entry.LogIndex = s.logIndex
	entry.UpdatedAt = now
	entry.UpdatedBy = author

	s.notifyWatchers(key, WatchEvent{
		Key:             key,
		ChangeType:      "rolled_back",
		Version:         newVersion,
		PreviousVersion: &prevVersion,
		LogIndex:        s.logIndex,
		CommittedAt:     now,
	})

	return entry, nil
}

func (s *Service) Watch(key string) *Watcher {
	s.mu.Lock()
	defer s.mu.Unlock()

	watcher := &Watcher{
		ID:      fmt.Sprintf("watcher-%d", time.Now().UnixNano()),
		Key:     key,
		Channel: make(chan WatchEvent, 10),
	}

	s.watchers[key] = append(s.watchers[key], watcher)
	return watcher
}

func (s *Service) Unwatch(key string, watcher *Watcher) {
	s.mu.Lock()
	defer s.mu.Unlock()

	watchers := s.watchers[key]
	for i, w := range watchers {
		if w.ID == watcher.ID {
			s.watchers[key] = append(watchers[:i], watchers[i+1:]...)
			close(watcher.Channel)
			break
		}
	}
}

func (s *Service) notifyWatchers(key string, event WatchEvent) {
	for _, w := range s.watchers[key] {
		select {
		case w.Channel <- event:
		default:
		}
	}
}

func (s *Service) CreateFlag(flag FeatureFlag) (*FeatureFlag, error) {
	if flag.Name == "" {
		return nil, fmt.Errorf("%w: name is empty", ErrInvalidKey)
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	if existing, ok := s.flags[flag.Name]; ok {
		return existing, nil
	}

	s.logIndex++
	now := time.Now().UTC()

	flag.Version = 1
	flag.LogIndex = s.logIndex
	flag.CreatedAt = now
	flag.UpdatedAt = now

	s.flags[flag.Name] = &flag
	return &flag, nil
}

func (s *Service) GetFlag(name string) (*FeatureFlag, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	flag, ok := s.flags[name]
	if !ok {
		return nil, fmt.Errorf("%w: %s", ErrFlagNotFound, name)
	}

	result := *flag
	return &result, nil
}

func (s *Service) EvaluateFlag(name string, subject Subject, defaultTreatment string) (*EvaluationResult, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	flag, ok := s.flags[name]
	if !ok {
		return nil, fmt.Errorf("%w: %s", ErrFlagNotFound, name)
	}

	if !flag.Enabled {
		return &EvaluationResult{
			Flag:       name,
			Enabled:    false,
			Treatment:  flag.DefaultTreatment,
			Reason:     "flag_disabled",
			Version:    flag.Version,
			HashBucket: 0,
		}, nil
	}

	for _, rule := range flag.TargetingRules {
		if !rule.Enabled {
			continue
		}

		if s.matchRule(rule, subject) {
			return &EvaluationResult{
				Flag:          name,
				Enabled:       true,
				Treatment:     rule.Treatment,
				MatchedRuleID: &rule.RuleID,
				Reason:        "targeting_rule_match",
				Version:       flag.Version,
				HashBucket:    0,
			}, nil
		}
	}

	if flag.RolloutPercentage > 0 && subject.ID != "" {
		hash := s.hashSubject(flag.Name, flag.RolloutSeed, subject.ID)
		if hash <= flag.RolloutPercentage {
			return &EvaluationResult{
				Flag:       name,
				Enabled:    true,
				Treatment:  flag.DefaultTreatment,
				Reason:     "gradual_rollout",
				Version:    flag.Version,
				HashBucket: hash,
			}, nil
		}
	}

	return &EvaluationResult{
		Flag:       name,
		Enabled:    true,
		Treatment:  defaultTreatment,
		Reason:     "default",
		Version:    flag.Version,
		HashBucket: 0,
	}, nil
}

func (s *Service) matchRule(rule TargetingRule, subject Subject) bool {
	var value interface{}

	switch rule.Attribute {
	case "id":
		value = subject.ID
	case "tenant":
		value = subject.Tenant
	case "region":
		value = subject.Region
	case "role":
		value = subject.Role
	default:
		if subject.Attributes != nil {
			value = subject.Attributes[rule.Attribute]
		}
	}

	if value == nil || value == "" {
		return false
	}

	strValue := fmt.Sprintf("%v", value)

	switch rule.Operator {
	case "equals":
		for _, v := range rule.Values {
			if strValue == v {
				return true
			}
		}
	case "in":
		for _, v := range rule.Values {
			if strValue == v {
				return true
			}
		}
	case "contains":
		for _, v := range rule.Values {
			if strValue == v {
				return true
			}
		}
	}

	return false
}

func (s *Service) hashSubject(flagName, seed, subjectID string) float64 {
	h := sha256.New()
	h.Write([]byte(flagName + ":" + seed + ":" + subjectID))
	sum := h.Sum(nil)
	val := 0
	for i := 0; i < 4; i++ {
		val = val<<8 + int(sum[i])
	}
	return math.Abs(float64(val%10000)) / 100.0
}

func (s *Service) Health() map[string]interface{} {
	s.mu.RLock()
	defer s.mu.RUnlock()

	return map[string]interface{}{
		"status":            "ok",
		"nodeId":            "node-1",
		"role":              "standalone",
		"leaderId":          "node-1",
		"lastAppliedLogIndex": s.logIndex,
		"quorumAvailable":   true,
	}
}

func (s *Service) Metrics() map[string]interface{} {
	s.mu.RLock()
	defer s.mu.RUnlock()

	return map[string]interface{}{
		"config_keys":    len(s.store),
		"flags":          len(s.flags),
		"watchers":       len(s.watchers),
		"last_log_index": s.logIndex,
	}
}

func (s *Service) ListKeys() []string {
	s.mu.RLock()
	defer s.mu.RUnlock()

	keys := make([]string, 0, len(s.store))
	for k := range s.store {
		keys = append(keys, k)
	}
	return keys
}
