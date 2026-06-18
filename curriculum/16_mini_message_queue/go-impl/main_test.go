package main

import (
	"bytes"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"mini-message-queue-go/broker"
)

func setupTestServer() (*Server, *http.ServeMux) {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	b := broker.NewBroker()
	server := NewServer(b, logger)
	mux := http.NewServeMux()
	server.RegisterRoutes(mux)
	return server, mux
}

func TestCreateTopicHandler(t *testing.T) {
	_, mux := setupTestServer()

	t.Run("create topic success", func(t *testing.T) {
		body := `{"name":"orders","partitions":3}`
		req := httptest.NewRequest(http.MethodPost, "/topics/", strings.NewReader(body))
		w := httptest.NewRecorder()
		mux.ServeHTTP(w, req)

		if w.Code != http.StatusCreated {
			t.Errorf("expected 201, got %d", w.Code)
		}

		var resp map[string]interface{}
		json.Unmarshal(w.Body.Bytes(), &resp)
		topic := resp["topic"].(map[string]interface{})
		if topic["name"] != "orders" {
			t.Errorf("expected orders, got %s", topic["name"])
		}
	})

	t.Run("create topic invalid config", func(t *testing.T) {
		body := `{"name":"test","partitions":0}`
		req := httptest.NewRequest(http.MethodPost, "/topics/", strings.NewReader(body))
		w := httptest.NewRecorder()
		mux.ServeHTTP(w, req)

		if w.Code != http.StatusBadRequest {
			t.Errorf("expected 400, got %d", w.Code)
		}
	})

	t.Run("create topic duplicate", func(t *testing.T) {
		body := `{"name":"orders","partitions":5}`
		req := httptest.NewRequest(http.MethodPost, "/topics/", strings.NewReader(body))
		w := httptest.NewRecorder()
		mux.ServeHTTP(w, req)

		if w.Code != http.StatusConflict {
			t.Errorf("expected 409, got %d", w.Code)
		}
	})
}

func TestProduceHandler(t *testing.T) {
	_, mux := setupTestServer()

	// Create topic first
	body := `{"name":"orders","partitions":3}`
	req := httptest.NewRequest(http.MethodPost, "/topics", strings.NewReader(body))
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	t.Run("produce success", func(t *testing.T) {
		body := `{"key":"customer-123","value":{"orderId":"o-1"},"partition":0}`
		req := httptest.NewRequest(http.MethodPost, "/topics/orders/messages", strings.NewReader(body))
		w := httptest.NewRecorder()
		mux.ServeHTTP(w, req)

		if w.Code != http.StatusCreated {
			t.Errorf("expected 201, got %d: %s", w.Code, w.Body.String())
		}

		var resp map[string]interface{}
		json.Unmarshal(w.Body.Bytes(), &resp)
		if resp["topic"] != "orders" {
			t.Errorf("expected orders, got %s", resp["topic"])
		}
	})

	t.Run("produce topic not found", func(t *testing.T) {
		body := `{"value":{"test":true}}`
		req := httptest.NewRequest(http.MethodPost, "/topics/nonexistent/messages", strings.NewReader(body))
		w := httptest.NewRecorder()
		mux.ServeHTTP(w, req)

		if w.Code != http.StatusNotFound {
			t.Errorf("expected 404, got %d", w.Code)
		}
	})

	t.Run("produce invalid partition", func(t *testing.T) {
		body := `{"value":{"test":true},"partition":99}`
		req := httptest.NewRequest(http.MethodPost, "/topics/orders/messages", strings.NewReader(body))
		w := httptest.NewRecorder()
		mux.ServeHTTP(w, req)

		if w.Code != http.StatusUnprocessableEntity {
			t.Errorf("expected 422, got %d", w.Code)
		}
	})
}

func TestReadPartitionHandler(t *testing.T) {
	_, mux := setupTestServer()

	// Create topic and produce messages
	body := `{"name":"orders","partitions":1}`
	req := httptest.NewRequest(http.MethodPost, "/topics", strings.NewReader(body))
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	for i := 0; i < 3; i++ {
		body := `{"value":{"n":` + string(rune('0'+i)) + `}}`
		req := httptest.NewRequest(http.MethodPost, "/topics/orders/messages", strings.NewReader(body))
		w := httptest.NewRecorder()
		mux.ServeHTTP(w, req)
	}

	t.Run("read success", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/topics/orders/partitions/0/messages?offset=0&limit=10", nil)
		w := httptest.NewRecorder()
		mux.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Errorf("expected 200, got %d", w.Code)
		}

		var resp map[string]interface{}
		json.Unmarshal(w.Body.Bytes(), &resp)
		messages := resp["messages"].([]interface{})
		if len(messages) != 3 {
			t.Errorf("expected 3 messages, got %d", len(messages))
		}
	})

	t.Run("read invalid offset", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/topics/orders/partitions/0/messages?offset=-1&limit=10", nil)
		w := httptest.NewRecorder()
		mux.ServeHTTP(w, req)

		if w.Code != http.StatusBadRequest {
			t.Errorf("expected 400, got %d", w.Code)
		}
	})
}

func TestConsumerGroupHandler(t *testing.T) {
	_, mux := setupTestServer()

	// Create topic and produce messages
	body := `{"name":"orders","partitions":2}`
	req := httptest.NewRequest(http.MethodPost, "/topics", strings.NewReader(body))
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	for i := 0; i < 3; i++ {
		body := `{"value":{"n":` + string(rune('0'+i)) + `},"partition":0}`
		req := httptest.NewRequest(http.MethodPost, "/topics/orders/messages", strings.NewReader(body))
		w := httptest.NewRecorder()
		mux.ServeHTTP(w, req)
	}

	t.Run("create consumer group", func(t *testing.T) {
		body := `{"groupId":"billing-service","topic":"orders","startFrom":"earliest"}`
		req := httptest.NewRequest(http.MethodPost, "/consumers", strings.NewReader(body))
		w := httptest.NewRecorder()
		mux.ServeHTTP(w, req)

		if w.Code != http.StatusCreated {
			t.Errorf("expected 201, got %d: %s", w.Code, w.Body.String())
		}

		var resp map[string]interface{}
		json.Unmarshal(w.Body.Bytes(), &resp)
		if resp["groupId"] != "billing-service" {
			t.Errorf("expected billing-service, got %s", resp["groupId"])
		}
	})

	t.Run("fetch messages", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/consumers/billing-service/topics/orders/messages?limit=10", nil)
		w := httptest.NewRecorder()
		mux.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
		}

		var resp map[string]interface{}
		json.Unmarshal(w.Body.Bytes(), &resp)
		messages := resp["messages"].([]interface{})
		if len(messages) != 3 {
			t.Errorf("expected 3 messages, got %d", len(messages))
		}
	})

	t.Run("commit offsets", func(t *testing.T) {
		body := `{"offsets":[{"partition":0,"offset":3}]}`
		req := httptest.NewRequest(http.MethodPost, "/consumers/billing-service/topics/orders/offsets", strings.NewReader(body))
		w := httptest.NewRecorder()
		mux.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
		}
	})

	t.Run("fetch after commit", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/consumers/billing-service/topics/orders/messages?limit=10", nil)
		w := httptest.NewRecorder()
		mux.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Errorf("expected 200, got %d", w.Code)
		}

		var resp map[string]interface{}
		json.Unmarshal(w.Body.Bytes(), &resp)
		messages := resp["messages"].([]interface{})
		if len(messages) != 0 {
			t.Errorf("expected 0 messages after commit, got %d", len(messages))
		}
	})
}

func TestInvalidMethod(t *testing.T) {
	_, mux := setupTestServer()

	t.Run("delete topic not allowed", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodDelete, "/topics/test", nil)
		w := httptest.NewRecorder()
		mux.ServeHTTP(w, req)

		if w.Code != http.StatusMethodNotAllowed {
			t.Errorf("expected 405, got %d", w.Code)
		}
	})

	t.Run("put consumers not allowed", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPut, "/consumers/group/topics/orders/offsets", nil)
		w := httptest.NewRecorder()
		mux.ServeHTTP(w, req)

		if w.Code != http.StatusMethodNotAllowed {
			t.Errorf("expected 405, got %d", w.Code)
		}
	})
}

func TestReadPartitionNotFound(t *testing.T) {
	_, mux := setupTestServer()

	req := httptest.NewRequest(http.MethodGet, "/topics/nonexistent/partitions/0/messages?offset=0&limit=10", nil)
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", w.Code)
	}
}

func TestFetchMessagesNotFound(t *testing.T) {
	_, mux := setupTestServer()

	req := httptest.NewRequest(http.MethodGet, "/consumers/nonexistent/topics/orders/messages?limit=10", nil)
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", w.Code)
	}
}

func TestCommitOffsetsInvalid(t *testing.T) {
	_, mux := setupTestServer()

	body := `{"name":"orders","partitions":1}`
	req := httptest.NewRequest(http.MethodPost, "/topics/", strings.NewReader(body))
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	body = `{"groupId":"group-1","topic":"orders","startFrom":"earliest"}`
	req = httptest.NewRequest(http.MethodPost, "/consumers/", strings.NewReader(body))
	w = httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	body = `{"offsets":[{"partition":99,"offset":0}]}`
	req = httptest.NewRequest(http.MethodPost, "/consumers/group-1/topics/orders/offsets", strings.NewReader(body))
	w = httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusUnprocessableEntity {
		t.Errorf("expected 422, got %d", w.Code)
	}
}

func TestProduceInvalidJSON(t *testing.T) {
	_, mux := setupTestServer()

	body := `{"name":"orders","partitions":1}`
	req := httptest.NewRequest(http.MethodPost, "/topics/", strings.NewReader(body))
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	body = `invalid json`
	req = httptest.NewRequest(http.MethodPost, "/topics/orders/messages", strings.NewReader(body))
	w = httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestCreateTopicInvalidJSON(t *testing.T) {
	_, mux := setupTestServer()

	body := `invalid json`
	req := httptest.NewRequest(http.MethodPost, "/topics/", strings.NewReader(body))
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestCreateConsumerGroupInvalidJSON(t *testing.T) {
	_, mux := setupTestServer()

	body := `invalid json`
	req := httptest.NewRequest(http.MethodPost, "/consumers/", strings.NewReader(body))
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestCommitOffsetsInvalidJSON(t *testing.T) {
	_, mux := setupTestServer()

	body := `{"name":"orders","partitions":1}`
	req := httptest.NewRequest(http.MethodPost, "/topics/", strings.NewReader(body))
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	body = `invalid json`
	req = httptest.NewRequest(http.MethodPost, "/consumers/group/topics/orders/offsets", strings.NewReader(body))
	w = httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestReadPartitionInvalidPartition(t *testing.T) {
	_, mux := setupTestServer()

	body := `{"name":"orders","partitions":1}`
	req := httptest.NewRequest(http.MethodPost, "/topics/", strings.NewReader(body))
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	req = httptest.NewRequest(http.MethodGet, "/topics/orders/partitions/abc/messages?offset=0&limit=10", nil)
	w = httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestReadPartitionInvalidURL(t *testing.T) {
	_, mux := setupTestServer()

	req := httptest.NewRequest(http.MethodGet, "/topics/orders/partitions", nil)
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestProduceInvalidURL(t *testing.T) {
	_, mux := setupTestServer()

	req := httptest.NewRequest(http.MethodPost, "/topics/", strings.NewReader(`{"value":{}}`))
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func BenchmarkProduceHandler(b *testing.B) {
	_, mux := setupTestServer()

	body := `{"name":"bench","partitions":1}`
	req := httptest.NewRequest(http.MethodPost, "/topics/", strings.NewReader(body))
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	payload := []byte(`{"value":{"data":"benchmark"},"partition":0}`)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		req := httptest.NewRequest(http.MethodPost, "/topics/bench/messages", bytes.NewReader(payload))
		w := httptest.NewRecorder()
		mux.ServeHTTP(w, req)
		if w.Code != http.StatusCreated {
			b.Fatalf("unexpected status: %d", w.Code)
		}
	}
}
