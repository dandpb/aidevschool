package distributedcache

import (
	"context"
	"crypto/sha256"
	"encoding/binary"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"sort"
	"strings"
	"sync"
	"time"
)

var (
	ErrInvalidKey    = errors.New("invalid key")
	ErrValueTooLarge = errors.New("value too large")
	ErrBackingStore  = errors.New("backing store unavailable")
	ErrInvalidation  = errors.New("exactly one invalidation scope is required")
)

type LoaderFunc func(context.Context, string) (string, error)
type WriterFunc func(context.Context, string, string) error

type Config struct {
	NodeID          string
	Shards          []Node
	CapacityEntries int
	MaxValueBytes   int
	EvictionPolicy  string
	VirtualNodes    int
	DefaultTTL      time.Duration
	Loader          LoaderFunc
	Writer          WriterFunc
}

type Node struct {
	ID      string `json:"nodeId"`
	Address string `json:"address"`
}

type Cache struct {
	mu      sync.RWMutex
	entries map[string]*entry
	cfg     Config
	ring    *HashRing
	metrics Metrics
	logger  *slog.Logger
	flights map[string]*flight
	closed  bool
}

type entry struct {
	Key         string
	Namespace   string
	Value       string
	CreatedAt   time.Time
	UpdatedAt   time.Time
	AccessedAt  time.Time
	ExpiresAt   time.Time
	AccessCount int
	Version     int
}

type GetResult struct {
	Key          string        `json:"key"`
	Value        string        `json:"value,omitempty"`
	Hit          bool          `json:"hit"`
	Loaded       bool          `json:"loaded"`
	Coalesced    bool          `json:"coalesced"`
	TTLRemaining time.Duration `json:"-"`
	ShardID      string        `json:"shardId,omitempty"`
	NodeID       string        `json:"nodeId,omitempty"`
	Version      int           `json:"version,omitempty"`
}

func (r GetResult) MarshalJSON() ([]byte, error) {
	type wire struct {
		Key            string `json:"key"`
		Value          string `json:"value,omitempty"`
		Hit            bool   `json:"hit"`
		Loaded         bool   `json:"loaded"`
		Coalesced      bool   `json:"coalesced"`
		TTLRemainingMs int64  `json:"ttlRemainingMs,omitempty"`
		ShardID        string `json:"shardId,omitempty"`
		NodeID         string `json:"nodeId,omitempty"`
		Version        int    `json:"version,omitempty"`
	}
	return json.Marshal(wire{r.Key, r.Value, r.Hit, r.Loaded, r.Coalesced, r.TTLRemaining.Milliseconds(), r.ShardID, r.NodeID, r.Version})
}

type SetResult struct {
	Key       string   `json:"key"`
	Stored    bool     `json:"stored"`
	ShardID   string   `json:"shardId"`
	NodeID    string   `json:"nodeId"`
	Version   int      `json:"version"`
	Evicted   []string `json:"evicted"`
	ExpiresAt string   `json:"ttlExpiresAt,omitempty"`
}

type DeleteResult struct {
	Key     string `json:"key"`
	Deleted bool   `json:"deleted"`
	Reason  string `json:"reason,omitempty"`
	ShardID string `json:"shardId,omitempty"`
	NodeID  string `json:"nodeId,omitempty"`
}

type Invalidation struct{ Key, Namespace, Prefix string }

type Metrics struct {
	Hits                  int64 `json:"hits"`
	Misses                int64 `json:"misses"`
	Evictions             int64 `json:"evictions"`
	Expirations           int64 `json:"expirations"`
	Invalidations         int64 `json:"invalidations"`
	LoaderCalls           int64 `json:"loaderCalls"`
	SingleflightCoalesces int64 `json:"singleflightCoalesces"`
	MembershipChanges     int64 `json:"membershipChanges"`
}

type flight struct {
	done    chan struct{}
	value   string
	err     error
	waiters int
}

func NewCache(cfg Config) *Cache {
	if cfg.NodeID == "" {
		cfg.NodeID = "node-a"
	}
	if len(cfg.Shards) == 0 {
		cfg.Shards = []Node{{ID: cfg.NodeID, Address: "local"}}
	}
	if cfg.CapacityEntries <= 0 {
		cfg.CapacityEntries = 128
	}
	if cfg.MaxValueBytes <= 0 {
		cfg.MaxValueBytes = 1024 * 1024
	}
	if cfg.VirtualNodes <= 0 {
		cfg.VirtualNodes = 32
	}
	if cfg.EvictionPolicy == "" {
		cfg.EvictionPolicy = "lru"
	}
	return &Cache{entries: map[string]*entry{}, cfg: cfg, ring: NewHashRing(cfg.Shards, cfg.VirtualNodes), logger: slog.Default(), flights: map[string]*flight{}}
}

func (c *Cache) Set(ctx context.Context, key, value, namespace string, ttl time.Duration, writeThrough bool) (SetResult, error) {
	if err := c.validateKeyValue(key, value); err != nil {
		return SetResult{}, err
	}
	if ttl < 0 {
		return SetResult{}, ErrInvalidKey
	}
	if writeThrough && c.cfg.Writer != nil {
		if err := c.cfg.Writer(ctx, key, value); err != nil {
			return SetResult{}, ErrBackingStore
		}
	}
	now := time.Now()
	if ttl == 0 {
		ttl = c.cfg.DefaultTTL
	}
	var expires time.Time
	if ttl > 0 {
		expires = now.Add(ttl)
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	oldVersion := 0
	if old := c.entries[key]; old != nil {
		oldVersion = old.Version
	}
	c.entries[key] = &entry{Key: key, Namespace: namespace, Value: value, CreatedAt: now, UpdatedAt: now, AccessedAt: now, ExpiresAt: expires, AccessCount: 1, Version: oldVersion + 1}
	evicted := c.evictLocked(key)
	node := c.ring.Owner(key)
	c.logger.Info("cache set", "key", key, "node", node.ID, "evicted", len(evicted))
	res := SetResult{Key: key, Stored: true, ShardID: node.ID, NodeID: node.ID, Version: oldVersion + 1, Evicted: evicted}
	if !expires.IsZero() {
		res.ExpiresAt = expires.UTC().Format(time.RFC3339)
	}
	return res, nil
}

func (c *Cache) Get(ctx context.Context, key string, loadOnMiss bool) (GetResult, error) {
	if key == "" || len(key) > 512 {
		return GetResult{}, ErrInvalidKey
	}
	if res, ok := c.getLocal(key); ok {
		return res, nil
	}
	if !loadOnMiss || c.cfg.Loader == nil {
		return GetResult{Key: key, Hit: false}, nil
	}
	return c.loadSingleflight(ctx, key)
}

func (c *Cache) getLocal(key string) (GetResult, bool) {
	now := time.Now()
	c.mu.Lock()
	defer c.mu.Unlock()
	e := c.entries[key]
	if e == nil {
		c.metrics.Misses++
		return GetResult{}, false
	}
	if !e.ExpiresAt.IsZero() && !now.Before(e.ExpiresAt) {
		delete(c.entries, key)
		c.metrics.Misses++
		c.metrics.Expirations++
		return GetResult{}, false
	}
	e.AccessedAt = now
	e.AccessCount++
	c.metrics.Hits++
	node := c.ring.Owner(key)
	remaining := time.Duration(0)
	if !e.ExpiresAt.IsZero() {
		remaining = time.Until(e.ExpiresAt)
	}
	return GetResult{Key: key, Value: e.Value, Hit: true, TTLRemaining: remaining, ShardID: node.ID, NodeID: node.ID, Version: e.Version}, true
}

func (c *Cache) loadSingleflight(ctx context.Context, key string) (GetResult, error) {
	c.mu.Lock()
	if f := c.flights[key]; f != nil {
		f.waiters++
		c.metrics.SingleflightCoalesces++
		c.mu.Unlock()
		select {
		case <-f.done:
			return c.loadedResult(key, f.value, true, f.err)
		case <-ctx.Done():
			return GetResult{}, ctx.Err()
		}
	}
	f := &flight{done: make(chan struct{})}
	c.flights[key] = f
	c.metrics.LoaderCalls++
	c.mu.Unlock()
	f.value, f.err = c.cfg.Loader(ctx, key)
	c.mu.Lock()
	delete(c.flights, key)
	c.mu.Unlock()
	if f.err == nil {
		_, f.err = c.Set(ctx, key, f.value, "", c.cfg.DefaultTTL, false)
	}
	close(f.done)
	return c.loadedResult(key, f.value, false, f.err)
}

func (c *Cache) loadedResult(key, value string, coalesced bool, err error) (GetResult, error) {
	if err != nil {
		return GetResult{}, err
	}
	node := c.ring.Owner(key)
	return GetResult{Key: key, Value: value, Hit: false, Loaded: true, Coalesced: coalesced, ShardID: node.ID, NodeID: node.ID, Version: 1, TTLRemaining: c.cfg.DefaultTTL}, nil
}

func (c *Cache) Delete(ctx context.Context, key string) (DeleteResult, error) {
	if key == "" {
		return DeleteResult{}, ErrInvalidKey
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	node := c.ring.Owner(key)
	if _, ok := c.entries[key]; ok {
		delete(c.entries, key)
		c.metrics.Invalidations++
		return DeleteResult{Key: key, Deleted: true, ShardID: node.ID, NodeID: node.ID}, nil
	}
	return DeleteResult{Key: key, Deleted: false, Reason: "not_found", ShardID: node.ID, NodeID: node.ID}, nil
}

func (c *Cache) Invalidate(scope Invalidation) (int, error) {
	selected := 0
	if scope.Key != "" {
		selected++
	}
	if scope.Namespace != "" {
		selected++
	}
	if scope.Prefix != "" {
		selected++
	}
	if selected != 1 {
		return 0, ErrInvalidation
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	deleted := 0
	for key, e := range c.entries {
		match := key == scope.Key || (scope.Namespace != "" && e.Namespace == scope.Namespace) || (scope.Prefix != "" && strings.HasPrefix(key, scope.Prefix))
		if match {
			delete(c.entries, key)
			deleted++
		}
	}
	c.metrics.Invalidations += int64(deleted)
	return deleted, nil
}

func (c *Cache) Metrics() Metrics { c.mu.RLock(); defer c.mu.RUnlock(); return c.metrics }
func (c *Cache) Ring() *HashRing  { return c.ring }
func (c *Cache) Shutdown(context.Context) error {
	c.mu.Lock()
	c.closed = true
	c.mu.Unlock()
	c.logger.Info("cache shutdown")
	return nil
}

func (c *Cache) validateKeyValue(key, value string) error {
	if key == "" || len(key) > 512 {
		return ErrInvalidKey
	}
	if len([]byte(value)) > c.cfg.MaxValueBytes {
		return ErrValueTooLarge
	}
	return nil
}

func (c *Cache) evictLocked(protected string) []string {
	evicted := []string{}
	for len(c.entries) > c.cfg.CapacityEntries {
		victim := c.victimLocked(protected)
		if victim == "" {
			break
		}
		delete(c.entries, victim)
		c.metrics.Evictions++
		evicted = append(evicted, victim)
	}
	return evicted
}

func (c *Cache) victimLocked(protected string) string {
	var victim string
	for key, e := range c.entries {
		if key == protected {
			continue
		}
		if victim == "" {
			victim = key
			continue
		}
		v := c.entries[victim]
		if c.cfg.EvictionPolicy == "lfu" {
			if e.AccessCount < v.AccessCount || (e.AccessCount == v.AccessCount && (e.AccessedAt.Before(v.AccessedAt) || (e.AccessedAt.Equal(v.AccessedAt) && key < victim))) {
				victim = key
			}
		} else if e.AccessedAt.Before(v.AccessedAt) || (e.AccessedAt.Equal(v.AccessedAt) && key < victim) {
			victim = key
		}
	}
	return victim
}

type HashRing struct {
	mu          sync.RWMutex
	replicas    int
	tokens      []uint64
	owners      map[uint64]Node
	ringVersion int
}

func NewHashRing(nodes []Node, replicas int) *HashRing {
	if replicas <= 0 {
		replicas = 32
	}
	hr := &HashRing{replicas: replicas, owners: map[uint64]Node{}, ringVersion: 1}
	for _, n := range nodes {
		hr.Add(n)
	}
	return hr
}

func (h *HashRing) Add(node Node) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if node.ID == "" {
		node.ID = node.Address
	}
	for i := 0; i < h.replicas; i++ {
		token := hash(fmt.Sprintf("%s-%d", node.ID, i))
		h.tokens = append(h.tokens, token)
		h.owners[token] = node
	}
	sort.Slice(h.tokens, func(i, j int) bool { return h.tokens[i] < h.tokens[j] })
	h.ringVersion++
}

func (h *HashRing) Owner(key string) Node {
	h.mu.RLock()
	defer h.mu.RUnlock()
	if len(h.tokens) == 0 {
		return Node{}
	}
	t := hash(key)
	i := sort.Search(len(h.tokens), func(i int) bool { return h.tokens[i] >= t })
	if i == len(h.tokens) {
		i = 0
	}
	return h.owners[h.tokens[i]]
}

func (h *HashRing) TokensFor(nodeID string) []uint64 {
	h.mu.RLock()
	defer h.mu.RUnlock()
	out := []uint64{}
	for _, t := range h.tokens {
		if h.owners[t].ID == nodeID {
			out = append(out, t)
		}
	}
	return out
}

func hash(s string) uint64 { sum := sha256.Sum256([]byte(s)); return binary.BigEndian.Uint64(sum[:8]) }

type MemoryStore struct {
	mu         sync.Mutex
	data       map[string]string
	failWrites bool
}

func NewMemoryStore(data map[string]string) *MemoryStore {
	if data == nil {
		data = map[string]string{}
	}
	return &MemoryStore{data: data}
}
func (s *MemoryStore) Load(_ context.Context, key string) (string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	v, ok := s.data[key]
	if !ok {
		return "", ErrBackingStore
	}
	return v, nil
}
func (s *MemoryStore) Write(_ context.Context, key, value string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.failWrites {
		return ErrBackingStore
	}
	s.data[key] = value
	return nil
}
func (s *MemoryStore) FailWrites(v bool) { s.mu.Lock(); s.failWrites = v; s.mu.Unlock() }

func NewHTTPServer(c *Cache) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok", "nodeId": c.cfg.NodeID})
	})
	mux.HandleFunc("/metrics", func(w http.ResponseWriter, r *http.Request) { writeJSON(w, http.StatusOK, c.Metrics()) })
	mux.HandleFunc("/cluster/ring", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]any{"ringVersion": c.ring.ringVersion, "virtualNodes": c.cfg.VirtualNodes, "nodes": c.cfg.Shards})
	})
	mux.HandleFunc("/cache/invalidate", func(w http.ResponseWriter, r *http.Request) {
		var body struct{ Key, Namespace, Prefix string }
		_ = json.NewDecoder(r.Body).Decode(&body)
		count, err := c.Invalidate(Invalidation{body.Key, body.Namespace, body.Prefix})
		if err != nil {
			writeError(w, http.StatusBadRequest, err)
			return
		}
		writeJSON(w, http.StatusAccepted, map[string]any{"accepted": true, "matchedApprox": count, "completedOnNodes": []string{c.cfg.NodeID}})
	})
	mux.HandleFunc("/cache/", func(w http.ResponseWriter, r *http.Request) {
		key := strings.TrimPrefix(r.URL.Path, "/cache/")
		switch r.Method {
		case http.MethodGet:
			res, err := c.Get(r.Context(), key, r.URL.Query().Get("loadOnMiss") == "true")
			if err != nil {
				writeError(w, http.StatusBadGateway, err)
				return
			}
			if !res.Hit && !res.Loaded {
				writeJSON(w, http.StatusNotFound, res)
				return
			}
			writeJSON(w, http.StatusOK, res)
		case http.MethodPut:
			var body struct {
				Value        string
				TTLMs        int64
				WriteThrough bool
				Namespace    string
			}
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
				writeError(w, http.StatusBadRequest, err)
				return
			}
			res, err := c.Set(r.Context(), key, body.Value, body.Namespace, time.Duration(body.TTLMs)*time.Millisecond, body.WriteThrough)
			if err != nil {
				status := http.StatusBadRequest
				if errors.Is(err, ErrValueTooLarge) {
					status = http.StatusRequestEntityTooLarge
				}
				writeError(w, status, err)
				return
			}
			status := http.StatusCreated
			if res.Version > 1 {
				status = http.StatusOK
			}
			writeJSON(w, status, res)
		case http.MethodDelete:
			res, err := c.Delete(r.Context(), key)
			if err != nil {
				writeError(w, http.StatusBadRequest, err)
				return
			}
			writeJSON(w, http.StatusOK, res)
		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	})
	return mux
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}
func writeError(w http.ResponseWriter, status int, err error) {
	writeJSON(w, status, map[string]any{"code": strings.ToUpper(strings.ReplaceAll(err.Error(), " ", "_")), "message": err.Error(), "retryable": status >= 500})
}
