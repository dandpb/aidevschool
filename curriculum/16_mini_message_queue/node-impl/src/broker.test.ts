import { Broker, BrokerError } from './broker';

describe('Broker', () => {
  let broker: Broker;

  beforeEach(() => {
    broker = new Broker();
  });

  describe('createTopic', () => {
    it('should create a valid topic', () => {
      const topic = broker.createTopic({ name: 'orders', partitions: 3, cleanupPolicy: 'delete' });
      expect(topic.config.name).toBe('orders');
      expect(topic.partitions.length).toBe(3);
    });

    it('should reject duplicate topic with different config', () => {
      broker.createTopic({ name: 'orders', partitions: 3, cleanupPolicy: 'delete' });
      expect(() => {
        broker.createTopic({ name: 'orders', partitions: 5, cleanupPolicy: 'delete' });
      }).toThrow(BrokerError);
    });

    it('should allow idempotent create', () => {
      broker.createTopic({ name: 'orders', partitions: 3, cleanupPolicy: 'delete' });
      const topic = broker.createTopic({ name: 'orders', partitions: 3, cleanupPolicy: 'delete' });
      expect(topic.partitions.length).toBe(3);
    });

    it('should reject zero partitions', () => {
      expect(() => {
        broker.createTopic({ name: 'test', partitions: 0, cleanupPolicy: 'delete' });
      }).toThrow(BrokerError);
    });

    it('should reject negative partitions', () => {
      expect(() => {
        broker.createTopic({ name: 'test2', partitions: -1, cleanupPolicy: 'delete' });
      }).toThrow(BrokerError);
    });

    it('should reject empty name', () => {
      expect(() => {
        broker.createTopic({ name: '', partitions: 1, cleanupPolicy: 'delete' });
      }).toThrow(BrokerError);
    });
  });

  describe('produce', () => {
    beforeEach(() => {
      broker.createTopic({ name: 'orders', partitions: 3, cleanupPolicy: 'delete' });
    });

    it('should produce with explicit partition', () => {
      const msg = broker.produce('orders', undefined, { orderId: 'o-1' }, 1, undefined);
      expect(msg.partition).toBe(1);
      expect(msg.offset).toBe(0);
    });

    it('should produce with key', () => {
      const msg = broker.produce('orders', 'customer-123', { orderId: 'o-2' }, undefined, undefined);
      expect(msg.key).toBe('customer-123');
    });

    it('should produce without partition or key', () => {
      const msg = broker.produce('orders', undefined, { orderId: 'o-3' }, undefined, undefined);
      expect(msg.partition).toBe(0);
    });

    it('should reject nonexistent topic', () => {
      expect(() => {
        broker.produce('nonexistent', undefined, { test: true }, undefined, undefined);
      }).toThrow(BrokerError);
    });

    it('should reject out of range partition', () => {
      expect(() => {
        broker.produce('orders', undefined, { test: true }, 99, undefined);
      }).toThrow(BrokerError);
    });

    it('should reject empty value', () => {
      expect(() => {
        broker.produce('orders', undefined, null as unknown as object, undefined, undefined);
      }).toThrow(BrokerError);
    });

    it('should assign monotonic offsets', () => {
      for (let i = 0; i < 5; i++) {
        const msg = broker.produce('orders', undefined, { n: i }, 0, undefined);
        expect(msg.offset).toBe(i);
      }
    });
  });

  describe('readPartition', () => {
    beforeEach(() => {
      broker.createTopic({ name: 'orders', partitions: 1, cleanupPolicy: 'delete' });
      for (let i = 0; i < 5; i++) {
        broker.produce('orders', undefined, { n: i }, 0, undefined);
      }
    });

    it('should read from beginning', () => {
      const { messages, beginningOffset, nextOffset } = broker.readPartition('orders', 0, 0, 10);
      expect(messages.length).toBe(5);
      expect(beginningOffset).toBe(0);
      expect(nextOffset).toBe(5);
    });

    it('should read with limit', () => {
      const { messages, nextOffset } = broker.readPartition('orders', 0, 0, 2);
      expect(messages.length).toBe(2);
      expect(nextOffset).toBe(2);
    });

    it('should read from middle', () => {
      const { messages, nextOffset } = broker.readPartition('orders', 0, 2, 10);
      expect(messages.length).toBe(3);
      expect(nextOffset).toBe(5);
    });

    it('should return empty at end', () => {
      const { messages, nextOffset } = broker.readPartition('orders', 0, 5, 10);
      expect(messages.length).toBe(0);
      expect(nextOffset).toBe(5);
    });

    it('should reject invalid limit', () => {
      expect(() => {
        broker.readPartition('orders', 0, 0, 0);
      }).toThrow(BrokerError);
    });

    it('should reject invalid offset', () => {
      expect(() => {
        broker.readPartition('orders', 0, -1, 10);
      }).toThrow(BrokerError);
    });
  });

  describe('consumerGroup', () => {
    beforeEach(() => {
      broker.createTopic({ name: 'orders', partitions: 3, cleanupPolicy: 'delete' });
      for (let i = 0; i < 3; i++) {
        broker.produce('orders', undefined, { n: i }, 0, undefined);
      }
    });

    it('should create consumer group earliest', () => {
      const cg = broker.createConsumerGroup('group-1', 'orders', 'earliest');
      expect(cg.groupId).toBe('group-1');
      expect(cg.offsets.size).toBe(3);
      expect(cg.offsets.get(0)).toBe(0);
    });

    it('should create consumer group latest', () => {
      const cg = broker.createConsumerGroup('group-2', 'orders', 'latest');
      expect(cg.offsets.get(0)).toBe(3);
    });

    it('should fetch messages without commit', () => {
      broker.createConsumerGroup('group-1', 'orders', 'earliest');
      const { messages, nextOffsets } = broker.fetchMessages('group-1', 'orders', 10);
      expect(messages.length).toBe(3);
      expect(nextOffsets.get(0)).toBe(3);

      const { messages: messages2 } = broker.fetchMessages('group-1', 'orders', 10);
      expect(messages2.length).toBe(3);
    });

    it('should commit offsets', () => {
      broker.createConsumerGroup('group-1', 'orders', 'earliest');
      const offsets = new Map([[0, 3]]);
      broker.commitOffsets('group-1', 'orders', offsets);

      const { messages } = broker.fetchMessages('group-1', 'orders', 10);
      expect(messages.length).toBe(0);
    });

    it('should reject committing older offset', () => {
      broker.createConsumerGroup('group-1', 'orders', 'earliest');
      const offsets = new Map([[0, 3]]);
      broker.commitOffsets('group-1', 'orders', offsets);

      const olderOffsets = new Map([[0, 1]]);
      expect(() => {
        broker.commitOffsets('group-1', 'orders', olderOffsets);
      }).toThrow(BrokerError);
    });

    it('should reject committing out of range', () => {
      broker.createConsumerGroup('group-1', 'orders', 'earliest');
      const offsets = new Map([[0, 100]]);
      expect(() => {
        broker.commitOffsets('group-1', 'orders', offsets);
      }).toThrow(BrokerError);
    });
  });

  describe('retention', () => {
    it('should expire old messages', (done) => {
      broker.createTopic({ name: 'orders', partitions: 1, retentionMs: 100, cleanupPolicy: 'delete' });
      for (let i = 0; i < 5; i++) {
        broker.produce('orders', undefined, { n: i }, 0, undefined);
      }

      setTimeout(() => {
        broker.produce('orders', undefined, { n: 5 }, 0, undefined);

        expect(() => {
          broker.readPartition('orders', 0, 0, 10);
        }).toThrow(BrokerError);

        done();
      }, 150);
    });
  });

  describe('concurrent produce', () => {
    it('should handle concurrent produces', async () => {
      broker.createTopic({ name: 'orders', partitions: 1, cleanupPolicy: 'delete' });

      const promises: Promise<void>[] = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          new Promise<void>((resolve) => {
            for (let j = 0; j < 100; j++) {
              broker.produce('orders', undefined, { g: i, j }, 0, undefined);
            }
            resolve();
          })
        );
      }

      await Promise.all(promises);

      const topic = broker.getTopic('orders');
      expect(topic.partitions[0].nextOffset).toBe(1000);
      expect(topic.partitions[0].messages.length).toBe(1000);
    });
  });

  describe('messageOrder', () => {
    it('should preserve message order', () => {
      broker.createTopic({ name: 'orders', partitions: 1, cleanupPolicy: 'delete' });
      for (let i = 0; i < 10; i++) {
        broker.produce('orders', undefined, { order: String.fromCharCode(97 + i) }, 0, undefined);
      }

      const { messages } = broker.readPartition('orders', 0, 0, 10);
      for (let i = 0; i < messages.length; i++) {
        expect(messages[i].offset).toBe(i);
      }
    });
  });
});
