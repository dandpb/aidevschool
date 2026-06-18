package taskqueue

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"
)

func (q *Queue) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})
	mux.HandleFunc("/stats", func(w http.ResponseWriter, r *http.Request) { writeJSON(w, http.StatusOK, q.Stats()) })
	mux.HandleFunc("/tasks", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.NotFound(w, r)
			return
		}
		var req EnqueueRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid_json")
			return
		}
		task, err := q.Enqueue(r.Context(), req)
		if err != nil {
			writeQueueError(w, err)
			return
		}
		status := http.StatusCreated
		if req.IdempotencyKey != "" && task.CreatedAt.Before(q.clock.Now()) {
			status = http.StatusOK
		}
		writeJSON(w, status, task)
	})
	mux.HandleFunc("/tasks/", func(w http.ResponseWriter, r *http.Request) {
		id := strings.TrimPrefix(r.URL.Path, "/tasks/")
		switch r.Method {
		case http.MethodGet:
			task, err := q.Get(id)
			if err != nil {
				writeQueueError(w, err)
				return
			}
			writeJSON(w, http.StatusOK, task)
		case http.MethodDelete:
			task, err := q.Cancel(id)
			if err != nil {
				writeQueueError(w, err)
				return
			}
			writeJSON(w, http.StatusOK, task)
		default:
			http.NotFound(w, r)
		}
	})
	return mux
}

func writeQueueError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, ErrInvalidPayload):
		writeError(w, http.StatusBadRequest, err.Error())
	case errors.Is(err, ErrQueueFull):
		writeError(w, http.StatusTooManyRequests, err.Error())
	case errors.Is(err, ErrShuttingDown):
		writeError(w, http.StatusServiceUnavailable, err.Error())
	case errors.Is(err, ErrNotFound):
		writeError(w, http.StatusNotFound, err.Error())
	case errors.Is(err, ErrTerminalTask):
		writeError(w, http.StatusConflict, err.Error())
	default:
		writeError(w, http.StatusInternalServerError, "internal_error")
	}
}

func writeError(w http.ResponseWriter, status int, code string) {
	writeJSON(w, status, map[string]string{"error": code})
}
func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}
