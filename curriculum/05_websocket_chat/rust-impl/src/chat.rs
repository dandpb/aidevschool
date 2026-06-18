use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::{HashMap, HashSet};
use tokio::sync::mpsc::UnboundedSender;

pub type ServerEvent = Value;

#[derive(Clone, Debug)]
pub struct ChatConfig {
    pub heartbeat_interval_ms: u64,
    pub heartbeat_timeout_ms: u64,
    pub room_capacity: usize,
    pub message_size_limit: usize,
    pub history_size: usize,
    pub outbound_queue_limit: usize,
}

impl Default for ChatConfig {
    fn default() -> Self {
        Self {
            heartbeat_interval_ms: 30_000,
            heartbeat_timeout_ms: 10_000,
            room_capacity: 100,
            message_size_limit: 4096,
            history_size: 50,
            outbound_queue_limit: 256,
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct MessageRecord {
    pub message_id: String,
    pub kind: String,
    pub from_client_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub to_client_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub room_id: Option<String>,
    pub body: String,
    pub sent_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sequence: Option<u64>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ClientSnapshot {
    pub client_id: String,
    pub display_name: Option<String>,
    pub rooms: Vec<String>,
}

#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct Metrics {
    pub active_connections: usize,
    pub active_rooms: usize,
    pub room_memberships: usize,
    pub messages_received: u64,
    pub messages_delivered: u64,
    pub heartbeat_timeouts: u64,
    pub rejected_events: u64,
    pub dropped_slow_consumers: u64,
}

struct ClientState {
    client_id: String,
    display_name: Option<String>,
    last_seen_ms: u64,
    rooms: HashSet<String>,
    outbound_depth: usize,
    sender: UnboundedSender<ServerEvent>,
}

struct RoomState {
    members: HashSet<String>,
    history: Vec<MessageRecord>,
    sequence: u64,
}

pub struct ChatHub {
    config: ChatConfig,
    clients: HashMap<String, ClientState>,
    rooms: HashMap<String, RoomState>,
    next_client: u64,
    next_message: u64,
    next_heartbeat: u64,
    metrics: Metrics,
}

impl ChatHub {
    pub fn new(config: ChatConfig) -> Self {
        Self {
            config,
            clients: HashMap::new(),
            rooms: HashMap::new(),
            next_client: 0,
            next_message: 0,
            next_heartbeat: 0,
            metrics: Metrics::default(),
        }
    }

    pub fn connect(
        &mut self,
        sender: UnboundedSender<ServerEvent>,
        display_name: Option<String>,
        now_ms: u64,
    ) -> ClientSnapshot {
        self.next_client += 1;
        let client_id = format!("client-{}", self.next_client);
        let name = display_name.map(|name| name.chars().take(64).collect::<String>());
        let client = ClientState {
            client_id: client_id.clone(),
            display_name: name,
            last_seen_ms: now_ms,
            rooms: HashSet::new(),
            outbound_depth: 0,
            sender,
        };
        self.clients.insert(client_id.clone(), client);
        self.deliver(&client_id, json!({"type":"connected", "clientId":client_id, "heartbeatIntervalMs":self.config.heartbeat_interval_ms, "heartbeatTimeoutMs":self.config.heartbeat_timeout_ms}));
        self.snapshot(&client_id)
            .expect("newly inserted client is present")
    }

    pub fn handle(&mut self, client_id: &str, event: Value, now_ms: u64) {
        let Some(client) = self.clients.get_mut(client_id) else {
            return;
        };
        client.last_seen_ms = now_ms;
        let event_type = event.get("type").and_then(Value::as_str).unwrap_or("");
        let request_id = event
            .get("requestId")
            .and_then(Value::as_str)
            .map(str::to_owned);
        match event_type {
            "join" => self.join(client_id, &event, request_id, now_ms),
            "leave" => self.leave(client_id, &event, request_id, now_ms),
            "message" => self.room_message(client_id, &event, request_id, now_ms),
            "private_message" => self.private_message(client_id, &event, request_id, now_ms),
            "typing" => self.typing(client_id, &event, now_ms),
            "history" => self.history(client_id, &event, request_id),
            "pong" => {
                if event.get("heartbeatId").and_then(Value::as_str).is_none() {
                    self.reject(
                        client_id,
                        request_id,
                        "invalid_message_format",
                        "pong requires heartbeatId",
                    );
                }
            }
            _ => self.reject(
                client_id,
                request_id,
                "invalid_message_format",
                "unknown or missing event type",
            ),
        }
    }

    pub fn disconnect(&mut self, client_id: &str, now_ms: u64) {
        let Some(client) = self.clients.get(client_id) else {
            return;
        };
        let rooms = client.rooms.iter().cloned().collect::<Vec<_>>();
        for room_id in rooms {
            self.remove_from_room(client_id, &room_id, now_ms, true);
        }
        self.clients.remove(client_id);
    }

    pub fn send_heartbeat(&mut self, now_ms: u64) -> Vec<String> {
        let ids = self.clients.keys().cloned().collect::<Vec<_>>();
        let mut heartbeats = Vec::with_capacity(ids.len());
        for client_id in ids {
            self.next_heartbeat += 1;
            let heartbeat_id = format!("hb-{}", self.next_heartbeat);
            heartbeats.push(heartbeat_id.clone());
            self.deliver(
                &client_id,
                json!({"type":"ping", "heartbeatId":heartbeat_id, "sentAt":now_ms.to_string()}),
            );
        }
        heartbeats
    }

    pub fn disconnect_stale(&mut self, now_ms: u64) -> Vec<String> {
        let cutoff = self.config.heartbeat_interval_ms + self.config.heartbeat_timeout_ms;
        let stale = self
            .clients
            .values()
            .filter(|client| now_ms.saturating_sub(client.last_seen_ms) > cutoff)
            .map(|client| client.client_id.clone())
            .collect::<Vec<_>>();
        for client_id in &stale {
            self.metrics.heartbeat_timeouts += 1;
            self.disconnect(client_id, now_ms);
        }
        stale
    }

    pub fn metrics(&self) -> Metrics {
        let mut metrics = self.metrics.clone();
        metrics.active_connections = self.clients.len();
        metrics.active_rooms = self.rooms.len();
        metrics.room_memberships = self.rooms.values().map(|room| room.members.len()).sum();
        metrics
    }

    fn join(&mut self, client_id: &str, event: &Value, request_id: Option<String>, now_ms: u64) {
        let Some(room_id) = event
            .get("roomId")
            .and_then(Value::as_str)
            .filter(|id| valid_room_id(id))
            .map(str::to_owned)
        else {
            self.reject(
                client_id,
                request_id,
                "invalid_message_format",
                "join requires roomId",
            );
            return;
        };
        let room = self
            .rooms
            .entry(room_id.clone())
            .or_insert_with(|| RoomState {
                members: HashSet::new(),
                history: Vec::new(),
                sequence: 0,
            });
        if !room.members.contains(client_id) && room.members.len() >= self.config.room_capacity {
            self.reject(client_id, request_id, "room_full", "room is full");
            return;
        }
        room.members.insert(client_id.to_owned());
        let member_count = room.members.len();
        let history = room.history.clone();
        if let Some(client) = self.clients.get_mut(client_id) {
            client.rooms.insert(room_id.clone());
        }
        self.deliver(client_id, json!({"type":"joined", "requestId":request_id, "roomId":room_id, "memberCount":member_count, "history":history}));
        self.broadcast(&room_id, json!({"type":"presence", "roomId":room_id, "clientId":client_id, "status":"online", "at":now_ms.to_string()}), None);
    }

    fn leave(&mut self, client_id: &str, event: &Value, request_id: Option<String>, now_ms: u64) {
        let Some(room_id) = event
            .get("roomId")
            .and_then(Value::as_str)
            .filter(|id| valid_room_id(id))
            .map(str::to_owned)
        else {
            self.reject(
                client_id,
                request_id,
                "invalid_message_format",
                "leave requires roomId",
            );
            return;
        };
        if !self
            .clients
            .get(client_id)
            .is_some_and(|client| client.rooms.contains(&room_id))
        {
            self.reject(
                client_id,
                request_id,
                "not_in_room",
                "client is not in room",
            );
            return;
        }
        self.remove_from_room(client_id, &room_id, now_ms, true);
        self.deliver(
            client_id,
            json!({"type":"left", "requestId":request_id, "roomId":room_id}),
        );
    }

    fn room_message(
        &mut self,
        client_id: &str,
        event: &Value,
        request_id: Option<String>,
        now_ms: u64,
    ) {
        let Some(room_id) = event
            .get("roomId")
            .and_then(Value::as_str)
            .filter(|id| valid_room_id(id))
            .map(str::to_owned)
        else {
            self.reject(
                client_id,
                request_id,
                "invalid_message_format",
                "message requires roomId",
            );
            return;
        };
        let Some(body) = event
            .get("body")
            .and_then(Value::as_str)
            .filter(|body| !body.is_empty())
        else {
            self.reject(
                client_id,
                request_id,
                "invalid_message_format",
                "message requires body",
            );
            return;
        };
        if body.len() > self.config.message_size_limit {
            self.reject(
                client_id,
                request_id,
                "message_too_large",
                "message body exceeds limit",
            );
            return;
        }
        let Some(room) = self.rooms.get_mut(&room_id) else {
            self.reject(
                client_id,
                request_id,
                "not_in_room",
                "client is not in room",
            );
            return;
        };
        if !room.members.contains(client_id) {
            self.reject(
                client_id,
                request_id,
                "not_in_room",
                "client is not in room",
            );
            return;
        }
        self.metrics.messages_received += 1;
        self.next_message += 1;
        room.sequence += 1;
        let msg = MessageRecord {
            message_id: format!("msg-{}", self.next_message),
            kind: "room".into(),
            from_client_id: client_id.into(),
            to_client_id: None,
            room_id: Some(room_id.clone()),
            body: body.into(),
            sent_at: now_ms.to_string(),
            sequence: Some(room.sequence),
        };
        room.history.push(msg.clone());
        if room.history.len() > self.config.history_size {
            let remove = room.history.len() - self.config.history_size;
            room.history.drain(0..remove);
        }
        self.deliver(client_id, json!({"type":"message_ack", "requestId":request_id, "messageId":msg.message_id, "roomId":room_id, "acceptedAt":msg.sent_at}));
        self.broadcast(&room_id, json!({"type":"message", "message":msg}), None);
    }

    fn private_message(
        &mut self,
        client_id: &str,
        event: &Value,
        request_id: Option<String>,
        now_ms: u64,
    ) {
        let Some(to) = event
            .get("toClientId")
            .and_then(Value::as_str)
            .filter(|id| !id.is_empty())
            .map(str::to_owned)
        else {
            self.reject(
                client_id,
                request_id,
                "invalid_message_format",
                "private_message requires toClientId",
            );
            return;
        };
        let Some(body) = event
            .get("body")
            .and_then(Value::as_str)
            .filter(|body| !body.is_empty())
        else {
            self.reject(
                client_id,
                request_id,
                "invalid_message_format",
                "private_message requires body",
            );
            return;
        };
        if body.len() > self.config.message_size_limit {
            self.reject(
                client_id,
                request_id,
                "message_too_large",
                "message body exceeds limit",
            );
            return;
        }
        if !self.clients.contains_key(&to) {
            self.reject(
                client_id,
                request_id,
                "recipient_offline",
                "recipient is offline",
            );
            return;
        }
        self.metrics.messages_received += 1;
        self.next_message += 1;
        let msg = MessageRecord {
            message_id: format!("msg-{}", self.next_message),
            kind: "private".into(),
            from_client_id: client_id.into(),
            to_client_id: Some(to.clone()),
            room_id: None,
            body: body.into(),
            sent_at: now_ms.to_string(),
            sequence: None,
        };
        self.deliver(client_id, json!({"type":"private_message_ack", "requestId":request_id, "messageId":msg.message_id, "toClientId":to, "acceptedAt":msg.sent_at}));
        self.deliver(&to, json!({"type":"private_message", "message":msg}));
    }

    fn typing(&mut self, client_id: &str, event: &Value, now_ms: u64) {
        let Some(room_id) = event
            .get("roomId")
            .and_then(Value::as_str)
            .filter(|id| valid_room_id(id))
            .map(str::to_owned)
        else {
            self.reject(
                client_id,
                None,
                "invalid_message_format",
                "typing requires roomId",
            );
            return;
        };
        let Some(is_typing) = event.get("isTyping").and_then(Value::as_bool) else {
            self.reject(
                client_id,
                None,
                "invalid_message_format",
                "typing requires isTyping",
            );
            return;
        };
        if !self
            .rooms
            .get(&room_id)
            .is_some_and(|room| room.members.contains(client_id))
        {
            self.reject(client_id, None, "not_in_room", "client is not in room");
            return;
        }
        self.broadcast(&room_id, json!({"type":"typing", "roomId":room_id, "clientId":client_id, "isTyping":is_typing, "at":now_ms.to_string()}), Some(client_id));
    }

    fn history(&mut self, client_id: &str, event: &Value, request_id: Option<String>) {
        let Some(room_id) = event
            .get("roomId")
            .and_then(Value::as_str)
            .filter(|id| valid_room_id(id))
            .map(str::to_owned)
        else {
            self.reject(
                client_id,
                request_id,
                "invalid_message_format",
                "history requires roomId",
            );
            return;
        };
        let Some(room) = self.rooms.get(&room_id) else {
            self.reject(
                client_id,
                request_id,
                "not_in_room",
                "client is not in room",
            );
            return;
        };
        if !room.members.contains(client_id) {
            self.reject(
                client_id,
                request_id,
                "not_in_room",
                "client is not in room",
            );
            return;
        }
        let limit = event
            .get("limit")
            .and_then(Value::as_u64)
            .map_or(self.config.history_size, |n| {
                n.min(self.config.history_size as u64) as usize
            });
        let start = room.history.len().saturating_sub(limit);
        self.deliver(client_id, json!({"type":"history", "requestId":request_id, "roomId":room_id, "messages":room.history[start..].to_vec()}));
    }

    fn remove_from_room(&mut self, client_id: &str, room_id: &str, now_ms: u64, emit: bool) {
        let mut remove_room = false;
        if let Some(room) = self.rooms.get_mut(room_id) {
            room.members.remove(client_id);
            remove_room = room.members.is_empty();
        }
        if let Some(client) = self.clients.get_mut(client_id) {
            client.rooms.remove(room_id);
        }
        if emit {
            self.broadcast(room_id, json!({"type":"presence", "roomId":room_id, "clientId":client_id, "status":"offline", "at":now_ms.to_string()}), Some(client_id));
        }
        if remove_room {
            self.rooms.remove(room_id);
        }
    }

    fn broadcast(&mut self, room_id: &str, event: Value, exclude: Option<&str>) {
        let member_ids = self
            .rooms
            .get(room_id)
            .map(|room| room.members.iter().cloned().collect::<Vec<_>>())
            .unwrap_or_default();
        for member_id in member_ids {
            if exclude != Some(member_id.as_str()) {
                self.deliver(&member_id, event.clone());
            }
        }
    }

    fn deliver(&mut self, client_id: &str, event: Value) {
        let Some(client) = self.clients.get_mut(client_id) else {
            return;
        };
        if client.outbound_depth >= self.config.outbound_queue_limit {
            self.metrics.dropped_slow_consumers += 1;
            return;
        }
        client.outbound_depth += 1;
        if client.sender.send(event).is_ok() {
            self.metrics.messages_delivered += 1;
        }
        client.outbound_depth -= 1;
    }

    fn reject(&mut self, client_id: &str, request_id: Option<String>, code: &str, message: &str) {
        self.metrics.rejected_events += 1;
        self.deliver(client_id, json!({"type":"error", "requestId":request_id, "code":code, "message":message, "fatal":false}));
    }

    fn snapshot(&self, client_id: &str) -> Option<ClientSnapshot> {
        self.clients.get(client_id).map(|client| {
            let mut rooms = client.rooms.iter().cloned().collect::<Vec<_>>();
            rooms.sort();
            ClientSnapshot {
                client_id: client.client_id.clone(),
                display_name: client.display_name.clone(),
                rooms,
            }
        })
    }
}

fn valid_room_id(room_id: &str) -> bool {
    !room_id.is_empty() && room_id.len() <= 80
}
