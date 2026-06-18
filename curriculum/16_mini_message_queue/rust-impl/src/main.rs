use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::{IntoResponse, Json},
    routing::{get, post},
    Router,
};
use mini_message_queue_rust::{Broker, BrokerError, TopicConfig};
use serde::Deserialize;
use serde_json::json;
use std::collections::HashMap;
use std::sync::Arc;
use tower_http::trace::TraceLayer;

#[derive(Clone)]
struct AppState {
    broker: Arc<Broker>,
}

#[derive(Deserialize)]
struct CreateTopicRequest {
    name: String,
    partitions: i32,
    #[serde(rename = "retentionMs")]
    retention_ms: Option<i64>,
    #[serde(rename = "retentionBytes")]
    retention_bytes: Option<i64>,
    #[serde(rename = "cleanupPolicy")]
    cleanup_policy: Option<String>,
}

#[derive(Deserialize)]
struct ProduceRequest {
    key: Option<String>,
    value: serde_json::Value,
    partition: Option<i32>,
    headers: Option<HashMap<String, String>>,
}

#[derive(Deserialize)]
struct ReadPartitionQuery {
    offset: Option<i64>,
    limit: Option<i32>,
}

#[derive(Deserialize)]
struct CreateConsumerGroupRequest {
    group_id: String,
    topic: String,
    start_from: Option<String>,
}

#[derive(Deserialize)]
struct FetchMessagesQuery {
    limit: Option<i32>,
}

#[derive(Deserialize)]
struct CommitOffsetsRequest {
    offsets: Vec<OffsetCommit>,
}

#[derive(Deserialize)]
struct OffsetCommit {
    partition: i32,
    offset: i64,
}

async fn create_topic(
    State(state): State<AppState>,
    Json(req): Json<CreateTopicRequest>,
) -> Result<impl IntoResponse, BrokerError> {
    let config = TopicConfig {
        name: req.name,
        partitions: req.partitions,
        retention_ms: req.retention_ms,
        retention_bytes: req.retention_bytes,
        cleanup_policy: req.cleanup_policy.unwrap_or_else(|| "delete".to_string()),
    };

    let topic = state.broker.create_topic(config).await?;

    Ok((
        StatusCode::CREATED,
        Json(json!({
            "topic": {
                "name": topic.config.name,
                "partitions": topic.partitions.len(),
                "retentionMs": topic.config.retention_ms,
                "retentionBytes": topic.config.retention_bytes,
                "cleanupPolicy": topic.config.cleanup_policy,
            }
        })),
    ))
}

async fn produce(
    State(state): State<AppState>,
    Path(topic_name): Path<String>,
    Json(req): Json<ProduceRequest>,
) -> Result<impl IntoResponse, BrokerError> {
    let msg = state
        .broker
        .produce(&topic_name, req.key, req.value, req.partition, req.headers)
        .await?;

    Ok((
        StatusCode::CREATED,
        Json(json!({
            "topic": msg.topic,
            "partition": msg.partition,
            "offset": msg.offset,
            "timestamp": msg.timestamp,
        })),
    ))
}

async fn read_partition(
    State(state): State<AppState>,
    Path((topic_name, partition_id)): Path<(String, i32)>,
    Query(query): Query<ReadPartitionQuery>,
) -> Result<impl IntoResponse, BrokerError> {
    let offset = query.offset.unwrap_or(0);
    let limit = query.limit.unwrap_or(100);

    let (messages, beginning_offset, next_offset) = state
        .broker
        .read_partition(&topic_name, partition_id, offset, limit)
        .await?;

    let response_messages: Vec<_> = messages
        .into_iter()
        .map(|m| {
            json!({
                "offset": m.offset,
                "key": m.key,
                "value": m.value,
                "headers": m.headers,
                "timestamp": m.timestamp,
            })
        })
        .collect();

    Ok(Json(json!({
        "topic": topic_name,
        "partition": partition_id,
        "beginningOffset": beginning_offset,
        "nextOffset": next_offset,
        "messages": response_messages,
    })))
}

async fn create_consumer_group(
    State(state): State<AppState>,
    Json(req): Json<CreateConsumerGroupRequest>,
) -> Result<impl IntoResponse, BrokerError> {
    let start_from = req.start_from.as_deref().unwrap_or("latest");
    let cg = state
        .broker
        .create_consumer_group(&req.group_id, &req.topic, start_from)
        .await?;

    let mut offsets = Vec::new();
    for (partition, offset) in &cg.offsets {
        let lag = state
            .broker
            .get_partition_lag(&req.topic, *partition, *offset)
            .await
            .unwrap_or(0);
        offsets.push(json!({
            "partition": partition,
            "committedOffset": offset,
            "lag": lag,
        }));
    }

    Ok((
        StatusCode::CREATED,
        Json(json!({
            "groupId": cg.group_id,
            "topic": cg.topic_name,
            "offsets": offsets,
        })),
    ))
}

async fn fetch_messages(
    State(state): State<AppState>,
    Path((group_id, topic_name)): Path<(String, String)>,
    Query(query): Query<FetchMessagesQuery>,
) -> Result<impl IntoResponse, BrokerError> {
    let limit = query.limit.unwrap_or(100);
    let (messages, next_offsets) = state
        .broker
        .fetch_messages(&group_id, &topic_name, limit)
        .await?;

    let response_messages: Vec<_> = messages
        .into_iter()
        .map(|m| {
            json!({
                "partition": m.partition,
                "offset": m.offset,
                "key": m.key,
                "value": m.value,
                "headers": m.headers,
                "timestamp": m.timestamp,
            })
        })
        .collect();

    let next_offsets_list: Vec<_> = next_offsets
        .iter()
        .map(|(partition, offset)| {
            json!({
                "partition": partition,
                "nextOffset": offset,
            })
        })
        .collect();

    Ok(Json(json!({
        "groupId": group_id,
        "topic": topic_name,
        "messages": response_messages,
        "nextOffsets": next_offsets_list,
    })))
}

async fn commit_offsets(
    State(state): State<AppState>,
    Path((group_id, topic_name)): Path<(String, String)>,
    Json(req): Json<CommitOffsetsRequest>,
) -> Result<impl IntoResponse, BrokerError> {
    let offsets: HashMap<i32, i64> = req
        .offsets
        .into_iter()
        .map(|o| (o.partition, o.offset))
        .collect();

    state
        .broker
        .commit_offsets(&group_id, &topic_name, offsets)
        .await?;

    let cg = state.broker.get_consumer_group(&group_id, &topic_name).await?;

    let mut offsets_response = Vec::new();
    for (partition, offset) in &cg.offsets {
        let lag = state
            .broker
            .get_partition_lag(&topic_name, *partition, *offset)
            .await
            .unwrap_or(0);
        offsets_response.push(json!({
            "partition": partition,
            "committedOffset": offset,
            "lag": lag,
        }));
    }

    Ok(Json(json!({
        "groupId": group_id,
        "topic": topic_name,
        "offsets": offsets_response,
    })))
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    let broker = Arc::new(Broker::new());
    let state = AppState { broker };

    let app = Router::new()
        .route("/topics", post(create_topic))
        .route("/topics/:topic_name/messages", post(produce))
        .route(
            "/topics/:topic_name/partitions/:partition_id/messages",
            get(read_partition),
        )
        .route("/consumers", post(create_consumer_group))
        .route(
            "/consumers/:group_id/topics/:topic_name/messages",
            get(fetch_messages),
        )
        .route(
            "/consumers/:group_id/topics/:topic_name/offsets",
            post(commit_offsets),
        )
        .layer(TraceLayer::new_for_http())
        .with_state(state);

    let port = std::env::var("PORT").unwrap_or_else(|_| "8080".to_string());
    let addr = format!("0.0.0.0:{}", port);

    tracing::info!("Starting server on {}", addr);

    let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
