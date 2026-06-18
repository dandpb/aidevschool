package kvstore

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strconv"
	"strings"
)

type Handler struct {
	store  *Store
	logger *slog.Logger
}

func NewHandler(store *Store, logger *slog.Logger) http.Handler {
	if logger == nil {
		logger = slog.Default()
	}
	return &Handler{store: store, logger: logger}
}

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	h.logger.Info("request", "method", r.Method, "path", r.URL.Path)
	switch {
	case r.Method == http.MethodGet && r.URL.Path == "/health":
		writeOK(w, h.store.Health())
	case r.Method == http.MethodPost && r.URL.Path == "/v1/flushdb":
		writeOK(w, map[string]int{"deleted": h.store.FlushDB()})
	case r.Method == http.MethodGet && r.URL.Path == "/v1/keys":
		h.handleKeys(w, r)
	case r.Method == http.MethodPost && r.URL.Path == "/v1/mget":
		h.handleMGet(w, r)
	case r.Method == http.MethodPost && r.URL.Path == "/v1/mset":
		h.handleMSet(w, r)
	case strings.HasPrefix(r.URL.Path, "/v1/kv/"):
		h.handleKV(w, r)
	default:
		writeErr(w, http.StatusBadRequest, DomainError{Code: "INVALID_COMMAND", Message: "unsupported route"})
	}
}

func (h *Handler) handleKV(w http.ResponseWriter, r *http.Request) {
	rest := strings.TrimPrefix(r.URL.Path, "/v1/kv/")
	parts := strings.Split(rest, "/")
	key := parts[0]
	if key == "" {
		writeErr(w, http.StatusBadRequest, DomainError{Code: ErrInvalidKey, Message: "key is required"})
		return
	}
	if len(parts) == 1 {
		switch r.Method {
		case http.MethodPut:
			var body struct {
				Value      any    `json:"value"`
				TTLSeconds *int64 `json:"ttlSeconds"`
			}
			if !decodeBody(w, r, &body) {
				return
			}
			ttl := int64(0)
			if body.TTLSeconds != nil {
				ttl = *body.TTLSeconds
			}
			expiresAt, err := h.store.Set(key, body.Value, ttl)
			if err != nil {
				writeDomainErr(w, err)
				return
			}
			writeOK(w, map[string]any{"key": key, "stored": true, "expiresAt": expiresAt})
		case http.MethodGet:
			entry, ok := h.store.Get(key)
			if !ok {
				writeErr(w, http.StatusNotFound, DomainError{Code: ErrKeyNotFound, Message: "key not found"})
				return
			}
			writeOK(w, entry)
		case http.MethodDelete:
			if err := h.store.validateKey(key); err != nil {
				writeDomainErr(w, err)
				return
			}
			writeOK(w, map[string]int{"deleted": h.store.Delete([]string{key})})
		default:
			writeErr(w, http.StatusMethodNotAllowed, DomainError{Code: "INVALID_COMMAND", Message: "unsupported method"})
		}
		return
	}
	if len(parts) == 2 && r.Method == http.MethodPost && parts[1] == "expire" {
		var body struct {
			TTLSeconds int64 `json:"ttlSeconds"`
		}
		if !decodeBody(w, r, &body) {
			return
		}
		updated, expiresAt, err := h.store.Expire(key, body.TTLSeconds)
		if err != nil {
			writeDomainErr(w, err)
			return
		}
		writeOK(w, map[string]any{"updated": updated, "ttlSeconds": body.TTLSeconds, "expiresAt": expiresAt})
		return
	}
	if len(parts) == 2 && r.Method == http.MethodGet && parts[1] == "ttl" {
		if err := h.store.validateKey(key); err != nil {
			writeDomainErr(w, err)
			return
		}
		writeOK(w, map[string]int64{"ttlSeconds": h.store.TTL(key)})
		return
	}
	if len(parts) == 2 && r.Method == http.MethodPost && parts[1] == "persist" {
		updated, err := h.store.Persist(key)
		if err != nil {
			writeDomainErr(w, err)
			return
		}
		writeOK(w, map[string]bool{"updated": updated})
		return
	}
	writeErr(w, http.StatusBadRequest, DomainError{Code: "INVALID_COMMAND", Message: "unsupported command"})
}

func (h *Handler) handleKeys(w http.ResponseWriter, r *http.Request) {
	prefix := r.URL.Query().Get("prefix")
	if len(prefix) > defaultMaxKeyBytes {
		writeErr(w, http.StatusBadRequest, DomainError{Code: ErrKeyTooLong, Message: "prefix is too long"})
		return
	}
	limit := 1000
	if raw := r.URL.Query().Get("limit"); raw != "" {
		parsed, err := strconv.Atoi(raw)
		if err != nil || parsed < 0 || parsed > 10_000 {
			writeErr(w, http.StatusBadRequest, DomainError{Code: ErrInvalidLimit, Message: "limit must be between 0 and 10000"})
			return
		}
		limit = parsed
	}
	keys := h.store.Keys(prefix, limit)
	writeOK(w, map[string]any{"keys": keys, "count": len(keys)})
}

func (h *Handler) handleMGet(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Keys []string `json:"keys"`
	}
	if !decodeBody(w, r, &body) {
		return
	}
	for _, key := range body.Keys {
		if err := h.store.validateKey(key); err != nil {
			writeDomainErr(w, err)
			return
		}
	}
	writeOK(w, map[string]any{"items": h.store.MGet(body.Keys)})
}

func (h *Handler) handleMSet(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Items      []Pair `json:"items"`
		TTLSeconds *int64 `json:"ttlSeconds"`
	}
	if !decodeBody(w, r, &body) {
		return
	}
	ttl := int64(0)
	if body.TTLSeconds != nil {
		ttl = *body.TTLSeconds
	}
	expiresAt, err := h.store.MSet(body.Items, ttl)
	if err != nil {
		writeDomainErr(w, err)
		return
	}
	writeOK(w, map[string]any{"stored": len(body.Items), "expiresAt": expiresAt})
}

func decodeBody(w http.ResponseWriter, r *http.Request, out any) bool {
	decoder := json.NewDecoder(r.Body)
	decoder.UseNumber()
	if err := decoder.Decode(out); err != nil {
		writeErr(w, http.StatusBadRequest, DomainError{Code: ErrInvalidJSON, Message: "request body must be valid JSON"})
		return false
	}
	return true
}

func writeOK(w http.ResponseWriter, data any) {
	_ = json.NewEncoder(w).Encode(map[string]any{"ok": true, "data": data})
}

func writeDomainErr(w http.ResponseWriter, err error) {
	var domainErr DomainError
	if !errors.As(err, &domainErr) {
		writeErr(w, http.StatusInternalServerError, DomainError{Code: "INTERNAL_ERROR", Message: "internal server error"})
		return
	}
	status := http.StatusBadRequest
	switch domainErr.Code {
	case ErrKeyNotFound:
		status = http.StatusNotFound
	case ErrValueTooLarge:
		status = http.StatusRequestEntityTooLarge
	case ErrStoreFull, ErrMemoryLimitExceeded:
		status = http.StatusInsufficientStorage
	}
	writeErr(w, status, domainErr)
}

func writeErr(w http.ResponseWriter, status int, err DomainError) {
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]any{"ok": false, "error": map[string]any{"code": err.Code, "message": err.Message, "details": map[string]any{}}})
}
