import express, { Request, Response, NextFunction } from 'express';
import { Broker, BrokerError, TopicConfig } from './broker';

const app = express();
app.use(express.json());

const broker = new Broker();

function handleBrokerError(err: BrokerError, res: Response) {
  const statusMap: Record<string, number> = {
    topic_not_found: 404,
    topic_already_exists: 409,
    invalid_topic_config: 400,
    invalid_message: 400,
    partition_out_of_range: 422,
    invalid_offset_or_limit: 400,
    offset_no_longer_retained: 410,
    invalid_consumer_group: 400,
    consumer_group_conflict: 409,
    invalid_offset_commit: 400,
    offset_out_of_range: 422,
  };

  const status = statusMap[err.code] || 500;
  res.status(status).json({
    code: err.code,
    message: err.message,
  });
}

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

app.post('/topics', asyncHandler(async (req, res) => {
  try {
    const config: TopicConfig = {
      name: req.body.name,
      partitions: req.body.partitions,
      retentionMs: req.body.retentionMs,
      retentionBytes: req.body.retentionBytes,
      cleanupPolicy: req.body.cleanupPolicy || 'delete',
    };

    const topic = broker.createTopic(config);

    res.status(201).json({
      topic: {
        name: topic.config.name,
        partitions: topic.partitions.length,
        retentionMs: topic.config.retentionMs,
        retentionBytes: topic.config.retentionBytes,
        cleanupPolicy: topic.config.cleanupPolicy,
      },
    });
  } catch (err) {
    if (err instanceof BrokerError) {
      handleBrokerError(err, res);
    } else {
      throw err;
    }
  }
}));

app.post('/topics/:topic/messages', asyncHandler(async (req, res) => {
  try {
    const msg = broker.produce(
      req.params.topic,
      req.body.key,
      req.body.value,
      req.body.partition,
      req.body.headers
    );

    res.status(201).json({
      topic: msg.topic,
      partition: msg.partition,
      offset: msg.offset,
      timestamp: msg.timestamp,
    });
  } catch (err) {
    if (err instanceof BrokerError) {
      handleBrokerError(err, res);
    } else {
      throw err;
    }
  }
}));

app.get('/topics/:topic/partitions/:partition/messages', asyncHandler(async (req, res) => {
  try {
    const partitionId = parseInt(req.params.partition, 10);
    const offset = parseInt(req.query.offset as string || '0', 10);
    const limit = parseInt(req.query.limit as string || '100', 10);

    const { messages, beginningOffset, nextOffset } = broker.readPartition(
      req.params.topic,
      partitionId,
      offset,
      limit
    );

    res.json({
      topic: req.params.topic,
      partition: partitionId,
      beginningOffset,
      nextOffset,
      messages,
    });
  } catch (err) {
    if (err instanceof BrokerError) {
      handleBrokerError(err, res);
    } else {
      throw err;
    }
  }
}));

app.post('/consumers', asyncHandler(async (req, res) => {
  try {
    const cg = broker.createConsumerGroup(
      req.body.groupId,
      req.body.topic,
      req.body.startFrom || 'latest'
    );

    const offsets = Array.from(cg.offsets.entries()).map(([partition, offset]) => ({
      partition,
      committedOffset: offset,
      lag: broker.getPartitionLag(req.body.topic, partition, offset),
    }));

    res.status(201).json({
      groupId: cg.groupId,
      topic: cg.topicName,
      offsets,
    });
  } catch (err) {
    if (err instanceof BrokerError) {
      handleBrokerError(err, res);
    } else {
      throw err;
    }
  }
}));

app.get('/consumers/:groupId/topics/:topic/messages', asyncHandler(async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string || '100', 10);
    const { messages, nextOffsets } = broker.fetchMessages(
      req.params.groupId,
      req.params.topic,
      limit
    );

    const nextOffsetsList = Array.from(nextOffsets.entries()).map(([partition, offset]) => ({
      partition,
      nextOffset: offset,
    }));

    res.json({
      groupId: req.params.groupId,
      topic: req.params.topic,
      messages,
      nextOffsets: nextOffsetsList,
    });
  } catch (err) {
    if (err instanceof BrokerError) {
      handleBrokerError(err, res);
    } else {
      throw err;
    }
  }
}));

app.post('/consumers/:groupId/topics/:topic/offsets', asyncHandler(async (req, res) => {
  try {
    const offsets = new Map<number, number>();
    for (const o of req.body.offsets) {
      offsets.set(o.partition, o.offset);
    }

    broker.commitOffsets(req.params.groupId, req.params.topic, offsets);

    const cg = broker.getConsumerGroup(req.params.groupId, req.params.topic);
    const offsetsResponse = Array.from(cg.offsets.entries()).map(([partition, offset]) => ({
      partition,
      committedOffset: offset,
      lag: broker.getPartitionLag(req.params.topic, partition, offset),
    }));

    res.json({
      groupId: req.params.groupId,
      topic: req.params.topic,
      offsets: offsetsResponse,
    });
  } catch (err) {
    if (err instanceof BrokerError) {
      handleBrokerError(err, res);
    } else {
      throw err;
    }
  }
}));

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({
    code: 'internal_error',
    message: err.message,
  });
});

export { app };

if (require.main === module) {
  const port = process.env.PORT || '8080';
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}
