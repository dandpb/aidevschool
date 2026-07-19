export interface Message {
  topic: string;
  partition: number;
  offset: number;
  key?: string;
  value: unknown;
  headers?: Record<string, string>;
  timestamp: string;
}

export interface TopicConfig {
  name: string;
  partitions: number;
  retentionMs?: number;
  retentionBytes?: number;
  cleanupPolicy: string;
}

export interface Topic {
  config: TopicConfig;
  createdAt: string;
  partitions: Partition[];
}

export interface Partition {
  topicName: string;
  id: number;
  messages: Message[];
  beginningOffset: number;
  nextOffset: number;
}

export interface ConsumerGroup {
  groupId: string;
  topicName: string;
  offsets: Map<number, number>;
  createdAt: string;
  updatedAt: string;
}

export class BrokerError extends Error {
  constructor(
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'BrokerError';
  }
}

export class Broker {
  private topics = new Map<string, Topic>();
  private consumerGroups = new Map<string, ConsumerGroup>();
  private maxMessageSize = 1024 * 1024;
  private maxReadLimit = 1000;

  createTopic(config: TopicConfig): Topic {
    if (config.partitions <= 0) {
      throw new BrokerError('invalid_topic_config', 'partitions must be positive');
    }
    if (!config.name) {
      throw new BrokerError('invalid_topic_config', 'name must be non-empty');
    }
    if (!config.cleanupPolicy) {
      config.cleanupPolicy = 'delete';
    }

    const existing = this.topics.get(config.name);
    if (existing) {
      if (existing.config.partitions !== config.partitions) {
        throw new BrokerError('topic_already_exists', `topic ${config.name} already exists with different config`);
      }
      return existing;
    }

    const topic: Topic = {
      config,
      createdAt: new Date().toISOString(),
      partitions: [],
    };

    for (let i = 0; i < config.partitions; i++) {
      topic.partitions.push({
        topicName: config.name,
        id: i,
        messages: [],
        beginningOffset: 0,
        nextOffset: 0,
      });
    }

    this.topics.set(config.name, topic);
    return topic;
  }

  getTopic(name: string): Topic {
    const topic = this.topics.get(name);
    if (!topic) {
      throw new BrokerError('topic_not_found', `topic ${name} not found`);
    }
    return topic;
  }

  produce(
    topicName: string,
    key: string | undefined,
    value: unknown,
    partition: number | undefined,
    headers: Record<string, string> | undefined
  ): Message {
    if (value === undefined || value === null) {
      throw new BrokerError('invalid_message', 'value is empty');
    }

    const valueStr = JSON.stringify(value);
    if (valueStr.length > this.maxMessageSize) {
      throw new BrokerError('invalid_message', 'message too large');
    }

    const topic = this.getTopic(topicName);

    let p: Partition;
    if (partition !== undefined) {
      if (partition < 0 || partition >= topic.partitions.length) {
        throw new BrokerError('partition_out_of_range', `partition ${partition} out of range`);
      }
      p = topic.partitions[partition];
    } else if (key) {
      p = topic.partitions[this.hashKey(key) % topic.partitions.length];
    } else {
      p = topic.partitions[0];
    }

    const msg: Message = {
      topic: topicName,
      partition: p.id,
      offset: p.nextOffset,
      key,
      value,
      headers,
      timestamp: new Date().toISOString(),
    };

    p.messages.push(msg);
    p.nextOffset++;

    this.enforceRetention(topic, p);

    return msg;
  }

  readPartition(
    topicName: string,
    partitionId: number,
    offset: number,
    limit: number
  ): { messages: Message[]; beginningOffset: number; nextOffset: number } {
    if (limit <= 0 || limit > this.maxReadLimit) {
      throw new BrokerError('invalid_offset_or_limit', `limit ${limit}`);
    }
    if (offset < 0) {
      throw new BrokerError('invalid_offset_or_limit', `offset ${offset}`);
    }

    const topic = this.getTopic(topicName);

    if (partitionId < 0 || partitionId >= topic.partitions.length) {
      throw new BrokerError('partition_out_of_range', `partition ${partitionId} out of range`);
    }

    const p = topic.partitions[partitionId];

    if (offset < p.beginningOffset) {
      throw new BrokerError('offset_no_longer_retained', `offset ${offset}, beginning ${p.beginningOffset}`);
    }

    if (offset >= p.nextOffset) {
      return { messages: [], beginningOffset: p.beginningOffset, nextOffset: offset };
    }

    const startIdx = offset - p.beginningOffset;
    if (startIdx < 0) {
      return { messages: [], beginningOffset: p.beginningOffset, nextOffset: p.beginningOffset };
    }

    const endIdx = Math.min(startIdx + limit, p.messages.length);
    const result = p.messages.slice(startIdx, endIdx);

    return {
      messages: result,
      beginningOffset: p.beginningOffset,
      nextOffset: offset + result.length,
    };
  }

  createConsumerGroup(groupId: string, topicName: string, startFrom: string): ConsumerGroup {
    if (!groupId) {
      throw new BrokerError('invalid_consumer_group', 'groupId is empty');
    }

    const topic = this.getTopic(topicName);
    const key = `${groupId}:${topicName}`;

    const existing = this.consumerGroups.get(key);
    if (existing) {
      return existing;
    }

    const offsets = new Map<number, number>();
    for (const p of topic.partitions) {
      switch (startFrom) {
        case 'earliest':
          offsets.set(p.id, p.beginningOffset);
          break;
        case 'latest':
        case '':
          offsets.set(p.id, p.nextOffset);
          break;
        default:
          throw new BrokerError('invalid_consumer_group', `invalid startFrom ${startFrom}`);
      }
    }

    const cg: ConsumerGroup = {
      groupId,
      topicName,
      offsets,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.consumerGroups.set(key, cg);
    return cg;
  }

  fetchMessages(
    groupId: string,
    topicName: string,
    limit: number
  ): { messages: Message[]; nextOffsets: Map<number, number> } {
    if (limit <= 0 || limit > this.maxReadLimit) {
      throw new BrokerError('invalid_offset_or_limit', `limit ${limit}`);
    }

    const key = `${groupId}:${topicName}`;
    const cg = this.consumerGroups.get(key);
    if (!cg) {
      throw new BrokerError('invalid_consumer_group', `group ${groupId} topic ${topicName}`);
    }

    const topic = this.getTopic(topicName);
    const offsets = new Map(cg.offsets);

    const messages: Message[] = [];
    const nextOffsets = new Map<number, number>();

    const perPartitionLimit = Math.max(1, Math.floor(limit / topic.partitions.length));

    for (const p of topic.partitions) {
      const offset = offsets.get(p.id) ?? 0;

      if (offset < p.beginningOffset) {
        throw new BrokerError('offset_no_longer_retained', `partition ${p.id} offset ${offset} beginning ${p.beginningOffset}`);
      }

      const { messages: msgs, nextOffset } = this.readPartition(topicName, p.id, offset, perPartitionLimit);

      messages.push(...msgs);
      nextOffsets.set(p.id, nextOffset);
    }

    return { messages, nextOffsets };
  }

  commitOffsets(groupId: string, topicName: string, offsets: Map<number, number>): void {
    const key = `${groupId}:${topicName}`;
    const cg = this.consumerGroups.get(key);
    if (!cg) {
      throw new BrokerError('invalid_consumer_group', `group ${groupId} topic ${topicName}`);
    }

    const topic = this.getTopic(topicName);

    for (const [partitionId, offset] of offsets) {
      if (partitionId < 0 || partitionId >= topic.partitions.length) {
        throw new BrokerError('partition_out_of_range', `partition ${partitionId}`);
      }

      const p = topic.partitions[partitionId];
      if (offset < p.beginningOffset) {
        throw new BrokerError('offset_no_longer_retained', `partition ${partitionId} offset ${offset} beginning ${p.beginningOffset}`);
      }
      if (offset > p.nextOffset) {
        throw new BrokerError('offset_out_of_range', `partition ${partitionId} offset ${offset} next ${p.nextOffset}`);
      }

      const existing = cg.offsets.get(partitionId);
      if (existing !== undefined && offset < existing) {
        throw new BrokerError('invalid_offset_commit', `cannot commit older offset ${offset} than current ${existing}`);
      }

      cg.offsets.set(partitionId, offset);
    }

    cg.updatedAt = new Date().toISOString();
  }

  getConsumerGroup(groupId: string, topicName: string): ConsumerGroup {
    const key = `${groupId}:${topicName}`;
    const cg = this.consumerGroups.get(key);
    if (!cg) {
      throw new BrokerError('invalid_consumer_group', `group ${groupId} topic ${topicName}`);
    }
    return cg;
  }

  listTopics(): Topic[] {
    return Array.from(this.topics.values());
  }

  getPartitionLag(topicName: string, partitionId: number, committedOffset: number): number {
    const topic = this.getTopic(topicName);

    if (partitionId < 0 || partitionId >= topic.partitions.length) {
      throw new BrokerError('partition_out_of_range', `partition ${partitionId}`);
    }

    const p = topic.partitions[partitionId];
    return Math.max(0, p.nextOffset - committedOffset);
  }

  private enforceRetention(topic: Topic, p: Partition): void {
    if (topic.config.retentionMs === undefined && topic.config.retentionBytes === undefined) {
      return;
    }

    const now = new Date();
    const cutoff = topic.config.retentionMs !== undefined
      ? new Date(now.getTime() - topic.config.retentionMs)
      : null;

    let totalBytes = p.messages.reduce((sum, msg) => {
      return sum + JSON.stringify(msg.value).length;
    }, 0);

    while (p.messages.length > 0) {
      const msg = p.messages[0];
      let shouldDelete = false;

      if (cutoff && new Date(msg.timestamp) < cutoff) {
        shouldDelete = true;
      }

      if (topic.config.retentionBytes !== undefined && totalBytes > topic.config.retentionBytes) {
        shouldDelete = true;
      }

      if (!shouldDelete) {
        break;
      }

      totalBytes -= JSON.stringify(msg.value).length;
      p.messages.shift();
      p.beginningOffset = msg.offset + 1;
    }
  }

  private hashKey(key: string): number {
    let h = 0;
    for (let i = 0; i < key.length; i++) {
      h = ((h << 5) - h + key.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
  }
}
