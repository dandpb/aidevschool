package kvstore

import (
	"fmt"
	"sync"
	"testing"
	"time"
)

func TestStoreSetGetAndReplaceTTL(t *testing.T) {
	now := time.Unix(1_700_000_000, 0)
	clock := &fakeClock{now: now}
	store := NewStore(Config{}, clock.Now)

	expiresAt, err := store.Set("alpha", map[string]any{"n": float64(1)}, 10)
	if err != nil {
		t.Fatalf("set with ttl: %v", err)
	}
	if expiresAt == nil {
		t.Fatal("expected expiry")
	}

	entry, ok := store.Get("alpha")
	if !ok {
		t.Fatal("expected key")
	}
	if entry.TTLSeconds == nil || *entry.TTLSeconds > 10 || *entry.TTLSeconds < 9 {
		t.Fatalf("unexpected ttl: %#v", entry.TTLSeconds)
	}

	_, err = store.Set("alpha", "replacement", 0)
	if err != nil {
		t.Fatalf("replace: %v", err)
	}
	entry, ok = store.Get("alpha")
	if !ok || entry.Value != "replacement" || entry.ExpiresAt != nil {
		t.Fatalf("replace did not clear ttl: %#v", entry)
	}
}

func TestStoreExpiryTTLDelPersistAndKeys(t *testing.T) {
	clock := &fakeClock{now: time.Unix(1_700_000_000, 0)}
	store := NewStore(Config{}, clock.Now)
	if _, err := store.Set("session:1", "live", 1); err != nil {
		t.Fatal(err)
	}
	if _, err := store.Set("user:1", "persist", 0); err != nil {
		t.Fatal(err)
	}
	if got := store.TTL("missing"); got != -2 {
		t.Fatalf("missing ttl = %d", got)
	}
	if got := store.TTL("user:1"); got != -1 {
		t.Fatalf("persistent ttl = %d", got)
	}
	updated, _, err := store.Expire("user:1", 5)
	if err != nil || !updated {
		t.Fatalf("expire updated=%v err=%v", updated, err)
	}
	removed, err := store.Persist("user:1")
	if err != nil || !removed {
		t.Fatalf("persist removed=%v err=%v", removed, err)
	}
	clock.now = clock.now.Add(2 * time.Second)
	if _, ok := store.Get("session:1"); ok {
		t.Fatal("expired key visible")
	}
	if got := store.Delete([]string{"session:1", "user:1", "missing"}); got != 1 {
		t.Fatalf("deleted = %d", got)
	}
	if got := store.Keys("", 100); len(got) != 0 {
		t.Fatalf("keys after delete = %#v", got)
	}
}

func TestStoreMGetMSetAtomicAndFlush(t *testing.T) {
	store := NewStore(Config{MaxKeys: 2}, time.Now)
	_, err := store.MSet([]Pair{{Key: "a", Value: float64(1)}, {Key: "b", Value: nil}}, 0)
	if err != nil {
		t.Fatalf("mset: %v", err)
	}
	items := store.MGet([]string{"a", "missing", "b", "a"})
	if len(items) != 4 || !items[0].Found || items[1].Found || !items[2].Found || !items[3].Found {
		t.Fatalf("bad mget: %#v", items)
	}
	if _, err := store.MSet([]Pair{{Key: "c", Value: "x"}}, 0); err == nil {
		t.Fatal("expected store full")
	}
	if _, ok := store.Get("c"); ok {
		t.Fatal("failed mset mutated store")
	}
	if got := store.FlushDB(); got != 2 {
		t.Fatalf("flush deleted %d", got)
	}
}

func TestStoreCapacityMemoryAndListSemantics(t *testing.T) {
	store := NewStore(Config{MaxKeys: 2, MaxMemoryBytes: 220}, time.Now)
	if _, err := store.Set("aa", "one", 0); err != nil {
		t.Fatal(err)
	}
	if _, err := store.Set("ab", "two", 0); err != nil {
		t.Fatal(err)
	}
	if _, err := store.Set("ac", "three", 0); !IsCode(err, ErrStoreFull) {
		t.Fatalf("store full err = %v", err)
	}
	keys := store.Keys("a", 1)
	if len(keys) != 1 || keys[0] != "aa" {
		t.Fatalf("limited prefix keys = %#v", keys)
	}
	if _, err := store.Set("aa", "updated", 0); err != nil {
		t.Fatalf("update existing under full store: %v", err)
	}
	smallMemory := NewStore(Config{MaxMemoryBytes: 10}, time.Now)
	if _, err := smallMemory.Set("k", "v", 0); !IsCode(err, ErrMemoryLimitExceeded) {
		t.Fatalf("memory err = %v", err)
	}
}

func TestStoreExpirePersistErrorBranches(t *testing.T) {
	store := NewStore(Config{}, time.Now)
	if _, _, err := store.Expire("missing", 5); !IsCode(err, ErrKeyNotFound) {
		t.Fatalf("expire missing err = %v", err)
	}
	if _, _, err := store.Expire("missing", 0); !IsCode(err, ErrInvalidTTL) {
		t.Fatalf("expire invalid ttl err = %v", err)
	}
	if _, err := store.Persist("missing"); !IsCode(err, ErrKeyNotFound) {
		t.Fatalf("persist missing err = %v", err)
	}
	if _, err := store.Set("plain", "value", 0); err != nil {
		t.Fatal(err)
	}
	updated, err := store.Persist("plain")
	if err != nil || updated {
		t.Fatalf("persist non-expiring updated=%v err=%v", updated, err)
	}
}

func TestValidationAndConcurrency(t *testing.T) {
	store := NewStore(Config{MaxKeyBytes: 3, MaxValueBytes: 12, MaxKeys: 1000}, time.Now)
	if _, err := store.Set("", "x", 0); !IsCode(err, ErrInvalidKey) {
		t.Fatalf("empty key err = %v", err)
	}
	if _, err := store.Set("long", "x", 0); !IsCode(err, ErrKeyTooLong) {
		t.Fatalf("long key err = %v", err)
	}
	if _, err := store.Set("ok", "value too large", 0); !IsCode(err, ErrValueTooLarge) {
		t.Fatalf("large value err = %v", err)
	}
	if _, err := store.Set("ok", "x", 0); err != nil {
		t.Fatalf("valid set err = %v", err)
	}
	if _, _, err := store.Expire("ok", 0); !IsCode(err, ErrInvalidTTL) {
		t.Fatalf("invalid ttl err = %v", err)
	}
	var wg sync.WaitGroup
	for i := 0; i < 100; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			key := fmt.Sprintf("k%d", i)
			_, _ = store.Set(key, i, 0)
			_, _ = store.Get(key)
		}(i)
	}
	wg.Wait()
	if store.Health().KeyCount == 0 {
		t.Fatal("expected concurrent writes")
	}
}

type fakeClock struct{ now time.Time }

func (f *fakeClock) Now() time.Time { return f.now }
