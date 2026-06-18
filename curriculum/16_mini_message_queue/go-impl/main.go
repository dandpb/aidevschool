package main

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"mini-message-queue-go/broker"
)

type Server struct {
	broker *broker.Broker
	logger *slog.Logger
}

func NewServer(b *broker.Broker, logger *slog.Logger) *Server {
	return &Server{broker: b, logger: logger}
}

func (s *Server) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("/topics", s.handleTopics)
	mux.HandleFunc("/topics/", s.handleTopics)
	mux.HandleFunc("/consumers", s.handleConsumers)
	mux.HandleFunc("/consumers/", s.handleConsumers)
}

func (s *Server) handleTopics(w http.ResponseWriter, r *http.Request) {
	path := strings.Trim(r.URL.Path, "/")
	parts := strings.Split(path, "/")

	if len(parts) == 1 && parts[0] == "topics" {
		if r.Method == http.MethodPost {
			s.handleCreateTopic(w, r)
			return
		}
		s.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Method not allowed")
		return
	}

	if len(parts) >= 2 && parts[0] == "topics" {
		switch r.Method {
		case http.MethodPost:
			s.handleProduce(w, r)
		case http.MethodGet:
			s.handleReadPartition(w, r)
		default:
			s.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Method not allowed")
		}
		return
	}

	s.writeError(w, http.StatusNotFound, "not_found", "Not found")
}

func (s *Server) handleConsumers(w http.ResponseWriter, r *http.Request) {
	path := strings.Trim(r.URL.Path, "/")
	parts := strings.Split(path, "/")

	if len(parts) == 1 && parts[0] == "consumers" {
		if r.Method == http.MethodPost {
			s.handleCreateConsumerGroup(w, r)
			return
		}
		s.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Method not allowed")
		return
	}

	if len(parts) >= 2 && parts[0] == "consumers" {
		switch r.Method {
		case http.MethodGet:
			s.handleFetchMessages(w, r)
		case http.MethodPost:
			s.handleCommitOffsets(w, r)
		default:
			s.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Method not allowed")
		}
		return
	}

	s.writeError(w, http.StatusNotFound, "not_found", "Not found")
}

func (s *Server) handleCreateTopic(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Name           string `json:"name"`
		Partitions     int    `json:"partitions"`
		RetentionMs    *int64 `json:"retentionMs,omitempty"`
		RetentionBytes *int64 `json:"retentionBytes,omitempty"`
		CleanupPolicy  string `json:"cleanupPolicy"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.writeError(w, http.StatusBadRequest, "invalid_request", "Invalid JSON body")
		return
	}

	config := broker.TopicConfig{
		Name:           req.Name,
		Partitions:     req.Partitions,
		RetentionMs:    req.RetentionMs,
		RetentionBytes: req.RetentionBytes,
		CleanupPolicy:  req.CleanupPolicy,
	}

	topic, err := s.broker.CreateTopic(config)
	if err != nil {
		if errors.Is(err, broker.ErrInvalidTopicConfig) {
			s.writeError(w, http.StatusBadRequest, "invalid_topic_config", err.Error())
			return
		}
		if errors.Is(err, broker.ErrTopicAlreadyExists) {
			s.writeError(w, http.StatusConflict, "topic_already_exists", err.Error())
			return
		}
		s.writeError(w, http.StatusInternalServerError, "internal_error", err.Error())
		return
	}

	s.writeJSON(w, http.StatusCreated, map[string]interface{}{
		"topic": map[string]interface{}{
			"name":           topic.Config.Name,
			"partitions":     len(topic.Partitions),
			"retentionMs":    topic.Config.RetentionMs,
			"retentionBytes": topic.Config.RetentionBytes,
			"cleanupPolicy":  topic.Config.CleanupPolicy,
		},
	})
}

func (s *Server) handleProduce(w http.ResponseWriter, r *http.Request) {
	parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(parts) < 3 || parts[0] != "topics" {
		s.writeError(w, http.StatusBadRequest, "invalid_url", "Invalid URL")
		return
	}
	topicName := parts[1]

	var req struct {
		Key       *string           `json:"key,omitempty"`
		Value     json.RawMessage   `json:"value"`
		Partition *int              `json:"partition,omitempty"`
		Headers   map[string]string `json:"headers,omitempty"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.writeError(w, http.StatusBadRequest, "invalid_message", "Invalid JSON body")
		return
	}

	msg, err := s.broker.Produce(topicName, req.Key, req.Value, req.Partition, req.Headers)
	if err != nil {
		if errors.Is(err, broker.ErrTopicNotFound) {
			s.writeError(w, http.StatusNotFound, "topic_not_found", err.Error())
			return
		}
		if errors.Is(err, broker.ErrPartitionOutOfRange) {
			s.writeError(w, http.StatusUnprocessableEntity, "partition_out_of_range", err.Error())
			return
		}
		if errors.Is(err, broker.ErrInvalidMessage) {
			s.writeError(w, http.StatusBadRequest, "invalid_message", err.Error())
			return
		}
		s.writeError(w, http.StatusInternalServerError, "internal_error", err.Error())
		return
	}

	s.writeJSON(w, http.StatusCreated, map[string]interface{}{
		"topic":     msg.Topic,
		"partition": msg.Partition,
		"offset":    msg.Offset,
		"timestamp": msg.Timestamp.Format(time.RFC3339Nano),
	})
}

func (s *Server) handleReadPartition(w http.ResponseWriter, r *http.Request) {
	parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(parts) < 5 || parts[0] != "topics" || parts[2] != "partitions" || parts[4] != "messages" {
		s.writeError(w, http.StatusBadRequest, "invalid_url", "Invalid URL format")
		return
	}
	topicName := parts[1]

	partitionID, err := strconv.Atoi(parts[3])
	if err != nil {
		s.writeError(w, http.StatusBadRequest, "invalid_partition", "Invalid partition ID")
		return
	}

	offsetStr := r.URL.Query().Get("offset")
	limitStr := r.URL.Query().Get("limit")

	offset, _ := strconv.ParseInt(offsetStr, 10, 64)
	limit, _ := strconv.Atoi(limitStr)
	if limit <= 0 {
		limit = 100
	}

	msgs, beginningOffset, nextOffset, err := s.broker.ReadPartition(topicName, partitionID, offset, limit)
	if err != nil {
		if errors.Is(err, broker.ErrTopicNotFound) || errors.Is(err, broker.ErrPartitionOutOfRange) {
			s.writeError(w, http.StatusNotFound, "topic_or_partition_not_found", err.Error())
			return
		}
		if errors.Is(err, broker.ErrInvalidOffsetOrLimit) {
			s.writeError(w, http.StatusBadRequest, "invalid_offset_or_limit", err.Error())
			return
		}
		if errors.Is(err, broker.ErrOffsetNoLongerRetained) {
			s.writeError(w, http.StatusGone, "offset_no_longer_retained", err.Error())
			return
		}
		s.writeError(w, http.StatusInternalServerError, "internal_error", err.Error())
		return
	}

	responseMsgs := make([]map[string]interface{}, len(msgs))
	for i, msg := range msgs {
		responseMsgs[i] = map[string]interface{}{
			"offset":    msg.Offset,
			"key":       msg.Key,
			"value":     msg.Value,
			"headers":   msg.Headers,
			"timestamp": msg.Timestamp.Format(time.RFC3339Nano),
		}
	}

	s.writeJSON(w, http.StatusOK, map[string]interface{}{
		"topic":           topicName,
		"partition":       partitionID,
		"beginningOffset": beginningOffset,
		"nextOffset":      nextOffset,
		"messages":        responseMsgs,
	})
}

func (s *Server) handleCreateConsumerGroup(w http.ResponseWriter, r *http.Request) {
	var req struct {
		GroupID   string `json:"groupId"`
		Topic     string `json:"topic"`
		StartFrom string `json:"startFrom"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.writeError(w, http.StatusBadRequest, "invalid_consumer_group", "Invalid JSON body")
		return
	}

	cg, err := s.broker.CreateConsumerGroup(req.GroupID, req.Topic, req.StartFrom)
	if err != nil {
		if errors.Is(err, broker.ErrTopicNotFound) {
			s.writeError(w, http.StatusNotFound, "topic_not_found", err.Error())
			return
		}
		if errors.Is(err, broker.ErrInvalidConsumerGroup) {
			s.writeError(w, http.StatusBadRequest, "invalid_consumer_group", err.Error())
			return
		}
		s.writeError(w, http.StatusInternalServerError, "internal_error", err.Error())
		return
	}

	offsets := make([]map[string]interface{}, 0, len(cg.Offsets))
	for partition, offset := range cg.Offsets {
		lag, _ := s.broker.GetPartitionLag(req.Topic, partition, offset)
		offsets = append(offsets, map[string]interface{}{
			"partition":       partition,
			"committedOffset": offset,
			"lag":             lag,
		})
	}

	s.writeJSON(w, http.StatusCreated, map[string]interface{}{
		"groupId": req.GroupID,
		"topic":   req.Topic,
		"offsets": offsets,
	})
}

func (s *Server) handleFetchMessages(w http.ResponseWriter, r *http.Request) {
	parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(parts) < 5 || parts[0] != "consumers" || parts[2] != "topics" || parts[4] != "messages" {
		s.writeError(w, http.StatusBadRequest, "invalid_url", "Invalid URL")
		return
	}
	groupID := parts[1]
	topicName := parts[3]

	limitStr := r.URL.Query().Get("limit")
	limit, _ := strconv.Atoi(limitStr)
	if limit <= 0 {
		limit = 100
	}

	msgs, nextOffsets, err := s.broker.FetchMessages(groupID, topicName, limit)
	if err != nil {
		if errors.Is(err, broker.ErrInvalidConsumerGroup) {
			s.writeError(w, http.StatusNotFound, "consumer_group_or_topic_not_found", err.Error())
			return
		}
		if errors.Is(err, broker.ErrOffsetNoLongerRetained) {
			s.writeError(w, http.StatusGone, "committed_offset_no_longer_retained", err.Error())
			return
		}
		s.writeError(w, http.StatusInternalServerError, "internal_error", err.Error())
		return
	}

	responseMsgs := make([]map[string]interface{}, len(msgs))
	for i, msg := range msgs {
		responseMsgs[i] = map[string]interface{}{
			"partition": msg.Partition,
			"offset":    msg.Offset,
			"key":       msg.Key,
			"value":     msg.Value,
			"headers":   msg.Headers,
			"timestamp": msg.Timestamp.Format(time.RFC3339Nano),
		}
	}

	nextOffsetsList := make([]map[string]interface{}, 0, len(nextOffsets))
	for partition, offset := range nextOffsets {
		nextOffsetsList = append(nextOffsetsList, map[string]interface{}{
			"partition": partition,
			"nextOffset": offset,
		})
	}

	s.writeJSON(w, http.StatusOK, map[string]interface{}{
		"groupId":     groupID,
		"topic":       topicName,
		"messages":    responseMsgs,
		"nextOffsets": nextOffsetsList,
	})
}

func (s *Server) handleCommitOffsets(w http.ResponseWriter, r *http.Request) {
	parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(parts) < 5 || parts[0] != "consumers" || parts[2] != "topics" || parts[4] != "offsets" {
		s.writeError(w, http.StatusBadRequest, "invalid_url", "Invalid URL")
		return
	}
	groupID := parts[1]
	topicName := parts[3]

	var req struct {
		Offsets []struct {
			Partition int   `json:"partition"`
			Offset    int64 `json:"offset"`
		} `json:"offsets"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.writeError(w, http.StatusBadRequest, "invalid_offset_commit", "Invalid JSON body")
		return
	}

	offsets := make(map[int]int64)
	for _, o := range req.Offsets {
		offsets[o.Partition] = o.Offset
	}

	err := s.broker.CommitOffsets(groupID, topicName, offsets)
	if err != nil {
		if errors.Is(err, broker.ErrInvalidConsumerGroup) {
			s.writeError(w, http.StatusNotFound, "consumer_group_or_topic_not_found", err.Error())
			return
		}
		if errors.Is(err, broker.ErrInvalidOffsetCommit) {
			s.writeError(w, http.StatusBadRequest, "invalid_offset_commit", err.Error())
			return
		}
		if errors.Is(err, broker.ErrOffsetNoLongerRetained) {
			s.writeError(w, http.StatusGone, "offset_no_longer_retained", err.Error())
			return
		}
		if errors.Is(err, broker.ErrPartitionOutOfRange) {
			s.writeError(w, http.StatusUnprocessableEntity, "partition_out_of_range", err.Error())
			return
		}
		if errors.Is(err, broker.ErrOffsetOutOfRange) {
			s.writeError(w, http.StatusUnprocessableEntity, "offset_out_of_range", err.Error())
			return
		}
		s.writeError(w, http.StatusInternalServerError, "internal_error", err.Error())
		return
	}

	cg, _ := s.broker.GetConsumerGroup(groupID, topicName)
	offsetsResponse := make([]map[string]interface{}, 0, len(cg.Offsets))
	for partition, offset := range cg.Offsets {
		lag, _ := s.broker.GetPartitionLag(topicName, partition, offset)
		offsetsResponse = append(offsetsResponse, map[string]interface{}{
			"partition":       partition,
			"committedOffset": offset,
			"lag":             lag,
		})
	}

	s.writeJSON(w, http.StatusOK, map[string]interface{}{
		"groupId": groupID,
		"topic":   topicName,
		"offsets": offsetsResponse,
	})
}

func (s *Server) writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func (s *Server) writeError(w http.ResponseWriter, status int, code, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"code":    code,
		"message": message,
	})
}

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))

	b := broker.NewBroker()
	server := NewServer(b, logger)

	mux := http.NewServeMux()
	server.RegisterRoutes(mux)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	srv := &http.Server{
		Addr:         ":" + port,
		Handler:      mux,
		ReadTimeout:  5 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	logger.Info("starting server", "addr", srv.Addr)
	if err := srv.ListenAndServe(); err != nil {
		logger.Error("server failed", "error", err)
		os.Exit(1)
	}
}
