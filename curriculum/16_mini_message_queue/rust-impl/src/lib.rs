use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    pub topic: String,
    pub partition: i32,
    pub offset: i64,
    pub key: Option<String>,
    pub value: serde_json::Value,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub headers: Option<HashMap<String, String>>,
    pub timestamp: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TopicConfig {
    pub name: String,
    pub partitions: i32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub retention_ms: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub retention_bytes: Option<i64>,
    #[serde(default = "default_cleanup_policy")]
    pub cleanup_policy: String,
}

fn default_cleanup_policy() -> String {
    "delete".to_string()
}

#[derive(Debug, Clone)]
pub struct Topic {
    pub config: TopicConfig,
    pub created_at: DateTime<Utc>,
    pub partitions: Vec<Arc<RwLock<Partition>>>,
}

#[derive(Debug, Clone)]
pub struct Partition {
    pub topic_name: String,
    pub id: i32,
    pub messages: Vec<Message>,
    pub beginning_offset: i64,
    pub next_offset: i64,
}

#[derive(Debug, Clone)]
pub struct ConsumerGroup {
    pub group_id: String,
    pub topic_name: String,
    pub offsets: HashMap<i32, i64>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug)]
pub struct Broker {
    topics: RwLock<HashMap<String, Arc<Topic>>>,
    consumer_groups: RwLock<HashMap<String, ConsumerGroup>>,
    max_message_size: i64,
    max_read_limit: i32,
}

use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;

#[derive(Debug, thiserror::Error)]
pub enum BrokerError {
    #[error("topic not found: {0}")]
    TopicNotFound(String),
    #[error("topic already exists: {0}")]
    TopicAlreadyExists(String),
    #[error("invalid topic config: {0}")]
    InvalidTopicConfig(String),
    #[error("invalid message: {0}")]
    InvalidMessage(String),
    #[error("partition out of range: {0}")]
    PartitionOutOfRange(i32),
    #[error("invalid offset or limit")]
    InvalidOffsetOrLimit,
    #[error("offset no longer retained")]
    OffsetNoLongerRetained,
    #[error("invalid consumer group: {0}")]
    InvalidConsumerGroup(String),
    #[error("consumer group conflict: {0}")]
    ConsumerGroupConflict(String),
    #[error("invalid offset commit")]
    InvalidOffsetCommit,
    #[error("offset out of range")]
    OffsetOutOfRange,
}

impl IntoResponse for BrokerError {
    fn into_response(self) -> Response {
        let (status, code) = match &self {
            BrokerError::TopicNotFound(_) => (StatusCode::NOT_FOUND, "topic_not_found"),
            BrokerError::TopicAlreadyExists(_) => (StatusCode::CONFLICT, "topic_already_exists"),
            BrokerError::InvalidTopicConfig(_) => {
                (StatusCode::BAD_REQUEST, "invalid_topic_config")
            }
            BrokerError::InvalidMessage(_) => (StatusCode::BAD_REQUEST, "invalid_message"),
            BrokerError::PartitionOutOfRange(_) => {
                (StatusCode::UNPROCESSABLE_ENTITY, "partition_out_of_range")
            }
            BrokerError::InvalidOffsetOrLimit => {
                (StatusCode::BAD_REQUEST, "invalid_offset_or_limit")
            }
            BrokerError::OffsetNoLongerRetained => {
                (StatusCode::GONE, "offset_no_longer_retained")
            }
            BrokerError::InvalidConsumerGroup(_) => {
                (StatusCode::BAD_REQUEST, "invalid_consumer_group")
            }
            BrokerError::ConsumerGroupConflict(_) => {
                (StatusCode::CONFLICT, "consumer_group_conflict")
            }
            BrokerError::InvalidOffsetCommit => {
                (StatusCode::BAD_REQUEST, "invalid_offset_commit")
            }
            BrokerError::OffsetOutOfRange => {
                (StatusCode::UNPROCESSABLE_ENTITY, "offset_out_of_range")
            }
        };

        let body = Json(json!({
            "code": code,
            "message": self.to_string(),
        }));

        (status, body).into_response()
    }
}

impl Broker {
    pub fn new() -> Self {
        Self {
            topics: RwLock::new(HashMap::new()),
            consumer_groups: RwLock::new(HashMap::new()),
            max_message_size: 1024 * 1024,
            max_read_limit: 1000,
        }
    }

    pub async fn create_topic(&self, config: TopicConfig) -> Result<Arc<Topic>, BrokerError> {
        if config.partitions <= 0 {
            return Err(BrokerError::InvalidTopicConfig(
                "partitions must be positive".to_string(),
            ));
        }
        if config.name.is_empty() {
            return Err(BrokerError::InvalidTopicConfig(
                "name must be non-empty".to_string(),
            ));
        }

        let mut topics = self.topics.write().await;

        if let Some(existing) = topics.get(&config.name) {
            if existing.config.partitions != config.partitions {
                return Err(BrokerError::TopicAlreadyExists(config.name));
            }
            return Ok(existing.clone());
        }

        let mut partitions = Vec::with_capacity(config.partitions as usize);
        for i in 0..config.partitions {
            partitions.push(Arc::new(RwLock::new(Partition {
                topic_name: config.name.clone(),
                id: i,
                messages: Vec::new(),
                beginning_offset: 0,
                next_offset: 0,
            })));
        }

        let topic = Arc::new(Topic {
            config: config.clone(),
            created_at: Utc::now(),
            partitions,
        });

        topics.insert(config.name, topic.clone());
        Ok(topic)
    }

    pub async fn get_topic(&self, name: &str) -> Result<Arc<Topic>, BrokerError> {
        let topics = self.topics.read().await;
        topics
            .get(name)
            .cloned()
            .ok_or_else(|| BrokerError::TopicNotFound(name.to_string()))
    }

    pub async fn produce(
        &self,
        topic_name: &str,
        key: Option<String>,
        value: serde_json::Value,
        partition: Option<i32>,
        headers: Option<HashMap<String, String>>,
    ) -> Result<Message, BrokerError> {
        if value.is_null() {
            return Err(BrokerError::InvalidMessage("value is empty".to_string()));
        }

        let value_str = serde_json::to_string(&value).unwrap_or_default();
        if value_str.len() as i64 > self.max_message_size {
            return Err(BrokerError::InvalidMessage("message too large".to_string()));
        }

        let topic = self.get_topic(topic_name).await?;

        let partition_id = if let Some(p) = partition {
            if p < 0 || p >= topic.config.partitions {
                return Err(BrokerError::PartitionOutOfRange(p));
            }
            p
        } else if let Some(ref k) = key {
            Self::hash_key(k) % topic.config.partitions
        } else {
            0
        };

        let mut p = topic.partitions[partition_id as usize].write().await;

        let msg = Message {
            topic: topic_name.to_string(),
            partition: partition_id,
            offset: p.next_offset,
            key: key.clone(),
            value,
            headers,
            timestamp: Utc::now(),
        };

        p.messages.push(msg.clone());
        p.next_offset += 1;

        self.enforce_retention(&topic, &mut p).await;

        Ok(msg)
    }

    pub async fn read_partition(
        &self,
        topic_name: &str,
        partition_id: i32,
        offset: i64,
        limit: i32,
    ) -> Result<(Vec<Message>, i64, i64), BrokerError> {
        if limit <= 0 || limit > self.max_read_limit {
            return Err(BrokerError::InvalidOffsetOrLimit);
        }
        if offset < 0 {
            return Err(BrokerError::InvalidOffsetOrLimit);
        }

        let topic = self.get_topic(topic_name).await?;

        if partition_id < 0 || partition_id >= topic.config.partitions {
            return Err(BrokerError::PartitionOutOfRange(partition_id));
        }

        let p = topic.partitions[partition_id as usize].read().await;

        if offset < p.beginning_offset {
            return Err(BrokerError::OffsetNoLongerRetained);
        }

        if offset >= p.next_offset {
            return Ok((Vec::new(), p.beginning_offset, offset));
        }

        let start_idx = (offset - p.beginning_offset) as usize;
        let end_idx = (start_idx + limit as usize).min(p.messages.len());

        let result = p.messages[start_idx..end_idx].to_vec();
        let next_offset = offset + result.len() as i64;

        Ok((result, p.beginning_offset, next_offset))
    }

    pub async fn create_consumer_group(
        &self,
        group_id: &str,
        topic_name: &str,
        start_from: &str,
    ) -> Result<ConsumerGroup, BrokerError> {
        if group_id.is_empty() {
            return Err(BrokerError::InvalidConsumerGroup(
                "groupId is empty".to_string(),
            ));
        }

        let topic = self.get_topic(topic_name).await?;
        let key = format!("{}:{}", group_id, topic_name);

        let mut groups = self.consumer_groups.write().await;

        if let Some(existing) = groups.get(&key) {
            return Ok(existing.clone());
        }

        let mut offsets = HashMap::new();
        for p in &topic.partitions {
            let partition = p.read().await;
            let offset = match start_from {
                "earliest" => partition.beginning_offset,
                "latest" | "" => partition.next_offset,
                _ => {
                    return Err(BrokerError::InvalidConsumerGroup(format!(
                        "invalid startFrom {}",
                        start_from
                    )))
                }
            };
            offsets.insert(partition.id, offset);
        }

        let cg = ConsumerGroup {
            group_id: group_id.to_string(),
            topic_name: topic_name.to_string(),
            offsets,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };

        groups.insert(key, cg.clone());
        Ok(cg)
    }

    pub async fn fetch_messages(
        &self,
        group_id: &str,
        topic_name: &str,
        limit: i32,
    ) -> Result<(Vec<Message>, HashMap<i32, i64>), BrokerError> {
        if limit <= 0 || limit > self.max_read_limit {
            return Err(BrokerError::InvalidOffsetOrLimit);
        }

        let key = format!("{}:{}", group_id, topic_name);

        let groups = self.consumer_groups.read().await;
        let cg = groups
            .get(&key)
            .cloned()
            .ok_or_else(|| BrokerError::InvalidConsumerGroup(format!("{} {}", group_id, topic_name)))?;
        drop(groups);

        let topic = self.get_topic(topic_name).await?;
        let offsets = cg.offsets.clone();

        let mut messages = Vec::new();
        let mut next_offsets = HashMap::new();

        let per_partition_limit = (limit / topic.config.partitions).max(1);

        for p in &topic.partitions {
            let partition = p.read().await;
            let partition_id = partition.id;
            let offset = offsets.get(&partition_id).copied().unwrap_or(0);

            if offset < partition.beginning_offset {
                return Err(BrokerError::OffsetNoLongerRetained);
            }
            drop(partition);

            let (msgs, _, next_offset) = self
                .read_partition(topic_name, partition_id, offset, per_partition_limit)
                .await?;

            messages.extend(msgs);
            next_offsets.insert(partition_id, next_offset);
        }

        Ok((messages, next_offsets))
    }

    pub async fn commit_offsets(
        &self,
        group_id: &str,
        topic_name: &str,
        offsets: HashMap<i32, i64>,
    ) -> Result<(), BrokerError> {
        let key = format!("{}:{}", group_id, topic_name);

        let mut groups = self.consumer_groups.write().await;
        let cg = groups
            .get_mut(&key)
            .ok_or_else(|| BrokerError::InvalidConsumerGroup(format!("{} {}", group_id, topic_name)))?;

        let topic = self.get_topic(topic_name).await?;

        for (partition_id, offset) in offsets {
            if partition_id < 0 || partition_id >= topic.config.partitions {
                return Err(BrokerError::PartitionOutOfRange(partition_id));
            }

            let p = topic.partitions[partition_id as usize].read().await;
            if offset < p.beginning_offset {
                return Err(BrokerError::OffsetNoLongerRetained);
            }
            if offset > p.next_offset {
                return Err(BrokerError::OffsetOutOfRange);
            }
            drop(p);

            if let Some(existing) = cg.offsets.get(&partition_id) {
                if offset < *existing {
                    return Err(BrokerError::InvalidOffsetCommit);
                }
            }

            cg.offsets.insert(partition_id, offset);
        }

        cg.updated_at = Utc::now();
        Ok(())
    }

    pub async fn get_consumer_group(
        &self,
        group_id: &str,
        topic_name: &str,
    ) -> Result<ConsumerGroup, BrokerError> {
        let key = format!("{}:{}", group_id, topic_name);
        let groups = self.consumer_groups.read().await;
        groups
            .get(&key)
            .cloned()
            .ok_or_else(|| BrokerError::InvalidConsumerGroup(format!("{} {}", group_id, topic_name)))
    }

    pub async fn list_topics(&self) -> Vec<Arc<Topic>> {
        let topics = self.topics.read().await;
        topics.values().cloned().collect()
    }

    pub async fn get_partition_lag(
        &self,
        topic_name: &str,
        partition_id: i32,
        committed_offset: i64,
    ) -> Result<i64, BrokerError> {
        let topic = self.get_topic(topic_name).await?;

        if partition_id < 0 || partition_id >= topic.config.partitions {
            return Err(BrokerError::PartitionOutOfRange(partition_id));
        }

        let p = topic.partitions[partition_id as usize].read().await;
        let lag = (p.next_offset - committed_offset).max(0);
        Ok(lag)
    }

    async fn enforce_retention(&self, topic: &Topic, p: &mut Partition) {
        if topic.config.retention_ms.is_none() && topic.config.retention_bytes.is_none() {
            return;
        }

        let now = Utc::now();
        let cutoff = topic.config.retention_ms.map(|ms| now - chrono::Duration::milliseconds(ms));

        let mut total_bytes: i64 = p.messages.iter().map(|m| {
            serde_json::to_string(&m.value).unwrap_or_default().len() as i64
        }).sum();

        while !p.messages.is_empty() {
            let msg = &p.messages[0];
            let mut should_delete = false;

            if let Some(ref c) = cutoff {
                if msg.timestamp < *c {
                    should_delete = true;
                }
            }

            if let Some(max_bytes) = topic.config.retention_bytes {
                if total_bytes > max_bytes {
                    should_delete = true;
                }
            }

            if !should_delete {
                break;
            }

            total_bytes -= serde_json::to_string(&msg.value).unwrap_or_default().len() as i64;
            let offset = msg.offset;
            p.messages.remove(0);
            p.beginning_offset = offset + 1;
        }
    }

    fn hash_key(key: &str) -> i32 {
        let mut h: i32 = 0;
        for byte in key.bytes() {
            h = h.wrapping_mul(31).wrapping_add(byte as i32);
        }
        h.abs()
    }
}

impl Default for Broker {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[tokio::test]
    async fn test_create_topic() {
        let broker = Broker::new();
        let config = TopicConfig {
            name: "orders".to_string(),
            partitions: 3,
            retention_ms: None,
            retention_bytes: None,
            cleanup_policy: "delete".to_string(),
        };

        let topic = broker.create_topic(config).await.unwrap();
        assert_eq!(topic.config.name, "orders");
        assert_eq!(topic.partitions.len(), 3);
    }

    #[tokio::test]
    async fn test_create_topic_duplicate() {
        let broker = Broker::new();
        let config = TopicConfig {
            name: "orders".to_string(),
            partitions: 3,
            retention_ms: None,
            retention_bytes: None,
            cleanup_policy: "delete".to_string(),
        };

        broker.create_topic(config.clone()).await.unwrap();
        let topic = broker.create_topic(config).await.unwrap();
        assert_eq!(topic.partitions.len(), 3);
    }

    #[tokio::test]
    async fn test_create_topic_duplicate_different_partitions() {
        let broker = Broker::new();
        let config1 = TopicConfig {
            name: "orders".to_string(),
            partitions: 3,
            retention_ms: None,
            retention_bytes: None,
            cleanup_policy: "delete".to_string(),
        };
        let config2 = TopicConfig {
            name: "orders".to_string(),
            partitions: 5,
            retention_ms: None,
            retention_bytes: None,
            cleanup_policy: "delete".to_string(),
        };

        broker.create_topic(config1).await.unwrap();
        let result = broker.create_topic(config2).await;
        assert!(matches!(result, Err(BrokerError::TopicAlreadyExists(_))));
    }

    #[tokio::test]
    async fn test_create_topic_invalid_partitions() {
        let broker = Broker::new();
        let config = TopicConfig {
            name: "orders".to_string(),
            partitions: 0,
            retention_ms: None,
            retention_bytes: None,
            cleanup_policy: "delete".to_string(),
        };

        let result = broker.create_topic(config).await;
        assert!(matches!(result, Err(BrokerError::InvalidTopicConfig(_))));
    }

    #[tokio::test]
    async fn test_produce() {
        let broker = Broker::new();
        let config = TopicConfig {
            name: "orders".to_string(),
            partitions: 3,
            retention_ms: None,
            retention_bytes: None,
            cleanup_policy: "delete".to_string(),
        };
        broker.create_topic(config).await.unwrap();

        let msg = broker
            .produce("orders", None, json!({"orderId": "o-1"}), Some(0), None)
            .await
            .unwrap();
        assert_eq!(msg.topic, "orders");
        assert_eq!(msg.partition, 0);
        assert_eq!(msg.offset, 0);
    }

    #[tokio::test]
    async fn test_produce_with_key() {
        let broker = Broker::new();
        let config = TopicConfig {
            name: "orders".to_string(),
            partitions: 3,
            retention_ms: None,
            retention_bytes: None,
            cleanup_policy: "delete".to_string(),
        };
        broker.create_topic(config).await.unwrap();

        let msg = broker
            .produce("orders", Some("customer-123".to_string()), json!({"orderId": "o-1"}), None, None)
            .await
            .unwrap();
        assert_eq!(msg.topic, "orders");
        assert_eq!(msg.key, Some("customer-123".to_string()));
    }

    #[tokio::test]
    async fn test_produce_topic_not_found() {
        let broker = Broker::new();
        let result = broker
            .produce("nonexistent", None, json!({"test": true}), None, None)
            .await;
        assert!(matches!(result, Err(BrokerError::TopicNotFound(_))));
    }

    #[tokio::test]
    async fn test_produce_partition_out_of_range() {
        let broker = Broker::new();
        let config = TopicConfig {
            name: "orders".to_string(),
            partitions: 3,
            retention_ms: None,
            retention_bytes: None,
            cleanup_policy: "delete".to_string(),
        };
        broker.create_topic(config).await.unwrap();

        let result = broker
            .produce("orders", None, json!({"test": true}), Some(99), None)
            .await;
        assert!(matches!(result, Err(BrokerError::PartitionOutOfRange(_))));
    }

    #[tokio::test]
    async fn test_read_partition() {
        let broker = Broker::new();
        let config = TopicConfig {
            name: "orders".to_string(),
            partitions: 1,
            retention_ms: None,
            retention_bytes: None,
            cleanup_policy: "delete".to_string(),
        };
        broker.create_topic(config).await.unwrap();

        for i in 0..5 {
            broker
                .produce("orders", None, json!({"n": i}), Some(0), None)
                .await
                .unwrap();
        }

        let (msgs, beginning_offset, next_offset) = broker.read_partition("orders", 0, 0, 10).await.unwrap();
        assert_eq!(msgs.len(), 5);
        assert_eq!(beginning_offset, 0);
        assert_eq!(next_offset, 5);
    }

    #[tokio::test]
    async fn test_read_partition_with_limit() {
        let broker = Broker::new();
        let config = TopicConfig {
            name: "orders".to_string(),
            partitions: 1,
            retention_ms: None,
            retention_bytes: None,
            cleanup_policy: "delete".to_string(),
        };
        broker.create_topic(config).await.unwrap();

        for i in 0..5 {
            broker
                .produce("orders", None, json!({"n": i}), Some(0), None)
                .await
                .unwrap();
        }

        let (msgs, _, next_offset) = broker.read_partition("orders", 0, 0, 2).await.unwrap();
        assert_eq!(msgs.len(), 2);
        assert_eq!(next_offset, 2);
    }

    #[tokio::test]
    async fn test_consumer_group() {
        let broker = Broker::new();
        let config = TopicConfig {
            name: "orders".to_string(),
            partitions: 2,
            retention_ms: None,
            retention_bytes: None,
            cleanup_policy: "delete".to_string(),
        };
        broker.create_topic(config).await.unwrap();

        for i in 0..3 {
            broker
                .produce("orders", None, json!({"n": i}), Some(0), None)
                .await
                .unwrap();
        }

        let cg = broker.create_consumer_group("group-1", "orders", "earliest").await.unwrap();
        assert_eq!(cg.group_id, "group-1");
        assert_eq!(cg.offsets.len(), 2);
        assert_eq!(cg.offsets[&0], 0);

        let (msgs, next_offsets) = broker.fetch_messages("group-1", "orders", 10).await.unwrap();
        assert_eq!(msgs.len(), 3);
        assert_eq!(next_offsets[&0], 3);

        let (msgs2, _) = broker.fetch_messages("group-1", "orders", 10).await.unwrap();
        assert_eq!(msgs2.len(), 3);

        let mut offsets = HashMap::new();
        offsets.insert(0, 3);
        broker.commit_offsets("group-1", "orders", offsets).await.unwrap();

        let (msgs3, _) = broker.fetch_messages("group-1", "orders", 10).await.unwrap();
        assert_eq!(msgs3.len(), 0);
    }

    #[tokio::test]
    async fn test_consumer_group_latest() {
        let broker = Broker::new();
        let config = TopicConfig {
            name: "orders".to_string(),
            partitions: 1,
            retention_ms: None,
            retention_bytes: None,
            cleanup_policy: "delete".to_string(),
        };
        broker.create_topic(config).await.unwrap();

        for i in 0..3 {
            broker
                .produce("orders", None, json!({"n": i}), Some(0), None)
                .await
                .unwrap();
        }

        let cg = broker.create_consumer_group("group-1", "orders", "latest").await.unwrap();
        assert_eq!(cg.offsets[&0], 3);
    }

    #[tokio::test]
    async fn test_commit_older_offset() {
        let broker = Broker::new();
        let config = TopicConfig {
            name: "orders".to_string(),
            partitions: 1,
            retention_ms: None,
            retention_bytes: None,
            cleanup_policy: "delete".to_string(),
        };
        broker.create_topic(config).await.unwrap();

        for i in 0..5 {
            broker
                .produce("orders", None, json!({"n": i}), Some(0), None)
                .await
                .unwrap();
        }

        broker.create_consumer_group("group-1", "orders", "earliest").await.unwrap();

        let mut offsets = HashMap::new();
        offsets.insert(0, 3);
        broker.commit_offsets("group-1", "orders", offsets.clone()).await.unwrap();

        offsets.insert(0, 1);
        let result = broker.commit_offsets("group-1", "orders", offsets).await;
        assert!(matches!(result, Err(BrokerError::InvalidOffsetCommit)));
    }

    #[tokio::test]
    async fn test_retention() {
        let broker = Broker::new();
        let config = TopicConfig {
            name: "orders".to_string(),
            partitions: 1,
            retention_ms: Some(100),
            retention_bytes: None,
            cleanup_policy: "delete".to_string(),
        };
        broker.create_topic(config).await.unwrap();

        for i in 0..5 {
            broker
                .produce("orders", None, json!({"n": i}), Some(0), None)
                .await
                .unwrap();
        }

        tokio::time::sleep(tokio::time::Duration::from_millis(150)).await;

        broker
            .produce("orders", None, json!({"n": 5}), Some(0), None)
            .await
            .unwrap();

        let result = broker.read_partition("orders", 0, 0, 10).await;
        assert!(matches!(result, Err(BrokerError::OffsetNoLongerRetained)));
    }

    #[tokio::test]
    async fn test_concurrent_produce() {
        let broker = Arc::new(Broker::new());
        let config = TopicConfig {
            name: "orders".to_string(),
            partitions: 1,
            retention_ms: None,
            retention_bytes: None,
            cleanup_policy: "delete".to_string(),
        };
        broker.create_topic(config).await.unwrap();

        let mut handles = vec![];
        for i in 0..10 {
            let b = broker.clone();
            let handle = tokio::spawn(async move {
                for j in 0..100 {
                    b.produce("orders", None, json!({"g": i, "j": j}), Some(0), None)
                        .await
                        .unwrap();
                }
            });
            handles.push(handle);
        }

        for handle in handles {
            handle.await.unwrap();
        }

        let topic = broker.get_topic("orders").await.unwrap();
        let p = topic.partitions[0].read().await;
        assert_eq!(p.next_offset, 1000);
        assert_eq!(p.messages.len(), 1000);
    }

    #[tokio::test]
    async fn test_message_order() {
        let broker = Broker::new();
        let config = TopicConfig {
            name: "orders".to_string(),
            partitions: 1,
            retention_ms: None,
            retention_bytes: None,
            cleanup_policy: "delete".to_string(),
        };
        broker.create_topic(config).await.unwrap();

        for i in 0..10 {
            broker
                .produce("orders", None, json!({"order": i}), Some(0), None)
                .await
                .unwrap();
        }

        let (msgs, _, _) = broker.read_partition("orders", 0, 0, 10).await.unwrap();
        for (i, msg) in msgs.iter().enumerate() {
            assert_eq!(msg.offset, i as i64);
        }
    }
}
