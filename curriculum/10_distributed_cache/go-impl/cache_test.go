package distributedcache

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

func TestSetGetDeleteTTLAndInvalidation(t *testing.T) {
	c := NewCache(Config{NodeID: "node-a", Shards: []Node{{ID: "node-a", Address: "local"}}, CapacityEntries: 10, MaxValueBytes: 64, EvictionPolicy: "lru", VirtualNodes: 8, DefaultTTL: time.Minute})
	if res, err := c.Set(context.Background(), "users:1", "Ada", "users", 25*time.Millisecond, false); err != nil || !res.Stored || res.Version != 1 {
		t.Fatalf("set result = %#v err=%v", res, err)
	}
	got, err := c.Get(context.Background(), "users:1", false)
	if err != nil || !got.Hit || got.Value != "Ada" || got.TTLRemaining <= 0 {
		t.Fatalf("expected hit with ttl, got %#v err=%v", got, err)
	}
	time.Sleep(35 * time.Millisecond)
	got, err = c.Get(context.Background(), "users:1", false)
	if err != nil || got.Hit {
		t.Fatalf("expired entry must be a miss, got %#v err=%v", got, err)
	}
	if c.Metrics().Expirations != 1 {
		t.Fatalf("expected expiration metric, got %#v", c.Metrics())
	}

	_, _ = c.Set(context.Background(), "users:2", "Grace", "users", time.Minute, false)
	deleted, err := c.Invalidate(Invalidation{Namespace: "users"})
	if err != nil || deleted != 1 {
		t.Fatalf("namespace invalidation deleted=%d err=%v", deleted, err)
	}
	got, _ = c.Get(context.Background(), "users:2", false)
	if got.Hit {
		t.Fatalf("invalidated key returned hit")
	}
	first, _ := c.Delete(context.Background(), "users:2")
	second, _ := c.Delete(context.Background(), "users:2")
	if first.Deleted || second.Deleted {
		t.Fatalf("delete must be idempotent for missing key: %#v %#v", first, second)
	}
}

func TestLRUAndLFUEviction(t *testing.T) {
	lru := NewCache(Config{NodeID: "node-a", Shards: []Node{{ID: "node-a"}}, CapacityEntries: 2, MaxValueBytes: 64, EvictionPolicy: "lru", VirtualNodes: 4})
	_, _ = lru.Set(context.Background(), "a", "1", "", 0, false)
	_, _ = lru.Set(context.Background(), "b", "2", "", 0, false)
	_, _ = lru.Get(context.Background(), "a", false)
	_, _ = lru.Set(context.Background(), "c", "3", "", 0, false)
	if got, _ := lru.Get(context.Background(), "b", false); got.Hit {
		t.Fatalf("LRU should evict least recently used key b")
	}
	if lru.Metrics().Evictions != 1 {
		t.Fatalf("expected one LRU eviction")
	}

	lfu := NewCache(Config{NodeID: "node-a", Shards: []Node{{ID: "node-a"}}, CapacityEntries: 2, MaxValueBytes: 64, EvictionPolicy: "lfu", VirtualNodes: 4})
	_, _ = lfu.Set(context.Background(), "a", "1", "", 0, false)
	_, _ = lfu.Set(context.Background(), "b", "2", "", 0, false)
	_, _ = lfu.Get(context.Background(), "a", false)
	_, _ = lfu.Get(context.Background(), "a", false)
	_, _ = lfu.Set(context.Background(), "c", "3", "", 0, false)
	if got, _ := lfu.Get(context.Background(), "b", false); got.Hit {
		t.Fatalf("LFU should evict lowest-frequency key b")
	}
}

func TestConsistentHashingRemapsBoundedSubset(t *testing.T) {
	nodes := []Node{{ID: "a"}, {ID: "b"}, {ID: "c"}}
	ring := NewHashRing(nodes, 64)
	owners := map[string]string{}
	for i := 0; i < 500; i++ {
		key := fmt.Sprintf("key-%d", i)
		owners[key] = ring.Owner(key).ID
	}
	ring.Add(Node{ID: "d"})
	remapped := 0
	for key, old := range owners {
		if ring.Owner(key).ID != old {
			remapped++
		}
	}
	if remapped <= 0 || remapped >= 250 {
		t.Fatalf("consistent hashing should remap bounded subset, remapped=%d", remapped)
	}
	if len(ring.TokensFor("a")) != 64 {
		t.Fatalf("expected virtual-node tokens in ring inspection")
	}
}

func TestCacheAsideSingleflightWriteThroughAndCapacityErrors(t *testing.T) {
	var loads int32
	store := NewMemoryStore(map[string]string{"hot": "loaded"})
	c := NewCache(Config{NodeID: "node-a", Shards: []Node{{ID: "node-a"}}, CapacityEntries: 5, MaxValueBytes: 8, EvictionPolicy: "lru", VirtualNodes: 4, Loader: func(ctx context.Context, key string) (string, error) {
		atomic.AddInt32(&loads, 1)
		time.Sleep(20 * time.Millisecond)
		return store.Load(ctx, key)
	}, Writer: store.Write})

	var wg sync.WaitGroup
	results := make([]GetResult, 8)
	for i := range results {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			results[i], _ = c.Get(context.Background(), "hot", true)
		}(i)
	}
	wg.Wait()
	if loads != 1 {
		t.Fatalf("singleflight should call loader once, got %d", loads)
	}
	coalesced := 0
	for _, res := range results {
		if res.Value != "loaded" || !res.Loaded {
			t.Fatalf("unexpected cache-aside result %#v", res)
		}
		if res.Coalesced {
			coalesced++
		}
	}
	if coalesced == 0 || c.Metrics().SingleflightCoalesces == 0 || c.Metrics().LoaderCalls != 1 {
		t.Fatalf("expected coalesced singleflight metrics, got coalesced=%d metrics=%#v", coalesced, c.Metrics())
	}

	if _, err := c.Set(context.Background(), "too-big", "this is too large", "", 0, false); err == nil {
		t.Fatalf("expected max value size error")
	}
	store.FailWrites(true)
	if _, err := c.Set(context.Background(), "w", "ok", "", 0, true); err == nil {
		t.Fatalf("write-through failure must fail set")
	}
}

func TestHTTPHealthMetricsAndGracefulShutdown(t *testing.T) {
	c := NewCache(Config{NodeID: "node-a", Shards: []Node{{ID: "node-a"}}, CapacityEntries: 10, MaxValueBytes: 64, EvictionPolicy: "lru", VirtualNodes: 4, DefaultTTL: time.Minute})
	server := NewHTTPServer(c)
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPut, "/cache/hello", strings.NewReader(`{"value":"world","ttlMs":60000,"namespace":"demo"}`))
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("PUT status=%d body=%s", rec.Code, rec.Body.String())
	}
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/cache/hello", nil))
	if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), `"hit":true`) {
		t.Fatalf("GET status=%d body=%s", rec.Code, rec.Body.String())
	}
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/health", nil))
	if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), `"status":"ok"`) {
		t.Fatalf("health status=%d body=%s", rec.Code, rec.Body.String())
	}
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/metrics", nil))
	if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), "hits") {
		t.Fatalf("metrics status=%d body=%s", rec.Code, rec.Body.String())
	}
	if err := c.Shutdown(context.Background()); err != nil {
		t.Fatalf("shutdown err=%v", err)
	}
}

func TestValidationRingAndInvalidationHTTPEdges(t *testing.T) {
	c := NewCache(Config{NodeID: "node-a", Shards: []Node{{ID: "node-a"}}, CapacityEntries: 3, MaxValueBytes: 4, EvictionPolicy: "lru", VirtualNodes: 4})
	if _, err := c.Set(context.Background(), "", "x", "", 0, false); err == nil {
		t.Fatalf("empty key should fail")
	}
	if _, err := c.Set(context.Background(), "k", "x", "", -time.Millisecond, false); err == nil {
		t.Fatalf("negative ttl should fail")
	}
	if _, err := c.Get(context.Background(), "", false); err == nil {
		t.Fatalf("empty get key should fail")
	}
	if _, err := c.Invalidate(Invalidation{}); err == nil {
		t.Fatalf("ambiguous invalidation should fail")
	}
	_, _ = c.Set(context.Background(), "pref:1", "one", "", 0, false)
	_, _ = c.Set(context.Background(), "pref:2", "two", "", 0, false)
	deleted, err := c.Invalidate(Invalidation{Prefix: "pref:"})
	if err != nil || deleted != 2 {
		t.Fatalf("prefix invalidation deleted=%d err=%v", deleted, err)
	}

	server := NewHTTPServer(c)
	rec := httptest.NewRecorder()
	server.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/cluster/ring", nil))
	if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), "virtualNodes") {
		t.Fatalf("ring status=%d body=%s", rec.Code, rec.Body.String())
	}
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, httptest.NewRequest(http.MethodPost, "/cache/invalidate", strings.NewReader(`{"prefix":"none:"}`)))
	if rec.Code != http.StatusAccepted {
		t.Fatalf("invalidate status=%d body=%s", rec.Code, rec.Body.String())
	}
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, httptest.NewRequest(http.MethodPut, "/cache/big", strings.NewReader(`{"value":"large"}`)))
	if rec.Code != http.StatusRequestEntityTooLarge {
		t.Fatalf("large put status=%d body=%s", rec.Code, rec.Body.String())
	}
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, httptest.NewRequest(http.MethodDelete, "/cache/missing", nil))
	if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), "not_found") {
		t.Fatalf("delete status=%d body=%s", rec.Code, rec.Body.String())
	}
}
