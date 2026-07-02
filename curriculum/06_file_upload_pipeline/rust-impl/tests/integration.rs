use axum::body::Body;
use axum::http::{Request, StatusCode};
use file_upload_pipeline_rust::{build_state, router, Config};
use sha2::{Digest, Sha256};
use tower::ServiceExt;

async fn app(max_bytes: u64) -> axum::Router {
    let dir = tempfile::tempdir().expect("tempdir").keep();
    let state = build_state(Config {
        port: "0".to_string(),
        storage_dir: dir,
        max_bytes,
        read_buffer_bytes: 32 * 1024,
    })
    .await
    .expect("state");
    router(state)
}

fn multipart(
    filename: &str,
    content_type: &str,
    data: &[u8],
    fields: &[(&str, String)],
) -> (String, Vec<u8>) {
    let boundary = "BOUNDARY";
    let mut body = Vec::new();
    for (k, v) in fields {
        body.extend_from_slice(
            format!("--{boundary}\r\nContent-Disposition: form-data; name=\"{k}\"\r\n\r\n{v}\r\n")
                .as_bytes(),
        );
    }
    body.extend_from_slice(format!("--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"{filename}\"\r\nContent-Type: {content_type}\r\n\r\n").as_bytes());
    body.extend_from_slice(data);
    body.extend_from_slice(format!("\r\n--{boundary}--\r\n").as_bytes());
    (format!("multipart/form-data; boundary={boundary}"), body)
}

#[tokio::test]
async fn upload_lists_status_and_deletes() {
    let app = app(1 << 20).await;
    let data = b"hello rust stream";
    let sum = Sha256::digest(data);
    let (ct, body) = multipart(
        "note.txt",
        "text/plain",
        data,
        &[
            ("expectedChecksum", format!("sha256:{sum:x}")),
            ("owner", "learner".to_string()),
        ],
    );
    let res = app
        .clone()
        .oneshot(
            Request::post("/upload")
                .header("content-type", ct)
                .body(Body::from(body))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::CREATED);
    let bytes = axum::body::to_bytes(res.into_body(), 1 << 20)
        .await
        .unwrap();
    let upload: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
    let id = upload["id"].as_str().unwrap();
    assert_eq!(upload["status"], "completed");
    assert_eq!(upload["checksum"], format!("sha256:{sum:x}"));
    for path in [
        "/healthz".to_string(),
        "/files?status=completed".to_string(),
        format!("/files/{id}"),
        format!("/files/{id}/status"),
    ] {
        let res = app
            .clone()
            .oneshot(Request::get(path).body(Body::empty()).unwrap())
            .await
            .unwrap();
        assert_eq!(res.status(), StatusCode::OK);
    }
    let res = app
        .oneshot(
            Request::delete(format!("/files/{id}"))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::ACCEPTED);
}

#[tokio::test]
async fn rejects_invalid_type_size_checksum_and_malformed() {
    let app = app(5).await;
    for (name, file, ct, data, fields, want) in [
        (
            "type",
            "bad.exe",
            "application/x-msdownload",
            b"x".as_slice(),
            vec![],
            StatusCode::UNSUPPORTED_MEDIA_TYPE,
        ),
        (
            "size",
            "big.txt",
            "text/plain",
            b"123456".as_slice(),
            vec![],
            StatusCode::PAYLOAD_TOO_LARGE,
        ),
        (
            "checksum",
            "ok.txt",
            "text/plain",
            b"123".as_slice(),
            vec![("expectedChecksum", "sha256:bad".to_string())],
            StatusCode::CONFLICT,
        ),
    ] {
        let (content_type, body) = multipart(file, ct, data, &fields);
        let res = app
            .clone()
            .oneshot(
                Request::post("/upload")
                    .header("content-type", content_type)
                    .body(Body::from(body))
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(res.status(), want, "{name}");
    }
    let res = app
        .clone()
        .oneshot(
            Request::post("/upload")
                .header("content-type", "multipart/form-data; boundary=x")
                .body(Body::from("bad"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::BAD_REQUEST);
    let res = app
        .oneshot(Request::get("/files/nope").body(Body::empty()).unwrap())
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn rejects_path_capable_upload_id() {
    let app = app(1 << 20).await;
    let (ct, body) = multipart("safe.txt", "text/plain", b"safe", &[]);
    let res = app
        .oneshot(
            Request::post("/upload")
                .header("content-type", ct)
                .header("x-upload-id", "../escape")
                .body(Body::from(body))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn image_upload_and_missing_file_paths_are_reported() {
    let app = app(1 << 20).await;
    let data = b"\x89PNG\r\n\x1a\n";
    let (ct, body) = multipart("tiny.png", "image/png", data, &[]);
    let res = app
        .clone()
        .oneshot(
            Request::post("/upload")
                .header("content-type", ct)
                .body(Body::from(body))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::CREATED);
    let bytes = axum::body::to_bytes(res.into_body(), 1 << 20)
        .await
        .unwrap();
    let upload: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
    assert_eq!(
        upload["metadata"]["thumbnailStatus"],
        "documented: temp-file-backed thumbnail processor"
    );

    let body = "--BOUNDARY\r\nContent-Disposition: form-data; name=\"note\"\r\n\r\nmissing file\r\n--BOUNDARY--\r\n";
    let res = app
        .oneshot(
            Request::post("/upload")
                .header("content-type", "multipart/form-data; boundary=BOUNDARY")
                .body(Body::from(body))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::BAD_REQUEST);
}
