package broker

import (
	"encoding/json"
	"errors"
	"fmt"
	"sync"
	"time"
)

var (
	ErrTopicNotFound          = errors.New("topic not found")
	ErrTopicAlreadyExists     = errors.New("topic already exists")
	ErrInvalidTopicConfig     = errors.New("invalid topic config")
	ErrInvalidMessage         = errors.New("invalid message")
	ErrPartitionOutOfRange    = errors.New("partition out of range")
	ErrInvalidOffsetOrLimit   = errors.New("invalid offset or limit")
	ErrOffsetNoLongerRetained = errors.New("offset no longer retained")
	ErrInvalidConsumerGroup   = errors.New("invalid consumer group")
	ErrConsumerGroupConflict  = errors.New("consumer group conflict")
	ErrInvalidOffsetCommit    = errors.New("invalid offset commit")
	ErrOffsetOutOfRange       = errors.New("offset out of range")
)

type Message struct {
	Topic     string            `json:"topic"`
	Partition int               `json:"partition"`
	Offset    int64             `json:"offset"`
	Key       *string           `json:"key,omitempty"`
	Value     json.RawMessage   `json:"value"`
	Headers   map[string]string `json:"headers,omitempty"`
	Timestamp time.Time         `json:"timestamp"`
}

type TopicConfig struct {
	Name           string `json:"name"`
	Partitions     int    `json:"partitions"`
	RetentionMs    *int64 `json:"retentionMs,omitempty"`
	RetentionBytes *int64 `json:"retentionBytes,omitempty"`
	CleanupPolicy  string `json:"cleanupPolicy"`
}

type Topic struct {
	Config     TopicConfig
	CreatedAt  time.Time
	Partitions []*Partition
}

type Partition struct {
	TopicName       string
	ID              int
	Messages        []Message
	BeginningOffset int64
	NextOffset      int64
	mu              sync.RWMutex
}

type ConsumerGroup struct {
	GroupID    string
	TopicName  string
	Offsets    map[int]int64 // partition -> committed offset
	CreatedAt  time.Time
	UpdatedAt  time.Time
	mu         sync.RWMutex
}

type Broker struct {
	topics         map[string]*Topic
	consumerGroups map[string]*ConsumerGroup // key: groupId:topicName
	mu             sync.RWMutex
	maxMessageSize int64
	maxReadLimit   int
}

func NewBroker() *Broker {
	return &Broker{
		topics:         make(map[string]*Topic),
		consumerGroups: make(map[string]*ConsumerGroup),
		maxMessageSize: 1024 * 1024, // 1MB
		maxReadLimit:   1000,
	}
}

func (b *Broker) CreateTopic(config TopicConfig) (*Topic, error) {
	if config.Partitions <= 0 {
		return nil, fmt.Errorf("%w: partitions must be positive", ErrInvalidTopicConfig)
	}
	if config.Name == "" {
		return nil, fmt.Errorf("%w: name must be non-empty", ErrInvalidTopicConfig)
	}
	if config.CleanupPolicy == "" {
		config.CleanupPolicy = "delete"
	}

	b.mu.Lock()
	defer b.mu.Unlock()

	if existing, ok := b.topics[config.Name]; ok {
		if existing.Config.Partitions != config.Partitions {
			return nil, fmt.Errorf("%w: topic %s already exists with different config", ErrTopicAlreadyExists, config.Name)
		}
		return existing, nil
	}

	topic := &Topic{
		Config:    config,
		CreatedAt: time.Now().UTC(),
		Partitions: make([]*Partition, config.Partitions),
	}

	for i := 0; i < config.Partitions; i++ {
		topic.Partitions[i] = &Partition{
			TopicName:       config.Name,
			ID:              i,
			Messages:        make([]Message, 0),
			BeginningOffset: 0,
			NextOffset:      0,
		}
	}

	b.topics[config.Name] = topic
	return topic, nil
}

func (b *Broker) GetTopic(name string) (*Topic, error) {
	b.mu.RLock()
	defer b.mu.RUnlock()

	topic, ok := b.topics[name]
	if !ok {
		return nil, fmt.Errorf("%w: %s", ErrTopicNotFound, name)
	}
	return topic, nil
}

func (b *Broker) Produce(topicName string, key *string, value json.RawMessage, partition *int, headers map[string]string) (*Message, error) {
	if len(value) == 0 {
		return nil, fmt.Errorf("%w: value is empty", ErrInvalidMessage)
	}
	if int64(len(value)) > b.maxMessageSize {
		return nil, fmt.Errorf("%w: message too large", ErrInvalidMessage)
	}

	topic, err := b.GetTopic(topicName)
	if err != nil {
		return nil, err
	}

	var p *Partition
	if partition != nil {
		if *partition < 0 || *partition >= len(topic.Partitions) {
			return nil, fmt.Errorf("%w: %d", ErrPartitionOutOfRange, *partition)
		}
		p = topic.Partitions[*partition]
	} else if key != nil {
		p = topic.Partitions[hashKey(*key)%len(topic.Partitions)]
	} else {
		p = topic.Partitions[0]
	}

	p.mu.Lock()
	defer p.mu.Unlock()

	msg := Message{
		Topic:     topicName,
		Partition: p.ID,
		Offset:    p.NextOffset,
		Key:       key,
		Value:     value,
		Headers:   headers,
		Timestamp: time.Now().UTC(),
	}

	p.Messages = append(p.Messages, msg)
	p.NextOffset++

	b.enforceRetention(topic, p)

	return &msg, nil
}

func (b *Broker) ReadPartition(topicName string, partitionID int, offset int64, limit int) ([]Message, int64, int64, error) {
	if limit <= 0 || limit > b.maxReadLimit {
		return nil, 0, 0, fmt.Errorf("%w: limit %d", ErrInvalidOffsetOrLimit, limit)
	}
	if offset < 0 {
		return nil, 0, 0, fmt.Errorf("%w: offset %d", ErrInvalidOffsetOrLimit, offset)
	}

	topic, err := b.GetTopic(topicName)
	if err != nil {
		return nil, 0, 0, err
	}

	if partitionID < 0 || partitionID >= len(topic.Partitions) {
		return nil, 0, 0, fmt.Errorf("%w: partition %d", ErrPartitionOutOfRange, partitionID)
	}

	p := topic.Partitions[partitionID]
	p.mu.RLock()
	defer p.mu.RUnlock()

	if offset < p.BeginningOffset {
		return nil, 0, 0, fmt.Errorf("%w: offset %d, beginning %d", ErrOffsetNoLongerRetained, offset, p.BeginningOffset)
	}

	if offset >= p.NextOffset {
		return []Message{}, p.BeginningOffset, offset, nil
	}

	startIdx := int(offset - p.BeginningOffset)
	if startIdx < 0 {
		startIdx = 0
	}

	endIdx := startIdx + limit
	if endIdx > len(p.Messages) {
		endIdx = len(p.Messages)
	}

	result := make([]Message, endIdx-startIdx)
	copy(result, p.Messages[startIdx:endIdx])

	nextOffset := offset + int64(len(result))
	return result, p.BeginningOffset, nextOffset, nil
}

func (b *Broker) CreateConsumerGroup(groupID, topicName string, startFrom string) (*ConsumerGroup, error) {
	if groupID == "" {
		return nil, fmt.Errorf("%w: groupId is empty", ErrInvalidConsumerGroup)
	}

	topic, err := b.GetTopic(topicName)
	if err != nil {
		return nil, err
	}

	key := groupID + ":" + topicName

	b.mu.Lock()
	defer b.mu.Unlock()

	if existing, ok := b.consumerGroups[key]; ok {
		return existing, nil
	}

	cg := &ConsumerGroup{
		GroupID:   groupID,
		TopicName: topicName,
		Offsets:   make(map[int]int64),
		CreatedAt: time.Now().UTC(),
		UpdatedAt: time.Now().UTC(),
	}

	for _, p := range topic.Partitions {
		p.mu.RLock()
		switch startFrom {
		case "earliest":
			cg.Offsets[p.ID] = p.BeginningOffset
		case "latest", "":
			cg.Offsets[p.ID] = p.NextOffset
		default:
			p.mu.RUnlock()
			return nil, fmt.Errorf("%w: invalid startFrom %s", ErrInvalidConsumerGroup, startFrom)
		}
		p.mu.RUnlock()
	}

	b.consumerGroups[key] = cg
	return cg, nil
}

func (b *Broker) FetchMessages(groupID, topicName string, limit int) ([]Message, map[int]int64, error) {
	if limit <= 0 || limit > b.maxReadLimit {
		return nil, nil, fmt.Errorf("%w: limit %d", ErrInvalidOffsetOrLimit, limit)
	}

	key := groupID + ":" + topicName

	b.mu.RLock()
	cg, ok := b.consumerGroups[key]
	b.mu.RUnlock()

	if !ok {
		return nil, nil, fmt.Errorf("%w: group %s topic %s", ErrInvalidConsumerGroup, groupID, topicName)
	}

	topic, err := b.GetTopic(topicName)
	if err != nil {
		return nil, nil, err
	}

	cg.mu.RLock()
	offsets := make(map[int]int64, len(cg.Offsets))
	for k, v := range cg.Offsets {
		offsets[k] = v
	}
	cg.mu.RUnlock()

	var messages []Message
	nextOffsets := make(map[int]int64)

	perPartitionLimit := limit / len(topic.Partitions)
	if perPartitionLimit < 1 {
		perPartitionLimit = 1
	}

	for _, p := range topic.Partitions {
		offset, ok := offsets[p.ID]
		if !ok {
			offset = 0
		}

		p.mu.RLock()
		if offset < p.BeginningOffset {
			p.mu.RUnlock()
			return nil, nil, fmt.Errorf("%w: partition %d offset %d beginning %d", ErrOffsetNoLongerRetained, p.ID, offset, p.BeginningOffset)
		}
		p.mu.RUnlock()

		msgs, _, nextOffset, err := b.ReadPartition(topicName, p.ID, offset, perPartitionLimit)
		if err != nil {
			return nil, nil, err
		}

		messages = append(messages, msgs...)
		nextOffsets[p.ID] = nextOffset
	}

	return messages, nextOffsets, nil
}

func (b *Broker) CommitOffsets(groupID, topicName string, offsets map[int]int64) error {
	key := groupID + ":" + topicName

	b.mu.RLock()
	cg, ok := b.consumerGroups[key]
	b.mu.RUnlock()

	if !ok {
		return fmt.Errorf("%w: group %s topic %s", ErrInvalidConsumerGroup, groupID, topicName)
	}

	topic, err := b.GetTopic(topicName)
	if err != nil {
		return err
	}

	cg.mu.Lock()
	defer cg.mu.Unlock()

	for partitionID, offset := range offsets {
		if partitionID < 0 || partitionID >= len(topic.Partitions) {
			return fmt.Errorf("%w: partition %d", ErrPartitionOutOfRange, partitionID)
		}

		p := topic.Partitions[partitionID]
		p.mu.RLock()
		if offset < p.BeginningOffset {
			p.mu.RUnlock()
			return fmt.Errorf("%w: partition %d offset %d beginning %d", ErrOffsetNoLongerRetained, partitionID, offset, p.BeginningOffset)
		}
		if offset > p.NextOffset {
			p.mu.RUnlock()
			return fmt.Errorf("%w: partition %d offset %d next %d", ErrOffsetOutOfRange, partitionID, offset, p.NextOffset)
		}
		p.mu.RUnlock()

		if existing, ok := cg.Offsets[partitionID]; ok && offset < existing {
			return fmt.Errorf("%w: cannot commit older offset %d than current %d", ErrInvalidOffsetCommit, offset, existing)
		}

		cg.Offsets[partitionID] = offset
	}

	cg.UpdatedAt = time.Now().UTC()
	return nil
}

func (b *Broker) GetConsumerGroup(groupID, topicName string) (*ConsumerGroup, error) {
	key := groupID + ":" + topicName

	b.mu.RLock()
	defer b.mu.RUnlock()

	cg, ok := b.consumerGroups[key]
	if !ok {
		return nil, fmt.Errorf("%w: group %s topic %s", ErrInvalidConsumerGroup, groupID, topicName)
	}
	return cg, nil
}

func (b *Broker) enforceRetention(topic *Topic, p *Partition) {
	if topic.Config.RetentionMs == nil && topic.Config.RetentionBytes == nil {
		return
	}

	now := time.Now().UTC()
	var cutoff time.Time
	if topic.Config.RetentionMs != nil {
		cutoff = now.Add(-time.Duration(*topic.Config.RetentionMs) * time.Millisecond)
	}

	var totalBytes int64
	for _, msg := range p.Messages {
		totalBytes += int64(len(msg.Value))
	}

	for len(p.Messages) > 0 {
		msg := p.Messages[0]
		shouldDelete := false

		if topic.Config.RetentionMs != nil && msg.Timestamp.Before(cutoff) {
			shouldDelete = true
		}

		if topic.Config.RetentionBytes != nil && totalBytes > *topic.Config.RetentionBytes {
			shouldDelete = true
		}

		if !shouldDelete {
			break
		}

		totalBytes -= int64(len(msg.Value))
		p.Messages = p.Messages[1:]
		p.BeginningOffset = msg.Offset + 1
	}
}

func hashKey(key string) int {
	h := 0
	for i := 0; i < len(key); i++ {
		h = 31*h + int(key[i])
	}
	if h < 0 {
		h = -h
	}
	return h
}

func (b *Broker) ListTopics() []*Topic {
	b.mu.RLock()
	defer b.mu.RUnlock()

	result := make([]*Topic, 0, len(b.topics))
	for _, t := range b.topics {
		result = append(result, t)
	}
	return result
}

func (b *Broker) GetPartitionLag(topicName string, partitionID int, committedOffset int64) (int64, error) {
	topic, err := b.GetTopic(topicName)
	if err != nil {
		return 0, err
	}

	if partitionID < 0 || partitionID >= len(topic.Partitions) {
		return 0, fmt.Errorf("%w: partition %d", ErrPartitionOutOfRange, partitionID)
	}

	p := topic.Partitions[partitionID]
	p.mu.RLock()
	defer p.mu.RUnlock()

	lag := p.NextOffset - committedOffset
	if lag < 0 {
		lag = 0
	}
	return lag, nil
}
