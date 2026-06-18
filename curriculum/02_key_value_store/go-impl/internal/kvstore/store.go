package kvstore

import (
	"encoding/json"
	"errors"
	"sort"
	"time"
	"unicode/utf8"

	"sync"
)

const (
	ErrInvalidKey          = "INVALID_KEY"
	ErrKeyTooLong          = "KEY_TOO_LONG"
	ErrInvalidTTL          = "INVALID_TTL"
	ErrKeyNotFound         = "KEY_NOT_FOUND"
	ErrValueTooLarge       = "VALUE_TOO_LARGE"
	ErrStoreFull           = "STORE_FULL"
	ErrMemoryLimitExceeded = "MEMORY_LIMIT_EXCEEDED"
	ErrInvalidJSON         = "INVALID_JSON"
	ErrInvalidLimit        = "INVALID_LIMIT"
)

const (
	defaultMaxKeyBytes    = 512
	defaultMaxValueBytes  = 1 << 20
	defaultMaxKeys        = 100_000
	defaultMaxMemoryBytes = 256 << 20
	minTTLSeconds         = 1
	maxTTLSeconds         = 30 * 24 * 60 * 60
	entryOverheadBytes    = 64
)

type Config struct {
	MaxKeyBytes    int
	MaxValueBytes  int
	MaxKeys        int
	MaxMemoryBytes int
}

type Store struct {
	mu                 sync.RWMutex
	entries            map[string]StoredEntry
	config             Config
	now                func() time.Time
	approxMemoryBytes  int
	commandsProcessed  uint64
	expiredKeysRemoved uint64
}

type StoredEntry struct {
	Key         string
	Value       any
	CreatedAt   time.Time
	UpdatedAt   time.Time
	ExpiresAt   *time.Time
	ApproxBytes int
}

type EntryView struct {
	Key        string     `json:"key"`
	Value      any        `json:"value"`
	TTLSeconds *int64     `json:"ttlSeconds"`
	ExpiresAt  *time.Time `json:"expiresAt"`
}

type Pair struct {
	Key   string `json:"key"`
	Value any    `json:"value"`
}

type MGetItem struct {
	Key   string `json:"key"`
	Value any    `json:"value"`
	Found bool   `json:"found"`
}

type Health struct {
	Status             string `json:"status"`
	KeyCount           int    `json:"keyCount"`
	ApproxMemoryBytes  int    `json:"approxMemoryBytes"`
	CommandsProcessed  uint64 `json:"commandsProcessed"`
	ExpiredKeysRemoved uint64 `json:"expiredKeysRemoved"`
}

type DomainError struct {
	Code    string
	Message string
}

func (e DomainError) Error() string { return e.Message }

func IsCode(err error, code string) bool {
	var domainErr DomainError
	return errors.As(err, &domainErr) && domainErr.Code == code
}

func NewStore(config Config, now func() time.Time) *Store {
	if now == nil {
		now = time.Now
	}
	if config.MaxKeyBytes == 0 {
		config.MaxKeyBytes = defaultMaxKeyBytes
	}
	if config.MaxValueBytes == 0 {
		config.MaxValueBytes = defaultMaxValueBytes
	}
	if config.MaxKeys == 0 {
		config.MaxKeys = defaultMaxKeys
	}
	if config.MaxMemoryBytes == 0 {
		config.MaxMemoryBytes = defaultMaxMemoryBytes
	}
	return &Store{entries: map[string]StoredEntry{}, config: config, now: now}
}

func (s *Store) Set(key string, value any, ttlSeconds int64) (*time.Time, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.commandsProcessed++
	s.removeExpiredLocked(s.now())
	expiresAt, approx, err := s.validateWriteLocked(key, value, ttlSeconds, map[string]struct{}{key: {}})
	if err != nil {
		return nil, err
	}
	now := s.now()
	old := s.entries[key]
	s.approxMemoryBytes += approx - old.ApproxBytes
	created := old.CreatedAt
	if created.IsZero() {
		created = now
	}
	s.entries[key] = StoredEntry{Key: key, Value: cloneJSON(value), CreatedAt: created, UpdatedAt: now, ExpiresAt: expiresAt, ApproxBytes: approx}
	return expiresAt, nil
}

func (s *Store) Get(key string) (EntryView, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.commandsProcessed++
	now := s.now()
	if !s.validStoredKeyLocked(key, now) {
		return EntryView{}, false
	}
	return s.viewLocked(s.entries[key], now), true
}

func (s *Store) Delete(keys []string) int {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.commandsProcessed++
	now := s.now()
	deleted := 0
	for _, key := range keys {
		if s.validStoredKeyLocked(key, now) {
			s.removeLocked(key)
			deleted++
		}
	}
	return deleted
}

func (s *Store) Expire(key string, ttlSeconds int64) (bool, *time.Time, error) {
	if err := validateTTL(ttlSeconds); err != nil {
		return false, nil, err
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	s.commandsProcessed++
	now := s.now()
	if !s.validStoredKeyLocked(key, now) {
		return false, nil, DomainError{Code: ErrKeyNotFound, Message: "key not found"}
	}
	expiresAt := now.Add(time.Duration(ttlSeconds) * time.Second)
	entry := s.entries[key]
	entry.ExpiresAt = &expiresAt
	entry.UpdatedAt = now
	s.entries[key] = entry
	return true, &expiresAt, nil
}

func (s *Store) TTL(key string) int64 {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.commandsProcessed++
	now := s.now()
	if !s.validStoredKeyLocked(key, now) {
		return -2
	}
	entry := s.entries[key]
	if entry.ExpiresAt == nil {
		return -1
	}
	return remainingSeconds(*entry.ExpiresAt, now)
}

func (s *Store) Persist(key string) (bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.commandsProcessed++
	now := s.now()
	if !s.validStoredKeyLocked(key, now) {
		return false, DomainError{Code: ErrKeyNotFound, Message: "key not found"}
	}
	entry := s.entries[key]
	if entry.ExpiresAt == nil {
		return false, nil
	}
	entry.ExpiresAt = nil
	entry.UpdatedAt = now
	s.entries[key] = entry
	return true, nil
}

func (s *Store) Keys(prefix string, limit int) []string {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.commandsProcessed++
	s.removeExpiredLocked(s.now())
	keys := make([]string, 0, len(s.entries))
	for key := range s.entries {
		if prefix == "" || len(key) >= len(prefix) && key[:len(prefix)] == prefix {
			keys = append(keys, key)
		}
	}
	sort.Strings(keys)
	if limit > 0 && len(keys) > limit {
		return keys[:limit]
	}
	return keys
}

func (s *Store) MGet(keys []string) []MGetItem {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.commandsProcessed++
	now := s.now()
	items := make([]MGetItem, 0, len(keys))
	for _, key := range keys {
		if !s.validStoredKeyLocked(key, now) {
			items = append(items, MGetItem{Key: key, Value: nil, Found: false})
			continue
		}
		items = append(items, MGetItem{Key: key, Value: cloneJSON(s.entries[key].Value), Found: true})
	}
	return items
}

func (s *Store) MSet(items []Pair, ttlSeconds int64) (*time.Time, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.commandsProcessed++
	now := s.now()
	s.removeExpiredLocked(now)
	seen := make(map[string]struct{}, len(items))
	var expiresAt *time.Time
	newMemory := s.approxMemoryBytes
	newKeys := len(s.entries)
	approxs := make([]int, len(items))
	for i, item := range items {
		if _, exists := seen[item.Key]; exists {
			return nil, DomainError{Code: ErrInvalidKey, Message: "duplicate key in mset"}
		}
		seen[item.Key] = struct{}{}
		expiry, approx, err := s.validateWriteLocked(item.Key, item.Value, ttlSeconds, seen)
		if err != nil {
			return nil, err
		}
		if i == 0 {
			expiresAt = expiry
		}
		old, exists := s.entries[item.Key]
		if !exists {
			newKeys++
		}
		newMemory += approx - old.ApproxBytes
		approxs[i] = approx
	}
	if newKeys > s.config.MaxKeys {
		return nil, DomainError{Code: ErrStoreFull, Message: "store key limit exceeded"}
	}
	if newMemory > s.config.MaxMemoryBytes {
		return nil, DomainError{Code: ErrMemoryLimitExceeded, Message: "memory limit exceeded"}
	}
	for i, item := range items {
		old := s.entries[item.Key]
		created := old.CreatedAt
		if created.IsZero() {
			created = now
		}
		var itemExpiresAt *time.Time
		if ttlSeconds > 0 {
			expiry := now.Add(time.Duration(ttlSeconds) * time.Second)
			itemExpiresAt = &expiry
		}
		s.entries[item.Key] = StoredEntry{Key: item.Key, Value: cloneJSON(item.Value), CreatedAt: created, UpdatedAt: now, ExpiresAt: itemExpiresAt, ApproxBytes: approxs[i]}
	}
	s.approxMemoryBytes = newMemory
	return expiresAt, nil
}

func (s *Store) FlushDB() int {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.commandsProcessed++
	deleted := len(s.entries)
	s.entries = map[string]StoredEntry{}
	s.approxMemoryBytes = 0
	return deleted
}

func (s *Store) Health() Health {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.removeExpiredLocked(s.now())
	return Health{Status: "ok", KeyCount: len(s.entries), ApproxMemoryBytes: s.approxMemoryBytes, CommandsProcessed: s.commandsProcessed, ExpiredKeysRemoved: s.expiredKeysRemoved}
}

func (s *Store) validateWriteLocked(key string, value any, ttlSeconds int64, batchKeys map[string]struct{}) (*time.Time, int, error) {
	if err := s.validateKey(key); err != nil {
		return nil, 0, err
	}
	if ttlSeconds != 0 {
		if err := validateTTL(ttlSeconds); err != nil {
			return nil, 0, err
		}
	}
	valueBytes, err := json.Marshal(value)
	if err != nil {
		return nil, 0, DomainError{Code: ErrInvalidJSON, Message: "value is not JSON serializable"}
	}
	if len(valueBytes) > s.config.MaxValueBytes {
		return nil, 0, DomainError{Code: ErrValueTooLarge, Message: "value is too large"}
	}
	if _, exists := s.entries[key]; !exists && len(s.entries) >= s.config.MaxKeys && len(batchKeys) == 1 {
		return nil, 0, DomainError{Code: ErrStoreFull, Message: "store key limit exceeded"}
	}
	var expiresAt *time.Time
	if ttlSeconds > 0 {
		expiry := s.now().Add(time.Duration(ttlSeconds) * time.Second)
		expiresAt = &expiry
	}
	approx := len(key) + len(valueBytes) + entryOverheadBytes
	old := s.entries[key]
	if s.approxMemoryBytes+approx-old.ApproxBytes > s.config.MaxMemoryBytes {
		return nil, 0, DomainError{Code: ErrMemoryLimitExceeded, Message: "memory limit exceeded"}
	}
	return expiresAt, approx, nil
}

func (s *Store) validateKey(key string) error {
	if key == "" || !utf8.ValidString(key) {
		return DomainError{Code: ErrInvalidKey, Message: "key must be a non-empty UTF-8 string"}
	}
	if len(key) > s.config.MaxKeyBytes {
		return DomainError{Code: ErrKeyTooLong, Message: "key is too long"}
	}
	return nil
}

func validateTTL(ttlSeconds int64) error {
	if ttlSeconds < minTTLSeconds || ttlSeconds > maxTTLSeconds {
		return DomainError{Code: ErrInvalidTTL, Message: "ttlSeconds must be between 1 and 2592000"}
	}
	return nil
}

func (s *Store) validStoredKeyLocked(key string, now time.Time) bool {
	entry, ok := s.entries[key]
	if !ok {
		return false
	}
	if isExpired(entry, now) {
		s.removeLocked(key)
		s.expiredKeysRemoved++
		return false
	}
	return true
}

func (s *Store) removeExpiredLocked(now time.Time) {
	for key, entry := range s.entries {
		if isExpired(entry, now) {
			s.removeLocked(key)
			s.expiredKeysRemoved++
		}
	}
}

func (s *Store) removeLocked(key string) {
	entry := s.entries[key]
	delete(s.entries, key)
	s.approxMemoryBytes -= entry.ApproxBytes
	if s.approxMemoryBytes < 0 {
		s.approxMemoryBytes = 0
	}
}

func (s *Store) viewLocked(entry StoredEntry, now time.Time) EntryView {
	var ttl *int64
	if entry.ExpiresAt != nil {
		remaining := remainingSeconds(*entry.ExpiresAt, now)
		ttl = &remaining
	}
	return EntryView{Key: entry.Key, Value: cloneJSON(entry.Value), TTLSeconds: ttl, ExpiresAt: entry.ExpiresAt}
}

func isExpired(entry StoredEntry, now time.Time) bool {
	return entry.ExpiresAt != nil && !entry.ExpiresAt.After(now)
}

func remainingSeconds(expiresAt time.Time, now time.Time) int64 {
	remaining := int64(expiresAt.Sub(now).Seconds())
	if remaining < 0 {
		return 0
	}
	return remaining
}

func cloneJSON(value any) any {
	bytes, err := json.Marshal(value)
	if err != nil {
		return value
	}
	var cloned any
	if err := json.Unmarshal(bytes, &cloned); err != nil {
		return value
	}
	return cloned
}
