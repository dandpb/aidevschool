#!/usr/bin/env python3
"""Pipeline de mídia content-addressed — AID-2925 (ADR AID-2886 ACEITA: R2 + CDN).

Contrato (o repo continua sendo a fonte da verdade das *referências*; o bucket
é armazém de bytes imutável):

1. Bytes de mídia sobem como `media/<sha256>.<ext>` (chave por conteúdo —
   imutável por construção, idempotente por construção).
2. `docs/storage/manifests/media-manifest.json` mapeia caminho → sha256 → URL.
   Produção: URL = CDN base + chave. O manifest vive no git.
3. Lifecycle de órfãos: objeto sem referência no manifest por **> 90 dias**
   expira (`orphan-gc` marca com tag `orphan-since` e só deleta após a carência;
   nunca deleta objeto referenciado). Regra nativa equivalente no R2 fica
   documentada no runbook — a carência é do manifest, não do relógio do bucket.
4. Orçamento: alerta em US$10/mês (40% do teto), teto US$25/mês sem aprovação
   do CEO (`budget` estima custo pelos bytes medidos a preço de tabela R2;
   notificação de billing real configura-se no dashboard).
5. Migração incremental: só mídia NOVA usa o pipeline; nada de big-bang, nada
   de history rewrite.

Storage preserva e move bytes — nunca avalia (producer ≠ verifier).

Uso (env: ADS_MEDIA_ENDPOINT, ADS_MEDIA_ACCESS_KEY_ID,
ADS_MEDIA_SECRET_ACCESS_KEY, ADS_MEDIA_REGION=auto, ADS_MEDIA_BUCKET,
ADS_MEDIA_CDN_BASE):
  media_pipeline.py bootstrap
  media_pipeline.py upload ARQUIVO [--path caminho-logico]
  media_pipeline.py verify [--deep]
  media_pipeline.py orphan-gc [--dry-run] [--grace-days 90]
  media_pipeline.py budget
  media_pipeline.py restore [--into DIR] [--manifest FILE]
  media_pipeline.py self-test          # e2e contra fake S3 in-process, stdlib
"""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import os
import sys
import time
import urllib.parse
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from s3_miniclient import (  # noqa: E402
    S3Client,
    S3Error,
    content_md64,
    parse_xml,
    read_response,
)

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_MANIFEST = REPO_ROOT / "docs" / "storage" / "manifests" / "media-manifest.json"

# Preços de tabela R2 (USD) usados na ESTIMATIVA de orçamento — o recibo de
# billing real vem do dashboard; aqui medimos bytes e projetamos custo.
R2_STORAGE_USD_PER_GB_MONTH = 0.015
ALERT_MONTHLY_CENTS = 1000  # US$10 — acordado na ADR (40% do teto)
CAP_MONTHLY_CENTS = 2500  # US$25 — teto sem aprovação expressa do CEO

XML_NS = "{http://s3.amazonaws.com/doc/2006-03-01/}"
READ_SIZE = 1 << 20


def utcnow_iso() -> str:
    return dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def sha256_of(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        while chunk := handle.read(READ_SIZE):
            digest.update(chunk)
    return digest.hexdigest()


# ------------------------------------------------------------------- manifest


def load_manifest(path: Path) -> dict:
    if not path.exists():
        return {"schemaVersion": 1, "entries": [], "generatedAt": None}
    doc = json.loads(path.read_text(encoding="utf-8"))
    if doc.get("schemaVersion") != 1:
        raise SystemExit(f"manifest schemaVersion != 1: {doc.get('schemaVersion')!r}")
    return doc


def save_manifest(path: Path, doc: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    doc["generatedAt"] = utcnow_iso()
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(doc, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    tmp.replace(path)  # atómico: manifest nunca fica pela metade


def manifest_by_sha(doc: dict) -> set[str]:
    return {entry["sha256"] for entry in doc["entries"]}


# -------------------------------------------------------------------- bucket


def bucket_exists(client: S3Client) -> bool:
    try:
        client._request("HEAD", key="", bucket=client.bucket).read()
        return True
    except S3Error as error:
        if error.status in (404, 409, 301):
            return False
        raise


def cmd_bootstrap(client: S3Client, args: argparse.Namespace) -> dict:
    created = False
    create_note = ""
    if not bucket_exists(client):
        try:
            client._request("PUT", key="", bucket=client.bucket).read()
            created = True
        except S3Error as error:
            # R2 (região auto) cria sem LocationConstraint; S3/compatíveis
            # regionais exigem constraint casando com o endpoint. Retry só
            # no erro de constraint — fica registrado no recibo.
            if error.code != "IllegalLocationConstraintException":
                raise
            region = "us-east-1" if client.region == "auto" else client.region
            body = (
                '<CreateBucketConfiguration xmlns="http://s3.amazonaws.com/doc/2006-03-01/">'
                f"<LocationConstraint>{region}</LocationConstraint>"
                "</CreateBucketConfiguration>"
            ).encode()
            client._request("PUT", key="", bucket=client.bucket, body=body).read()
            created = True
            create_note = (
                f"LocationConstraint={region} exigido pelo endpoint "
                "(stand-in S3 regional; R2/auto não envia constraint)"
            )
    # versionação best-effort (R2 pode recusar; receipt registra o resultado)
    versioning = {"enabled": None, "note": ""}
    try:
        body = (
            "<VersioningConfiguration xmlns=\"http://s3.amazonaws.com/doc/2006-03-01/\">"
            "<Status>Enabled</Status></VersioningConfiguration>"
        ).encode()
        client._request("PUT", query={"versioning": ""}, body=body).read()
        versioning["enabled"] = True
    except S3Error as error:
        versioning["enabled"] = False
        versioning["note"] = str(error)
    # política de lifecycle documentada COMO OBJETO no próprio bucket (fonte:
    # manifest no repo decide órfãos; regra nativa equivalente no runbook)
    policy = {
        "rule": "orphan-gc",
        "contract": "objeto em media/ sem referência no manifest por >90 dias expira",
        "graceDays": 90,
        "enforcedBy": "scripts/storage/media_pipeline.py orphan-gc (manifest-driven)",
        "abortIncompleteMultipartUploadDays": 7,
        "nativeR2Rule": {
            "enabled": True,
            "conditions": {"prefix": "media/", "maxAgeSeconds": 7776000},
            "note": "regra nativa de pânico no dashboard; o GC do manifest é a autoridade",
        },
        "generatedAt": utcnow_iso(),
    }
    client._request(
        "PUT",
        key="ops/lifecycle-policy.json",
        body=json.dumps(policy, indent=2).encode(),
        headers={"x-amz-meta-sha256": hashlib.sha256(
            json.dumps(policy, indent=2).encode()
        ).hexdigest()},
    ).read()
    return {
        "action": "bootstrap",
        "bucket": client.bucket,
        "created": created,
        "createNote": create_note,
        "versioning": versioning,
        "lifecyclePolicyObject": "ops/lifecycle-policy.json",
        "status": "ok",
    }


# -------------------------------------------------------------------- upload


def media_key(sha256: str, ext: str) -> str:
    return f"media/{sha256}.{ext.lstrip('.').lower() or 'bin'}"


def cmd_upload(client: S3Client, args: argparse.Namespace) -> dict:
    source = Path(args.file)
    if not source.is_file():
        raise SystemExit(f"arquivo não encontrado: {source}")
    sha = sha256_of(source)
    ext = source.suffix or ".bin"
    key = media_key(sha, ext)
    logical = args.path or str(source.resolve().relative_to(REPO_ROOT))
    manifest = load_manifest(Path(args.manifest))
    for entry in manifest["entries"]:
        if entry["path"] == logical and entry["sha256"] != sha:
            raise SystemExit(
                f"path {logical!r} já manifestado com sha256 {entry['sha256'][:12]}… "
                f"(novo conteúdo exige novo path — referências são imutáveis)"
            )
    # put idempotente por conteúdo: mesma chave → mesmos bytes por construção
    body = source.read_bytes()
    already = False
    try:
        head = client._request("HEAD", key=key)
        already = head.headers.get("x-amz-meta-sha256") == sha
        if not already:
            raise SystemExit(
                f"colisão de chave com conteúdo divergente: {key} "
                "(mesma chave, sha256 diferente — investigar)"
            )
    except S3Error as error:
        if error.status != 404:
            raise
        client._request(
            "PUT",
            key=key,
            body=body,
            headers={
                "x-amz-meta-sha256": sha,
                "content-type": _guess_type(ext),
            },
        ).read()
    if not any(
        e["path"] == logical and e["sha256"] == sha for e in manifest["entries"]
    ):
        cdn_base = (args.cdn_base or os.environ.get("ADS_MEDIA_CDN_BASE", "")).rstrip("/")
        url = f"{cdn_base}/{key}" if cdn_base else f"s3://{client.bucket}/{key}"
        manifest["entries"].append(
            {
                "path": logical,
                "sha256": sha,
                "bytes": len(body),
                "key": key,
                "url": url,
                "uploadedAt": utcnow_iso(),
            }
        )
        save_manifest(Path(args.manifest), manifest)
    return {
        "action": "upload",
        "path": logical,
        "sha256": sha,
        "bytes": len(body),
        "key": key,
        "deduplicated": already,
        "manifest": str(Path(args.manifest)),
        "status": "ok",
    }


def _guess_type(ext: str) -> str:
    return {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".gif": "image/gif",
        ".svg": "image/svg+xml",
        ".webp": "image/webp",
        ".mp3": "audio/mpeg",
        ".ogg": "audio/ogg",
        ".wav": "audio/wav",
        ".mp4": "video/mp4",
        ".webm": "video/webm",
        ".pdf": "application/pdf",
        ".json": "application/json",
    }.get(ext.lower(), "application/octet-stream")


# -------------------------------------------------------------------- verify


def cmd_verify(client: S3Client, args: argparse.Namespace) -> dict:
    manifest = load_manifest(Path(args.manifest))
    entries = manifest["entries"]
    problems: list[str] = []
    for entry in entries:
        try:
            head = client._request("HEAD", key=entry["key"])
        except S3Error as error:
            problems.append(f"{entry['key']}: HEAD {error.status} {error.code}")
            continue
        if int(head.headers.get("Content-Length", "-1")) != entry["bytes"]:
            problems.append(f"{entry['key']}: tamanho divergente (manifest {entry['bytes']})")
        if head.headers.get("x-amz-meta-sha256") != entry["sha256"]:
            problems.append(f"{entry['key']}: x-amz-meta-sha256 divergente do manifest")
        if args.deep:
            raw = read_response(client._request("GET", key=entry["key"]))
            digest = hashlib.sha256(raw).hexdigest()
            if digest != entry["sha256"]:
                problems.append(f"{entry['key']}: deep sha256 {digest[:12]}… != manifest")
    report = {
        "action": "verify",
        "deep": bool(args.deep),
        "entries": len(entries),
        "ok": not problems,
        "problems": problems,
        "manifest": str(Path(args.manifest)),
        "generatedAt": utcnow_iso(),
    }
    if problems:
        report["status"] = "FAILED"
    else:
        report["status"] = "ok"
    return report


# ----------------------------------------------------------------- orphan-gc


def list_media_objects(client: S3Client, prefix: str = "media/") -> list[dict]:
    objects: list[dict] = []
    token = None
    while True:
        query = {"list-type": "2", "prefix": prefix}
        if token:
            query["continuation-token"] = token
        raw = read_response(client._request("GET", query=query))
        root = parse_xml(raw)
        for node in root.findall(f"{XML_NS}Contents"):
            objects.append(
                {
                    "key": (node.findtext(f"{XML_NS}Key") or ""),
                    "bytes": int(node.findtext(f"{XML_NS}Size") or "0"),
                }
            )
        token = root.findtext(f"{XML_NS}NextContinuationToken")
        if not token:
            return objects


def get_object_tags(client: S3Client, key: str) -> dict[str, str]:
    try:
        raw = read_response(client._request("GET", key=key, query={"tagging": ""}))
    except S3Error as error:
        if error.status == 404:
            return {}
        raise
    tags: dict[str, str] = {}
    for node in parse_xml(raw).findall(f".//{XML_NS}Tag"):
        tags[node.findtext(f"{XML_NS}Key") or ""] = node.findtext(f"{XML_NS}Value") or ""
    return tags


def set_object_tags(client: S3Client, key: str, tags: dict[str, str]) -> None:
    tagset = "".join(
        f"<Tag><Key>{k}</Key><Value>{v}</Value></Tag>" for k, v in sorted(tags.items())
    )
    payload = (
        '<Tagging xmlns="http://s3.amazonaws.com/doc/2006-03-01/">'
        f"<TagSet>{tagset}</TagSet></Tagging>"
    ).encode()
    client._request(
        "PUT",
        key=key,
        query={"tagging": ""},
        body=payload,
        headers={"content-md5": content_md64(payload)},  # exigido pela API S3
    ).read()


def cmd_orphan_gc(client: S3Client, args: argparse.Namespace) -> dict:
    manifest = load_manifest(Path(args.manifest))
    referenced = manifest_by_sha(manifest)
    objects = list_media_objects(client)
    report = {
        "action": "orphan-gc",
        "dryRun": bool(args.dry_run),
        "graceDays": args.grace_days,
        "objectsScanned": len(objects),
        "marked": [],
        "deleted": [],
        "untagged": [],
        "keptReferenced": 0,
        "status": "ok",
        "generatedAt": utcnow_iso(),
    }
    now = time.time()
    for obj in objects:
        key = obj["key"]
        stem = Path(key).stem  # chave = media/<sha256>.<ext>
        is_referenced = stem in referenced
        tags = get_object_tags(client, key)
        if is_referenced:
            if "orphan-since" in tags:
                tags.pop("orphan-since")
                if not args.dry_run:
                    set_object_tags(client, key, tags)
                report["untagged"].append(key)
            report["keptReferenced"] += 1
            continue
        marked_at = tags.get("orphan-since")
        if not marked_at:
            if not args.dry_run:
                set_object_tags(client, key, {**tags, "orphan-since": utcnow_iso()})
            report["marked"].append(key)
            continue
        age_days = (now - _parse_iso(marked_at)) / 86400.0
        if age_days > args.grace_days:
            if not args.dry_run:
                client._request("DELETE", key=key).read()
            report["deleted"].append({"key": key, "orphanDays": round(age_days, 1)})
    return report


def _parse_iso(stamp: str) -> float:
    return dt.datetime.strptime(stamp, "%Y-%m-%dT%H:%M:%SZ").replace(
        tzinfo=dt.timezone.utc
    ).timestamp()


# -------------------------------------------------------------------- budget


def cmd_budget(client: S3Client, args: argparse.Namespace) -> dict:
    objects = list_media_objects(client)
    total_bytes = sum(obj["bytes"] for obj in objects)
    gb = total_bytes / (1000 ** 3)
    storage_usd = gb * R2_STORAGE_USD_PER_GB_MONTH
    estimate_cents = round(storage_usd * 100)
    level = "ok"
    if estimate_cents >= CAP_MONTHLY_CENTS:
        level = "cap_exceeded"
    elif estimate_cents >= ALERT_MONTHLY_CENTS:
        level = "alert"
    report = {
        "action": "budget",
        "bucket": client.bucket,
        "objects": len(objects),
        "bytes": total_bytes,
        "storageGB": round(gb, 4),
        "estimateMonthlyUsd": round(storage_usd, 2),
        "estimateMonthlyCents": estimate_cents,
        "alertThresholdCents": ALERT_MONTHLY_CENTS,
        "capThresholdCents": CAP_MONTHLY_CENTS,
        "level": level,
        "basis": "estimativa por bytes medidos a preço de tabela R2 "
        "(storage US$0,015/GB-mês, egress US$0); billing real no dashboard",
        "status": "ok" if level == "ok" else "ALERT",
        "generatedAt": utcnow_iso(),
    }
    return report


# ------------------------------------------------------------------- restore


def cmd_restore(client: S3Client, args: argparse.Namespace) -> dict:
    manifest = load_manifest(Path(args.manifest))
    target = Path(args.into)
    target.mkdir(parents=True, exist_ok=True)
    restored: list[str] = []
    problems: list[str] = []
    for entry in manifest["entries"]:
        raw = read_response(client._request("GET", key=entry["key"]))
        digest = hashlib.sha256(raw).hexdigest()
        if digest != entry["sha256"]:
            problems.append(f"{entry['key']}: sha256 {digest[:12]}… != manifest — NÃO gravado")
            continue
        out = target / entry["path"]
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_bytes(raw)
        restored.append(entry["path"])
    return {
        "action": "restore",
        "into": str(target),
        "entries": len(manifest["entries"]),
        "restored": len(restored),
        "problems": problems,
        "status": "ok" if not problems and restored else ("EMPTY" if not manifest["entries"] else "FAILED"),
    }


# ------------------------------------------------------------------ self-test


class FakeS3:
    """Fake S3 in-process (stdlib http.server) para o e2e sem rede/creds.

    Implementa o subconjunto usado pelo pipeline e exige header Authorization
    AWS SigV4 em toda requisição (valida que o cliente assina tudo).
    """

    from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

    def __init__(self) -> None:
        self.buckets: dict[str, dict[str, dict]] = {}
        self.requests: list[str] = []

        class Handler(self.BaseHTTPRequestHandler):
            outer = self

            def _auth(self) -> None:
                auth = self.headers.get("Authorization", "")
                if not auth.startswith("AWS4-HMAC-SHA256"):
                    self._reply(403, "AccessDenied", "missing SigV4 Authorization")

            def _reply(
                self, status: int, code: str, message: str, body: bytes = b"",
                headers: dict[str, str] | None = None,
            ) -> None:
                payload = (
                    f'<?xml version="1.0"?><Error><Code>{code}</Code>'
                    f"<Message>{message}</Message></Error>"
                ).encode()
                self.send_response(status)
                self.send_header("Content-Type", "application/xml")
                for key, value in (headers or {}).items():
                    self.send_header(key, value)
                self.send_header("Content-Length", str(len(payload)))
                self.end_headers()
                self.wfile.write(payload)

            def _body(self) -> bytes:
                length = int(self.headers.get("Content-Length", "0"))
                return self.rfile.read(length) if length else b""

            def _split(self) -> tuple[str, str, dict[str, str]]:
                parsed = urllib.parse.urlparse(self.path)
                parts = [p for p in parsed.path.split("/") if p]
                bucket = parts[0] if parts else ""
                key = "/".join(parts[1:])
                query = {
                    k: v[-1]
                    for k, v in urllib.parse.parse_qs(parsed.query, keep_blank_values=True).items()
                }
                return bucket, key, query

            def do_PUT(self) -> None:  # noqa: N802 — nome exigido pelo http.server
                self._auth()
                bucket, key, query = self._split()
                if bucket not in self.outer.buckets:
                    if not key and not query:
                        self.outer.buckets[bucket] = {}
                        self._reply(200, "Ok", "")
                        return
                    self._reply(404, "NoSuchBucket", bucket)
                    return
                body = self._body()
                if not key and "versioning" in query:
                    self._reply(200, "Ok", "")  # aceito; estado não simulado
                elif key and "tagging" in query:
                    parsed_tags: dict[str, str] = {}
                    for tag in parse_xml(body).findall(f".//{XML_NS}Tag"):
                        parsed_tags[tag.findtext(f"{XML_NS}Key") or ""] = (
                            tag.findtext(f"{XML_NS}Value") or ""
                        )
                    self.outer.buckets[bucket][key]["tags"] = parsed_tags
                    self._reply(200, "Ok", "")
                elif key:
                    existing = self.outer.buckets[bucket].get(key, {})
                    self.outer.buckets[bucket][key] = {
                        "body": body,
                        "meta": {
                            "sha256": self.headers.get("x-amz-meta-sha256", ""),
                            "type": self.headers.get("Content-Type", ""),
                        },
                        "tags": existing.get("tags", {}),
                    }
                    self.send_response(200)
                    self.send_header("Content-Length", "0")
                    self.end_headers()
                else:
                    self._reply(400, "Malformed", "PUT inesperado")

            def do_HEAD(self) -> None:  # noqa: N802
                self._auth()
                bucket, key, _ = self._split()
                obj = self.outer.buckets.get(bucket, {}).get(key)
                if obj is None:
                    self._reply(404, "NoSuchKey", key)
                    return
                self.send_response(200)
                self.send_header("Content-Length", str(len(obj["body"])))
                if obj["meta"]["sha256"]:
                    self.send_header("x-amz-meta-sha256", obj["meta"]["sha256"])
                self.end_headers()

            def do_GET(self) -> None:  # noqa: N802
                self._auth()
                bucket, key, query = self._split()
                store = self.outer.buckets.get(bucket)
                if store is None:
                    self._reply(404, "NoSuchBucket", bucket)
                    return
                if "list-type" in query:
                    prefix = query.get("prefix", "")
                    contents = "".join(
                        f"<Contents><Key>{k}</Key><Size>{len(v['body'])}</Size></Contents>"
                        for k, v in sorted(store.items())
                        if k.startswith(prefix)
                    )
                    listing = (
                        '<?xml version="1.0"?><ListBucketResult '
                        'xmlns="http://s3.amazonaws.com/doc/2006-03-01/">'
                        f"{contents}</ListBucketResult>"
                    ).encode()
                    self.send_response(200)
                    self.send_header("Content-Type", "application/xml")
                    self.send_header("Content-Length", str(len(listing)))
                    self.end_headers()
                    self.wfile.write(listing)
                    return
                obj = store.get(key)
                if obj is None:
                    self._reply(404, "NoSuchKey", key)
                    return
                if "tagging" in query:
                    tags = obj.get("tags") or {}
                    raw = (
                        '<Tagging xmlns="http://s3.amazonaws.com/doc/2006-03-01/">'
                        "<TagSet>"
                        + "".join(
                            f"<Tag><Key>{k}</Key><Value>{v}</Value></Tag>"
                            for k, v in sorted(tags.items())
                        )
                        + "</TagSet></Tagging>"
                    ).encode()
                    self.send_response(200)
                    self.send_header("Content-Type", "application/xml")
                    self.send_header("Content-Length", str(len(raw)))
                    self.end_headers()
                    self.wfile.write(raw)
                    return
                self.send_response(200)
                self.send_header("Content-Length", str(len(obj["body"])))
                if obj["meta"]["sha256"]:
                    self.send_header("x-amz-meta-sha256", obj["meta"]["sha256"])
                self.end_headers()
                self.wfile.write(obj["body"])

            def do_DELETE(self) -> None:  # noqa: N802
                self._auth()
                bucket, key, _ = self._split()
                if key not in self.outer.buckets.get(bucket, {}):
                    self._reply(404, "NoSuchKey", key)
                    return
                del self.outer.buckets[bucket][key]
                self.send_response(204)
                self.send_header("Content-Length", "0")
                self.end_headers()

            def log_message(self, *_) -> None:
                pass

        self.server = self.ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        self.port = self.server.server_address[1]

    def start(self) -> None:
        import threading

        thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        thread.start()

    def stop(self) -> None:
        self.server.shutdown()
        self.server.server_close()


def cmd_self_test(_: argparse.Namespace) -> dict:
    import tempfile

    fake = FakeS3()
    fake.start()
    steps: list[dict] = []
    try:
        os.environ.setdefault("ADS_MEDIA_CDN_BASE", "https://media.cdn.aidevschool.example")
        client = S3Client(
            endpoint=f"http://127.0.0.1:{fake.port}",
            access_key_id="test-key",
            secret_access_key="test-secret",
            region="auto",
            bucket="aidevschool-media",
        )
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            manifest_path = tmp_path / "media-manifest.json"

            def run(cli_args: list[str]) -> dict:
                ns = build_parser().parse_args(cli_args)
                ns.manifest = str(manifest_path)
                return dispatch(ns, client=client)

            # 1. bootstrap
            boot = run(["bootstrap"])
            assert boot["status"] == "ok" and boot["created"], boot
            steps.append({"step": "bootstrap", "ok": True})

            # 2. upload de dois arquivos (um duplicado por conteúdo)
            png = tmp_path / "lesson-art.png"
            payload = b"\x89PNG\r\n\x1a\n" + os.urandom(64)
            png.write_bytes(payload)
            up = run(["upload", str(png), "--path", "curriculum/ai-literacy/m01/art.png"])
            assert up["status"] == "ok" and not up["deduplicated"], up
            copy = tmp_path / "same-content.png"
            copy.write_bytes(payload)
            up2 = run(["upload", str(copy), "--path", "curriculum/ai-literacy/m01/art2.png"])
            assert up2["deduplicated"], up2  # mesma chave content-addressed
            audio = tmp_path / "intro.mp3"
            audio.write_bytes(b"ID3" + os.urandom(128))
            run(["upload", str(audio), "--path", "curriculum/ai-literacy/m01/intro.mp3"])
            steps.append({"step": "upload+dedup", "ok": True})

            # 3. verify shallow + deep
            ver = run(["verify", "--deep"])
            assert ver["ok"] and ver["entries"] == 3, ver
            steps.append({"step": "verify-deep", "ok": True})

            # 4. restore byte-idêntico (simula perda local)
            gone = tmp_path / "disaster"
            res = run(["restore", "--into", str(gone)])
            assert res["status"] == "ok" and res["restored"] == 3, res
            assert sha256_of(gone / "curriculum/ai-literacy/m01/art.png") == up["sha256"]
            steps.append({"step": "restore", "ok": True})

            # 5. tamper no bucket → deep verify falha fechado
            fake.buckets["aidevschool-media"][up["key"]]["body"] = b"corrompido"
            bad = run(["verify", "--deep"])
            assert bad["status"] == "FAILED" and bad["problems"], bad
            fake.buckets["aidevschool-media"][up["key"]]["body"] = payload
            steps.append({"step": "tamper-detected", "ok": True})

            # 6. órfão: objeto fora do manifest é marcado; grace respeitado
            client._request(
                "PUT", key="media/" + "f" * 64 + ".png", body=b"orfa",
                headers={"x-amz-meta-sha256": "f" * 64},
            ).read()
            gc1 = run(["orphan-gc", "--grace-days", "90"])
            assert gc1["marked"] == ["media/" + "f" * 64 + ".png"], gc1
            assert gc1["keptReferenced"] == 2, gc1
            gc2 = run(["orphan-gc", "--grace-days", "0", "--dry-run"])
            assert len(gc2["deleted"]) == 1, gc2
            gc3 = run(["orphan-gc", "--grace-days", "0"])
            assert len(gc3["deleted"]) == 1, gc3
            remaining = [o["key"] for o in list_media_objects(client)]
            assert "media/" + "f" * 64 + ".png" not in remaining, remaining
            steps.append({"step": "orphan-gc-mark+expire", "ok": True})

            # 7. budget dentro do alerta
            budget = run(["budget"])
            assert budget["level"] == "ok", budget
            steps.append({"step": "budget-ok", "ok": True})

            # 8. renovação de referência: referenciado nunca é deletado
            gc4 = run(["orphan-gc", "--grace-days", "0"])
            assert gc4["deleted"] == [] and gc4["keptReferenced"] == 2, gc4
            steps.append({"step": "referenced-never-deleted", "ok": True})
    finally:
        fake.stop()
    return {"action": "self-test", "status": "PASS", "steps": steps}


# ---------------------------------------------------------------------- main


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument(
        "--manifest", default=str(DEFAULT_MANIFEST), help="caminho do media-manifest.json"
    )
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("bootstrap", help="cria/configura bucket + política documental")
    up = sub.add_parser("upload", help="sobe mídia como media/<sha256>.<ext>")
    up.add_argument("file")
    up.add_argument("--path", help="caminho lógico no manifest (default: relativo ao repo)")
    up.add_argument("--cdn-base", help="override da base de URL CDN")
    ver = sub.add_parser("verify", help="confere manifest vs bucket (receipt)")
    ver.add_argument("--deep", action="store_true", help="baixa e re-hasha cada objeto")
    gc = sub.add_parser("orphan-gc", help="marca/expira órfãos (>grace dias sem referência)")
    gc.add_argument("--dry-run", action="store_true")
    gc.add_argument("--grace-days", type=int, default=90)
    sub.add_parser("budget", help="estimativa de custo vs alerta US$10/teto US$25")
    res = sub.add_parser("restore", help="restaura bytes do bucket, sha256 fail-closed")
    res.add_argument("--into", default="/tmp/aid-media-restore", help="dir destino")
    sub.add_parser("self-test", help="e2e contra fake S3 in-process (sem rede)")
    return parser


def dispatch(args: argparse.Namespace, client: S3Client | None = None) -> dict:
    if args.command == "self-test":
        return cmd_self_test(args)
    client = client or S3Client.from_env()
    handlers = {
        "bootstrap": cmd_bootstrap,
        "upload": cmd_upload,
        "verify": cmd_verify,
        "orphan-gc": cmd_orphan_gc,
        "budget": cmd_budget,
        "restore": cmd_restore,
    }
    return handlers[args.command](client, args)


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    report = dispatch(args)
    print(json.dumps(report, indent=2, ensure_ascii=False))
    if report.get("status") in ("FAILED", "ALERT"):
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
