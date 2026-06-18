use serde_json::{json, Value};
use tokio::sync::mpsc::{unbounded_channel, UnboundedReceiver};
use websocket_chat_rust::{ChatConfig, ChatHub};

fn setup() -> (
    ChatHub,
    UnboundedReceiver<Value>,
    UnboundedReceiver<Value>,
    UnboundedReceiver<Value>,
    String,
    String,
    String,
) {
    let mut hub = ChatHub::new(ChatConfig {
        heartbeat_interval_ms: 100,
        heartbeat_timeout_ms: 50,
        room_capacity: 2,
        message_size_limit: 20,
        history_size: 2,
        outbound_queue_limit: 256,
    });
    let (atx, arx) = unbounded_channel();
    let (btx, brx) = unbounded_channel();
    let (ctx, crx) = unbounded_channel();
    let a = hub.connect(atx, Some("alice".into()), 0).client_id;
    let b = hub.connect(btx, Some("bob".into()), 0).client_id;
    let c = hub.connect(ctx, Some("carol".into()), 0).client_id;
    (hub, arx, brx, crx, a, b, c)
}

fn drain(rx: &mut UnboundedReceiver<Value>) -> Vec<Value> {
    let mut events = Vec::new();
    while let Ok(event) = rx.try_recv() {
        events.push(event);
    }
    events
}

fn has_type(events: &[Value], typ: &str) -> bool {
    events.iter().any(|event| event["type"] == typ)
}

#[test]
fn connect_join_history_and_room_broadcast_work() {
    let (mut hub, mut arx, mut brx, mut crx, a, b, _) = setup();
    assert_eq!(drain(&mut arx)[0]["type"], "connected");
    hub.handle(
        &a,
        json!({"type":"join", "requestId":"j1", "roomId":"general"}),
        1,
    );
    hub.handle(
        &a,
        json!({"type":"message", "roomId":"general", "body":"one"}),
        2,
    );
    hub.handle(
        &a,
        json!({"type":"message", "roomId":"general", "body":"two"}),
        3,
    );
    hub.handle(
        &a,
        json!({"type":"message", "roomId":"general", "body":"three"}),
        4,
    );
    hub.handle(
        &b,
        json!({"type":"join", "requestId":"j2", "roomId":"general"}),
        5,
    );
    hub.handle(
        &a,
        json!({"type":"message", "roomId":"general", "body":"live"}),
        6,
    );
    let bob_events = drain(&mut brx);
    let joined = bob_events
        .iter()
        .find(|event| event["type"] == "joined")
        .expect("joined event");
    assert_eq!(joined["memberCount"], 2);
    assert_eq!(joined["history"].as_array().expect("history").len(), 2);
    assert!(has_type(&bob_events, "message"));
    assert!(!has_type(&drain(&mut crx), "message"));
}

#[test]
fn private_typing_errors_leave_and_heartbeat_work() {
    let (mut hub, mut arx, mut brx, _, a, b, c) = setup();
    drain(&mut arx);
    drain(&mut brx);
    hub.handle(&a, json!({"type":"join", "roomId":"general"}), 1);
    hub.handle(&b, json!({"type":"join", "roomId":"general"}), 2);
    hub.handle(
        &a,
        json!({"type":"private_message", "requestId":"p1", "toClientId":b, "body":"secret"}),
        3,
    );
    hub.handle(
        &a,
        json!({"type":"typing", "roomId":"general", "isTyping":true}),
        4,
    );
    hub.handle(
        &c,
        json!({"type":"message", "requestId":"bad", "roomId":"general", "body":"nope"}),
        5,
    );
    hub.handle(
        &a,
        json!({"type":"leave", "requestId":"l1", "roomId":"general"}),
        6,
    );
    let alice_events = drain(&mut arx);
    let bob_events = drain(&mut brx);
    assert!(has_type(&alice_events, "private_message_ack"));
    assert!(has_type(&bob_events, "private_message"));
    assert!(has_type(&bob_events, "typing"));
    assert!(has_type(&alice_events, "left"));
    let stale = hub.disconnect_stale(1_000);
    assert!(stale.contains(&b));
    let metrics = hub.metrics();
    assert_eq!(metrics.active_rooms, 0);
    assert!(metrics.heartbeat_timeouts > 0);
    assert!(metrics.rejected_events > 0);
}

#[test]
fn validates_room_capacity_size_and_history_request() {
    let (mut hub, mut arx, mut brx, mut crx, a, b, c) = setup();
    drain(&mut arx);
    drain(&mut brx);
    drain(&mut crx);
    hub.handle(&a, json!({"type":"join", "roomId":"tiny"}), 1);
    hub.handle(&b, json!({"type":"join", "roomId":"tiny"}), 2);
    hub.handle(
        &c,
        json!({"type":"join", "requestId":"full", "roomId":"tiny"}),
        3,
    );
    hub.handle(&a, json!({"type":"message", "requestId":"large", "roomId":"tiny", "body":"012345678901234567890"}), 4);
    hub.handle(
        &a,
        json!({"type":"history", "requestId":"h1", "roomId":"tiny", "limit":1}),
        5,
    );
    let alice_events = drain(&mut arx);
    let carol_events = drain(&mut crx);
    assert!(carol_events
        .iter()
        .any(|event| event["type"] == "error" && event["code"] == "room_full"));
    assert!(alice_events
        .iter()
        .any(|event| event["type"] == "error" && event["code"] == "message_too_large"));
    assert!(alice_events.iter().any(|event| event["type"] == "history"));
}

#[test]
fn validation_heartbeat_defaults_disconnect_and_drop_paths_work() {
    let (mut hub, mut arx, mut brx, mut crx, a, b, c) = setup();
    drain(&mut arx);
    drain(&mut brx);
    drain(&mut crx);
    hub.handle("missing", json!({"type":"join", "roomId":"x"}), 1);
    hub.handle(&a, json!({"requestId":"missing-type"}), 2);
    hub.handle(&a, json!({"type":"join", "requestId":"bad-join"}), 3);
    hub.handle(&a, json!({"type":"join", "roomId":"tiny"}), 4);
    hub.handle(&a, json!({"type":"join", "roomId":"tiny"}), 5);
    hub.handle(&b, json!({"type":"join", "roomId":"tiny"}), 6);
    hub.handle(
        &a,
        json!({"type":"leave", "requestId":"bad-leave", "roomId":"other"}),
        7,
    );
    hub.handle(
        &a,
        json!({"type":"message", "requestId":"bad-message", "roomId":"tiny"}),
        8,
    );
    hub.handle(
        &a,
        json!({"type":"private_message", "requestId":"bad-private", "toClientId":""}),
        9,
    );
    hub.handle(&a, json!({"type":"private_message", "requestId":"offline", "toClientId":"client-404", "body":"x"}), 10);
    hub.handle(&a, json!({"type":"typing", "roomId":"tiny"}), 11);
    hub.handle(
        &c,
        json!({"type":"typing", "roomId":"tiny", "isTyping":true}),
        12,
    );
    hub.handle(&a, json!({"type":"history", "requestId":"bad-history"}), 13);
    hub.handle(
        &c,
        json!({"type":"history", "requestId":"not-member-history", "roomId":"tiny"}),
        14,
    );
    hub.handle(
        &a,
        json!({"type":"message", "roomId":"tiny", "body":"ok"}),
        15,
    );
    hub.handle(
        &a,
        json!({"type":"history", "requestId":"zero-history", "roomId":"tiny", "limit":0}),
        16,
    );
    hub.handle(&a, json!({"type":"pong"}), 17);
    hub.handle(&a, json!({"type":"unknown"}), 18);
    assert_eq!(hub.send_heartbeat(19).len(), 3);

    let alice_events = drain(&mut arx);
    let carol_events = drain(&mut crx);
    assert!(alice_events.iter().any(|event| event["type"] == "ping"));
    assert!(carol_events.iter().any(|event| event["type"] == "error"));
    let zero_history = alice_events
        .iter()
        .find(|event| event["type"] == "history" && event["requestId"] == "zero-history")
        .expect("zero history");
    assert_eq!(
        zero_history["messages"].as_array().expect("messages").len(),
        0
    );
    let metrics = hub.metrics();
    assert!(metrics.rejected_events >= 10);
    assert_eq!(metrics.active_rooms, 1);
    assert_eq!(metrics.room_memberships, 2);

    let (tx, mut rx) = unbounded_channel();
    let mut default_hub = ChatHub::new(ChatConfig::default());
    let long_name = "abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnop";
    let client = default_hub.connect(tx, Some(long_name.into()), 20);
    assert_eq!(client.display_name.expect("name").len(), 64);
    default_hub.handle(
        &client.client_id,
        json!({"type":"join", "roomId":"general"}),
        21,
    );
    default_hub.disconnect(&client.client_id, 22);
    default_hub.disconnect(&client.client_id, 23);
    assert_eq!(default_hub.metrics().active_connections, 0);
    drain(&mut rx);

    let (drop_tx, _drop_rx) = unbounded_channel();
    let mut drop_hub = ChatHub::new(ChatConfig {
        heartbeat_interval_ms: 1,
        heartbeat_timeout_ms: 1,
        room_capacity: 1,
        message_size_limit: 1,
        history_size: 1,
        outbound_queue_limit: 0,
    });
    drop_hub.connect(drop_tx, Some("drop".into()), 24);
    assert_eq!(drop_hub.metrics().dropped_slow_consumers, 1);
}
