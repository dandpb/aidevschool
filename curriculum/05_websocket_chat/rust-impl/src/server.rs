use crate::chat::{ChatConfig, ChatHub};
use futures_util::{SinkExt, StreamExt};
use serde_json::json;
use std::sync::Arc;
use tokio::{
    net::TcpListener,
    sync::{mpsc, Mutex},
    time::{interval, Duration},
};
use tokio_tungstenite::{accept_async, tungstenite::Message};
use tracing::{info, warn};

pub async fn run(
    addr: &str,
    config: ChatConfig,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let listener = TcpListener::bind(addr).await?;
    let hub = Arc::new(Mutex::new(ChatHub::new(config.clone())));
    info!(%addr, "websocket chat server listening");
    let heartbeat_hub = hub.clone();
    tokio::spawn(async move {
        let mut ticker = interval(Duration::from_millis(config.heartbeat_interval_ms));
        loop {
            ticker.tick().await;
            let now = now_ms();
            let mut hub = heartbeat_hub.lock().await;
            hub.send_heartbeat(now);
            for client_id in hub.disconnect_stale(now) {
                warn!(%client_id, "client heartbeat timeout");
            }
        }
    });
    loop {
        let (stream, _) = listener.accept().await?;
        let hub = hub.clone();
        tokio::spawn(async move {
            if let Err(error) = handle_connection(stream, hub).await {
                warn!(%error, "connection ended");
            }
        });
    }
}

async fn handle_connection(
    stream: tokio::net::TcpStream,
    hub: Arc<Mutex<ChatHub>>,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let ws = accept_async(stream).await?;
    let (mut sink, mut source) = ws.split();
    let (tx, mut rx) = mpsc::unbounded_channel();
    let client_id = { hub.lock().await.connect(tx, None, now_ms()).client_id };
    loop {
        tokio::select! {
            maybe_event = rx.recv() => {
                let Some(event) = maybe_event else { break; };
                sink.send(Message::Text(event.to_string().into())).await?;
            }
            maybe_msg = source.next() => {
                let Some(msg) = maybe_msg else { break; };
                match msg? {
                    Message::Text(text) => {
                        let event = serde_json::from_str(&text).unwrap_or_else(|_| json!({"type":null}));
                        hub.lock().await.handle(&client_id, event, now_ms());
                    }
                    Message::Close(_) => break,
                    _ => {}
                }
            }
        }
    }
    hub.lock().await.disconnect(&client_id, now_ms());
    Ok(())
}

fn now_ms() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_or(0, |duration| duration.as_millis() as u64)
}
