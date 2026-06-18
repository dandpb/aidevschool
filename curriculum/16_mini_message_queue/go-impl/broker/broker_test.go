package broker

import (
	"encoding/json"
	"errors"
	"sync"
	"testing"
	"time"
)

func TestCreateTopic(t *testing.T) {
	b := NewBroker()

	t.Run("valid topic", func(t *testing.T) {
		config := TopicConfig{
			Name:       "orders",
			Partitions: 3,
		}
		topic, err := b.CreateTopic(config)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if topic.Config.Name != "orders" {
			t.Errorf("expected name orders, got %s", topic.Config.Name)
		}
		if len(topic.Partitions) != 3 {
			t.Errorf("expected 3 partitions, got %d", len(topic.Partitions))
		}
	})

	t.Run("duplicate topic same config", func(t *testing.T) {
		config := TopicConfig{
			Name:       "orders",
			Partitions: 3,
		}
		topic, err := b.CreateTopic(config)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(topic.Partitions) != 3 {
			t.Errorf("expected 3 partitions, got %d", len(topic.Partitions))
		}
	})

	t.Run("duplicate topic different config", func(t *testing.T) {
		config := TopicConfig{
			Name:       "orders",
			Partitions: 5,
		}
		_, err := b.CreateTopic(config)
		if !errors.Is(err, ErrTopicAlreadyExists) {
			t.Errorf("expected ErrTopicAlreadyExists, got %v", err)
		}
	})

	t.Run("zero partitions", func(t *testing.T) {
		config := TopicConfig{
			Name:       "test",
			Partitions: 0,
		}
		_, err := b.CreateTopic(config)
		if !errors.Is(err, ErrInvalidTopicConfig) {
			t.Errorf("expected ErrInvalidTopicConfig, got %v", err)
		}
	})

	t.Run("negative partitions", func(t *testing.T) {
		config := TopicConfig{
			Name:       "test2",
			Partitions: -1,
		}
		_, err := b.CreateTopic(config)
		if !errors.Is(err, ErrInvalidTopicConfig) {
			t.Errorf("expected ErrInvalidTopicConfig, got %v", err)
		}
	})

	t.Run("empty name", func(t *testing.T) {
		config := TopicConfig{
			Name:       "",
			Partitions: 1,
		}
		_, err := b.CreateTopic(config)
		if !errors.Is(err, ErrInvalidTopicConfig) {
			t.Errorf("expected ErrInvalidTopicConfig, got %v", err)
		}
	})
}

func TestProduce(t *testing.T) {
	b := NewBroker()
	_, err := b.CreateTopic(TopicConfig{Name: "orders", Partitions: 3})
	if err != nil {
		t.Fatalf("failed to create topic: %v", err)
	}

	t.Run("produce with explicit partition", func(t *testing.T) {
		partition := 1
		value := json.RawMessage(`{"orderId":"o-1"}`)
		msg, err := b.Produce("orders", nil, value, &partition, nil)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if msg.Partition != 1 {
			t.Errorf("expected partition 1, got %d", msg.Partition)
		}
		if msg.Offset != 0 {
			t.Errorf("expected offset 0, got %d", msg.Offset)
		}
	})

	t.Run("produce with key", func(t *testing.T) {
		key := "customer-123"
		value := json.RawMessage(`{"orderId":"o-2"}`)
		msg, err := b.Produce("orders", &key, value, nil, nil)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		expectedPartition := hashKey(key) % 3
		if msg.Partition != expectedPartition {
			t.Errorf("expected partition %d, got %d", expectedPartition, msg.Partition)
		}
	})

	t.Run("produce without partition or key", func(t *testing.T) {
		value := json.RawMessage(`{"orderId":"o-3"}`)
		msg, err := b.Produce("orders", nil, value, nil, nil)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if msg.Partition != 0 {
			t.Errorf("expected partition 0, got %d", msg.Partition)
		}
	})

	t.Run("produce to nonexistent topic", func(t *testing.T) {
		value := json.RawMessage(`{"orderId":"o-4"}`)
		_, err := b.Produce("nonexistent", nil, value, nil, nil)
		if !errors.Is(err, ErrTopicNotFound) {
			t.Errorf("expected ErrTopicNotFound, got %v", err)
		}
	})

	t.Run("produce to out of range partition", func(t *testing.T) {
		partition := 99
		value := json.RawMessage(`{"orderId":"o-5"}`)
		_, err := b.Produce("orders", nil, value, &partition, nil)
		if !errors.Is(err, ErrPartitionOutOfRange) {
			t.Errorf("expected ErrPartitionOutOfRange, got %v", err)
		}
	})

	t.Run("produce empty value", func(t *testing.T) {
		value := json.RawMessage(``)
		_, err := b.Produce("orders", nil, value, nil, nil)
		if !errors.Is(err, ErrInvalidMessage) {
			t.Errorf("expected ErrInvalidMessage, got %v", err)
		}
	})

	t.Run("monotonic offsets", func(t *testing.T) {
		partition := 0
		for i := 0; i < 5; i++ {
			value := json.RawMessage(`{"n":` + string(rune('0'+i)) + `}`)
			msg, err := b.Produce("orders", nil, value, &partition, nil)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if msg.Offset != int64(i+2) { // +2 because we already produced 2 messages to partition 0
				t.Errorf("expected offset %d, got %d", i+2, msg.Offset)
			}
		}
	})
}

func TestReadPartition(t *testing.T) {
	b := NewBroker()
	_, err := b.CreateTopic(TopicConfig{Name: "orders", Partitions: 1})
	if err != nil {
		t.Fatalf("failed to create topic: %v", err)
	}

	// Produce some messages
	partition := 0
	for i := 0; i < 5; i++ {
		value := json.RawMessage(`{"n":` + string(rune('0'+i)) + `}`)
		_, err := b.Produce("orders", nil, value, &partition, nil)
		if err != nil {
			t.Fatalf("failed to produce: %v", err)
		}
	}

	t.Run("read from beginning", func(t *testing.T) {
		msgs, beginningOffset, nextOffset, err := b.ReadPartition("orders", 0, 0, 10)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(msgs) != 5 {
			t.Errorf("expected 5 messages, got %d", len(msgs))
		}
		if beginningOffset != 0 {
			t.Errorf("expected beginningOffset 0, got %d", beginningOffset)
		}
		if nextOffset != 5 {
			t.Errorf("expected nextOffset 5, got %d", nextOffset)
		}
	})

	t.Run("read with limit", func(t *testing.T) {
		msgs, _, nextOffset, err := b.ReadPartition("orders", 0, 0, 2)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(msgs) != 2 {
			t.Errorf("expected 2 messages, got %d", len(msgs))
		}
		if nextOffset != 2 {
			t.Errorf("expected nextOffset 2, got %d", nextOffset)
		}
	})

	t.Run("read from middle", func(t *testing.T) {
		msgs, _, nextOffset, err := b.ReadPartition("orders", 0, 2, 10)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(msgs) != 3 {
			t.Errorf("expected 3 messages, got %d", len(msgs))
		}
		if nextOffset != 5 {
			t.Errorf("expected nextOffset 5, got %d", nextOffset)
		}
	})

	t.Run("read at end", func(t *testing.T) {
		msgs, _, nextOffset, err := b.ReadPartition("orders", 0, 5, 10)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(msgs) != 0 {
			t.Errorf("expected 0 messages, got %d", len(msgs))
		}
		if nextOffset != 5 {
			t.Errorf("expected nextOffset 5, got %d", nextOffset)
		}
	})

	t.Run("read beyond end", func(t *testing.T) {
		msgs, _, nextOffset, err := b.ReadPartition("orders", 0, 100, 10)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(msgs) != 0 {
			t.Errorf("expected 0 messages, got %d", len(msgs))
		}
		if nextOffset != 100 {
			t.Errorf("expected nextOffset 100, got %d", nextOffset)
		}
	})

	t.Run("invalid limit", func(t *testing.T) {
		_, _, _, err := b.ReadPartition("orders", 0, 0, 0)
		if !errors.Is(err, ErrInvalidOffsetOrLimit) {
			t.Errorf("expected ErrInvalidOffsetOrLimit, got %v", err)
		}
	})

	t.Run("invalid offset", func(t *testing.T) {
		_, _, _, err := b.ReadPartition("orders", 0, -1, 10)
		if !errors.Is(err, ErrInvalidOffsetOrLimit) {
			t.Errorf("expected ErrInvalidOffsetOrLimit, got %v", err)
		}
	})
}

func TestConsumerGroup(t *testing.T) {
	b := NewBroker()
	_, err := b.CreateTopic(TopicConfig{Name: "orders", Partitions: 3})
	if err != nil {
		t.Fatalf("failed to create topic: %v", err)
	}

	// Produce some messages
	partition := 0
	for i := 0; i < 3; i++ {
		value := json.RawMessage(`{"n":` + string(rune('0'+i)) + `}`)
		_, err := b.Produce("orders", nil, value, &partition, nil)
		if err != nil {
			t.Fatalf("failed to produce: %v", err)
		}
	}

	t.Run("create consumer group earliest", func(t *testing.T) {
		cg, err := b.CreateConsumerGroup("group-1", "orders", "earliest")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if cg.GroupID != "group-1" {
			t.Errorf("expected group-1, got %s", cg.GroupID)
		}
		if len(cg.Offsets) != 3 {
			t.Errorf("expected 3 offsets, got %d", len(cg.Offsets))
		}
		if cg.Offsets[0] != 0 {
			t.Errorf("expected offset 0 for partition 0, got %d", cg.Offsets[0])
		}
	})

	t.Run("create consumer group latest", func(t *testing.T) {
		cg, err := b.CreateConsumerGroup("group-2", "orders", "latest")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if cg.Offsets[0] != 3 {
			t.Errorf("expected offset 3 for partition 0, got %d", cg.Offsets[0])
		}
	})

	t.Run("fetch messages without commit", func(t *testing.T) {
		msgs, nextOffsets, err := b.FetchMessages("group-1", "orders", 10)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(msgs) != 3 {
			t.Errorf("expected 3 messages, got %d", len(msgs))
		}
		if nextOffsets[0] != 3 {
			t.Errorf("expected nextOffset 3, got %d", nextOffsets[0])
		}

		// Fetch again - should get same messages (at-least-once)
		msgs2, _, err := b.FetchMessages("group-1", "orders", 10)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(msgs2) != 3 {
			t.Errorf("expected 3 messages on redelivery, got %d", len(msgs2))
		}
	})

	t.Run("commit offsets", func(t *testing.T) {
		err := b.CommitOffsets("group-1", "orders", map[int]int64{0: 3})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		// Now fetch should return empty
		msgs, _, err := b.FetchMessages("group-1", "orders", 10)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(msgs) != 0 {
			t.Errorf("expected 0 messages after commit, got %d", len(msgs))
		}
	})

	t.Run("commit older offset", func(t *testing.T) {
		err := b.CommitOffsets("group-1", "orders", map[int]int64{0: 1})
		if !errors.Is(err, ErrInvalidOffsetCommit) {
			t.Errorf("expected ErrInvalidOffsetCommit, got %v", err)
		}
	})

	t.Run("commit out of range", func(t *testing.T) {
		err := b.CommitOffsets("group-1", "orders", map[int]int64{0: 100})
		if !errors.Is(err, ErrOffsetOutOfRange) {
			t.Errorf("expected ErrOffsetOutOfRange, got %v", err)
		}
	})
}

func TestRetention(t *testing.T) {
	b := NewBroker()
	retentionMs := int64(500)
	_, err := b.CreateTopic(TopicConfig{
		Name:        "orders",
		Partitions:  1,
		RetentionMs: &retentionMs,
	})
	if err != nil {
		t.Fatalf("failed to create topic: %v", err)
	}

	partition := 0
	for i := 0; i < 5; i++ {
		value := json.RawMessage(`{"n":` + string(rune('0'+i)) + `}`)
		_, err := b.Produce("orders", nil, value, &partition, nil)
		if err != nil {
			t.Fatalf("failed to produce: %v", err)
		}
	}

	t.Run("messages retained initially", func(t *testing.T) {
		msgs, beginningOffset, _, err := b.ReadPartition("orders", 0, 0, 10)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(msgs) != 5 {
			t.Errorf("expected 5 messages, got %d", len(msgs))
		}
		if beginningOffset != 0 {
			t.Errorf("expected beginningOffset 0, got %d", beginningOffset)
		}
	})

	t.Run("messages expired after retention", func(t *testing.T) {
		time.Sleep(600 * time.Millisecond)
		// Produce another message to trigger retention
		value := json.RawMessage(`{"n":5}`)
		_, err := b.Produce("orders", nil, value, &partition, nil)
		if err != nil {
			t.Fatalf("failed to produce: %v", err)
		}

		topic, _ := b.GetTopic("orders")
		p := topic.Partitions[0]
		p.mu.RLock()
		beginOffset := p.BeginningOffset
		p.mu.RUnlock()

		msgs, beginningOffset, _, err := b.ReadPartition("orders", 0, beginOffset, 10)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(msgs) >= 5 {
			t.Errorf("expected fewer than 5 messages after retention, got %d", len(msgs))
		}
		if beginningOffset <= 0 {
			t.Errorf("expected beginningOffset > 0 after retention, got %d", beginningOffset)
		}
	})

	t.Run("read expired offset", func(t *testing.T) {
		_, _, _, err := b.ReadPartition("orders", 0, 0, 10)
		if !errors.Is(err, ErrOffsetNoLongerRetained) {
			t.Errorf("expected ErrOffsetNoLongerRetained, got %v", err)
		}
	})
}

func TestConcurrentProduce(t *testing.T) {
	b := NewBroker()
	_, err := b.CreateTopic(TopicConfig{Name: "orders", Partitions: 1})
	if err != nil {
		t.Fatalf("failed to create topic: %v", err)
	}

	partition := 0
	var wg sync.WaitGroup
	numGoroutines := 10
	messagesPerGoroutine := 100

	for i := 0; i < numGoroutines; i++ {
		wg.Add(1)
		go func(id int) {
			defer wg.Done()
			for j := 0; j < messagesPerGoroutine; j++ {
				value := json.RawMessage(`{"g":` + string(rune('0'+id)) + `}`)
				_, err := b.Produce("orders", nil, value, &partition, nil)
				if err != nil {
					t.Errorf("failed to produce: %v", err)
				}
			}
		}(i)
	}

	wg.Wait()

	topic, _ := b.GetTopic("orders")
	p := topic.Partitions[0]
	p.mu.RLock()
	expectedOffset := int64(numGoroutines * messagesPerGoroutine)
	if p.NextOffset != expectedOffset {
		t.Errorf("expected nextOffset %d, got %d", expectedOffset, p.NextOffset)
	}
	if len(p.Messages) != int(expectedOffset) {
		t.Errorf("expected %d messages, got %d", expectedOffset, len(p.Messages))
	}
	p.mu.RUnlock()
}

func TestMessageOrder(t *testing.T) {
	b := NewBroker()
	_, err := b.CreateTopic(TopicConfig{Name: "orders", Partitions: 1})
	if err != nil {
		t.Fatalf("failed to create topic: %v", err)
	}

	partition := 0
	for i := 0; i < 10; i++ {
		value := json.RawMessage(`{"order":"` + string(rune('a'+i)) + `"}`)
		_, err := b.Produce("orders", nil, value, &partition, nil)
		if err != nil {
			t.Fatalf("failed to produce: %v", err)
		}
	}

	msgs, _, _, err := b.ReadPartition("orders", 0, 0, 10)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	for i, msg := range msgs {
		if msg.Offset != int64(i) {
			t.Errorf("expected offset %d, got %d", i, msg.Offset)
		}
	}
}

func TestGetTopic(t *testing.T) {
	b := NewBroker()
	_, err := b.CreateTopic(TopicConfig{Name: "orders", Partitions: 1})
	if err != nil {
		t.Fatalf("failed to create topic: %v", err)
	}

	t.Run("existing topic", func(t *testing.T) {
		topic, err := b.GetTopic("orders")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if topic.Config.Name != "orders" {
			t.Errorf("expected orders, got %s", topic.Config.Name)
		}
	})

	t.Run("nonexistent topic", func(t *testing.T) {
		_, err := b.GetTopic("nonexistent")
		if !errors.Is(err, ErrTopicNotFound) {
			t.Errorf("expected ErrTopicNotFound, got %v", err)
		}
	})
}

func TestListTopics(t *testing.T) {
	b := NewBroker()

	t.Run("empty list", func(t *testing.T) {
		topics := b.ListTopics()
		if len(topics) != 0 {
			t.Errorf("expected 0 topics, got %d", len(topics))
		}
	})

	t.Run("multiple topics", func(t *testing.T) {
		b.CreateTopic(TopicConfig{Name: "topic1", Partitions: 1})
		b.CreateTopic(TopicConfig{Name: "topic2", Partitions: 2})

		topics := b.ListTopics()
		if len(topics) != 2 {
			t.Errorf("expected 2 topics, got %d", len(topics))
		}
	})
}

func TestGetPartitionLag(t *testing.T) {
	b := NewBroker()
	_, err := b.CreateTopic(TopicConfig{Name: "orders", Partitions: 2})
	if err != nil {
		t.Fatalf("failed to create topic: %v", err)
	}

	partition := 0
	for i := 0; i < 5; i++ {
		value := json.RawMessage(`{"n":` + string(rune('0'+i)) + `}`)
		_, err := b.Produce("orders", nil, value, &partition, nil)
		if err != nil {
			t.Fatalf("failed to produce: %v", err)
		}
	}

	t.Run("valid lag", func(t *testing.T) {
		lag, err := b.GetPartitionLag("orders", 0, 0)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if lag != 5 {
			t.Errorf("expected lag 5, got %d", lag)
		}
	})

	t.Run("committed at end", func(t *testing.T) {
		lag, err := b.GetPartitionLag("orders", 0, 5)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if lag != 0 {
			t.Errorf("expected lag 0, got %d", lag)
		}
	})

	t.Run("nonexistent topic", func(t *testing.T) {
		_, err := b.GetPartitionLag("nonexistent", 0, 0)
		if !errors.Is(err, ErrTopicNotFound) {
			t.Errorf("expected ErrTopicNotFound, got %v", err)
		}
	})

	t.Run("invalid partition", func(t *testing.T) {
		_, err := b.GetPartitionLag("orders", 99, 0)
		if !errors.Is(err, ErrPartitionOutOfRange) {
			t.Errorf("expected ErrPartitionOutOfRange, got %v", err)
		}
	})
}

func TestConsumerGroupOffsetRetention(t *testing.T) {
	b := NewBroker()
	retentionMs := int64(500)
	_, err := b.CreateTopic(TopicConfig{
		Name:        "orders",
		Partitions:  1,
		RetentionMs: &retentionMs,
	})
	if err != nil {
		t.Fatalf("failed to create topic: %v", err)
	}

	partition := 0
	for i := 0; i < 5; i++ {
		value := json.RawMessage(`{"n":` + string(rune('0'+i)) + `}`)
		_, err := b.Produce("orders", nil, value, &partition, nil)
		if err != nil {
			t.Fatalf("failed to produce: %v", err)
		}
	}

	cg, err := b.CreateConsumerGroup("group-1", "orders", "earliest")
	if err != nil {
		t.Fatalf("failed to create consumer group: %v", err)
	}

	err = b.CommitOffsets("group-1", "orders", map[int]int64{0: 3})
	if err != nil {
		t.Fatalf("failed to commit: %v", err)
	}

	time.Sleep(600 * time.Millisecond)

	value := json.RawMessage(`{"n":5}`)
	_, err = b.Produce("orders", nil, value, &partition, nil)
	if err != nil {
		t.Fatalf("failed to produce: %v", err)
	}

	_, _, err = b.FetchMessages("group-1", "orders", 10)
	if !errors.Is(err, ErrOffsetNoLongerRetained) {
		t.Errorf("expected ErrOffsetNoLongerRetained, got %v", err)
	}

	topic, _ := b.GetTopic("orders")
	p := topic.Partitions[0]
	p.mu.RLock()
	beginOffset := p.BeginningOffset
	p.mu.RUnlock()

	if beginOffset <= cg.Offsets[0] {
		t.Errorf("expected beginningOffset > committedOffset after retention")
	}
}

func TestConsumerGroupStartFromInvalid(t *testing.T) {
	b := NewBroker()
	_, err := b.CreateTopic(TopicConfig{Name: "orders", Partitions: 1})
	if err != nil {
		t.Fatalf("failed to create topic: %v", err)
	}

	_, err = b.CreateConsumerGroup("group-1", "orders", "invalid")
	if !errors.Is(err, ErrInvalidConsumerGroup) {
		t.Errorf("expected ErrInvalidConsumerGroup, got %v", err)
	}
}

func TestCommitOffsetsInvalidPartition(t *testing.T) {
	b := NewBroker()
	_, err := b.CreateTopic(TopicConfig{Name: "orders", Partitions: 1})
	if err != nil {
		t.Fatalf("failed to create topic: %v", err)
	}

	_, err = b.CreateConsumerGroup("group-1", "orders", "earliest")
	if err != nil {
		t.Fatalf("failed to create consumer group: %v", err)
	}

	err = b.CommitOffsets("group-1", "orders", map[int]int64{99: 0})
	if !errors.Is(err, ErrPartitionOutOfRange) {
		t.Errorf("expected ErrPartitionOutOfRange, got %v", err)
	}
}

func TestFetchMessagesInvalidLimit(t *testing.T) {
	b := NewBroker()
	_, err := b.CreateTopic(TopicConfig{Name: "orders", Partitions: 1})
	if err != nil {
		t.Fatalf("failed to create topic: %v", err)
	}

	_, err = b.CreateConsumerGroup("group-1", "orders", "earliest")
	if err != nil {
		t.Fatalf("failed to create consumer group: %v", err)
	}

	_, _, err = b.FetchMessages("group-1", "orders", 0)
	if !errors.Is(err, ErrInvalidOffsetOrLimit) {
		t.Errorf("expected ErrInvalidOffsetOrLimit, got %v", err)
	}

	_, _, err = b.FetchMessages("group-1", "orders", 10000)
	if !errors.Is(err, ErrInvalidOffsetOrLimit) {
		t.Errorf("expected ErrInvalidOffsetOrLimit, got %v", err)
	}
}

func TestGetConsumerGroup(t *testing.T) {
	b := NewBroker()
	_, err := b.CreateTopic(TopicConfig{Name: "orders", Partitions: 1})
	if err != nil {
		t.Fatalf("failed to create topic: %v", err)
	}

	_, err = b.CreateConsumerGroup("group-1", "orders", "earliest")
	if err != nil {
		t.Fatalf("failed to create consumer group: %v", err)
	}

	t.Run("existing group", func(t *testing.T) {
		cg, err := b.GetConsumerGroup("group-1", "orders")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if cg.GroupID != "group-1" {
			t.Errorf("expected group-1, got %s", cg.GroupID)
		}
	})

	t.Run("nonexistent group", func(t *testing.T) {
		_, err := b.GetConsumerGroup("nonexistent", "orders")
		if !errors.Is(err, ErrInvalidConsumerGroup) {
			t.Errorf("expected ErrInvalidConsumerGroup, got %v", err)
		}
	})
}

func TestProduceWithHeaders(t *testing.T) {
	b := NewBroker()
	_, err := b.CreateTopic(TopicConfig{Name: "orders", Partitions: 1})
	if err != nil {
		t.Fatalf("failed to create topic: %v", err)
	}

	headers := map[string]string{"traceId": "abc"}
	partition := 0
	msg, err := b.Produce("orders", nil, json.RawMessage(`{"test":true}`), &partition, headers)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if msg.Headers["traceId"] != "abc" {
		t.Errorf("expected traceId abc, got %s", msg.Headers["traceId"])
	}
}

func TestRetentionBytes(t *testing.T) {
	b := NewBroker()
	retentionBytes := int64(50)
	_, err := b.CreateTopic(TopicConfig{
		Name:           "orders",
		Partitions:     1,
		RetentionBytes: &retentionBytes,
	})
	if err != nil {
		t.Fatalf("failed to create topic: %v", err)
	}

	partition := 0
	for i := 0; i < 10; i++ {
		value := json.RawMessage(`{"data":"this is a test message with some length"}`)
		_, err := b.Produce("orders", nil, value, &partition, nil)
		if err != nil {
			t.Fatalf("failed to produce: %v", err)
		}
	}

	topic, _ := b.GetTopic("orders")
	p := topic.Partitions[0]
	p.mu.RLock()
	if p.BeginningOffset == 0 {
		t.Errorf("expected beginningOffset > 0 after byte retention")
	}
	if len(p.Messages) == 10 {
		t.Errorf("expected fewer than 10 messages after byte retention, got %d", len(p.Messages))
	}
	p.mu.RUnlock()
}

func BenchmarkProduce(b *testing.B) {
	broker := NewBroker()
	_, err := broker.CreateTopic(TopicConfig{Name: "bench", Partitions: 1})
	if err != nil {
		b.Fatalf("failed to create topic: %v", err)
	}

	partition := 0
	value := json.RawMessage(`{"data":"benchmark"}`)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := broker.Produce("bench", nil, value, &partition, nil)
		if err != nil {
			b.Fatalf("failed to produce: %v", err)
		}
	}
}
