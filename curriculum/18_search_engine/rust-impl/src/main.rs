use search_engine::InvertedIndex;
use std::io::{self, BufRead, Read, Write, BufWriter};
use std::net::TcpListener;
use std::sync::{Arc, RwLock};

fn write_response(stream: &std::net::TcpStream, status: u16, body: &str) -> io::Result<()> {
    let mut writer = BufWriter::new(stream.try_clone()?);
    writeln!(writer, "HTTP/1.1 {} OK", status)?;
    writeln!(writer, "Content-Type: application/json")?;
    writeln!(writer, "Content-Length: {}", body.len())?;
    writeln!(writer)?;
    write!(writer, "{}", body)?;
    writer.flush()
}

fn main() {
    let idx = Arc::new(RwLock::new(InvertedIndex::new()));
    let listener = TcpListener::bind("127.0.0.1:8080").expect("bind failed");
    eprintln!("search engine listening on :8080");
    for stream in listener.incoming() {
        let stream = match stream { Ok(s) => s, Err(_) => continue };
        let mut reader = io::BufReader::new(&stream);
        let mut request_line = String::new();
        if reader.read_line(&mut request_line).is_err() { continue; }
        let parts: Vec<&str> = request_line.split_whitespace().collect();
        if parts.len() < 2 { let _ = write_response(&stream, 400, r#"{"error":"bad request"}"#); continue; }
        let (method, path) = (parts[0], parts[1]);
        let mut content_length = 0;
        loop {
            let mut header = String::new();
            if reader.read_line(&mut header).is_err() { break; }
            if header.trim().is_empty() { break; }
            if header.to_lowercase().starts_with("content-length:") {
                content_length = header.split(':').nth(1).and_then(|s| s.trim().parse().ok()).unwrap_or(0);
            }
        }
        let mut body = vec![0u8; content_length];
        if content_length > 0 { let _ = reader.read_exact(&mut body); }
        let body_str = String::from_utf8_lossy(&body);
        match (method, path) {
            ("GET", "/health") => {
                let idx = idx.read().unwrap();
                let _ = write_response(&stream, 200, &format!(r#"{{"status":"ok","indexed":{}}}"#, idx.document_count()));
            }
            ("POST", "/index") => {
                let req: serde_json::Value = serde_json::from_str(&body_str).unwrap_or_default();
                let title = req.get("title").and_then(|v| v.as_str()).unwrap_or("");
                let content = req.get("content").and_then(|v| v.as_str()).unwrap_or("");
                if content.is_empty() {
                    let _ = write_response(&stream, 400, r#"{"error":"content is required"}"#);
                } else {
                    let mut idx = idx.write().unwrap();
                    let doc_id = idx.add_document(title, content);
                    let _ = write_response(&stream, 201, &format!(r#"{{"doc_id":{},"status":"indexed"}}"#, doc_id));
                }
            }
            ("POST", "/search") => {
                let req: serde_json::Value = serde_json::from_str(&body_str).unwrap_or_default();
                let query = req.get("query").and_then(|v| v.as_str()).unwrap_or("");
                let limit = req.get("limit").and_then(|v| v.as_u64()).unwrap_or(10) as usize;
                let idx = idx.read().unwrap();
                let results = idx.search(query, limit);
                let json = serde_json::to_string(&results).unwrap_or_else(|_| "[]".to_string());
                let _ = write_response(&stream, 200, &format!(r#"{{"query":"{}","count":{},"results":{}}}"#, query, results.len(), json));
            }
            _ => { let _ = write_response(&stream, 404, r#"{"error":"not found"}"#); }
        }
    }
}
