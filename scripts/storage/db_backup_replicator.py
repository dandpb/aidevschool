#!/usr/bin/env python3
"""Replicador off-site dos dumps do Paperclip DB — AID-2953 (decisão CEO AID-2950).

Contrato (o dump local NUNCA é tocado; a cópia off-box é read-only pós-upload):

1. **Upload pós-backup**: cada `paperclip-YYYYMMDD-HHMMSS.sql.gz` novo em
   `/paperclip/instances/default/data/backups/` sobe como
   `paperclip-db/<filename>` no bucket `aidevschool-backups` (R2, egress zero),
   com metadados `x-amz-meta-sha256` e tamanho — recibo por objeto.
2. **Imutável por construção**: chave existente com tamanho divergente é ERRO
   (nunca overwrite); sha256 do upload é verificado por HEAD após o PUT.
3. **Retenção tiered off-box** (`retention`): além da janela horária
   (`keepHoursDays`), mantém só o ÚLTIMO dump de cada dia por `keepDailyDays`
   dias + o último de cada mês por `keepMonthlyMonths` meses; o resto expira.
   A poda local NÃO é daqui — o mecanismo tiered do Paperclip é a única
   autoridade sobre `/data/backups` (decisão AID-2950 D1).
4. **Orçamento**: alerta em US$10/mês (40% do teto), teto US$25/mês sem
   aprovação expressa do CEO (`budget` estima por bytes medidos a preço de
   tabela R2; egress zero).
5. **Restore drill** (`restore-latest` + `restore_drill.py`): baixa o dump
   mais novo do bucket, confere sha256 vs metadado, restaura num PG
   descartável — a cópia off-box só é backup se restaurar.

Storage move bytes e preserva evidência — nunca avalia (producer ≠ verifier).

Uso (env: ADS_BACKUPS_ENDPOINT, ADS_BACKUPS_ACCESS_KEY_ID,
ADS_BACKUPS_SECRET_ACCESS_KEY, ADS_BACKUPS_REGION=auto,
ADS_BACKUPS_BUCKET=aidevschool-backups):
  db_backup_replicator.py bootstrap
  db_backup_replicator.py replicate [--from DIR] [--prune]
  db_backup_replicator.py verify [--deep] [--from DIR]
  db_backup_replicator.py retention [--apply]
  db_backup_replicator.py budget
  db_backup_replicator.py restore-latest --into DIR
  db_backup_replicator.py self-test          # e2e contra fake S3 in-process

Todo comando emite recibo JSON em stdout; `verify`/`budget` saem com rc=1 em
FAILED/ALERT (monitoramento pode pendurar nisso).
"""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import os
import re
import subprocess
import sys
import urllib.parse
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from s3_miniclient import (  # noqa: E402
    S3Client,
    S3Error,
    parse_xml,
    read_response,
)

PREFIX = "paperclip-db/"
LIFECYCLE_KEY = PREFIX + "ops/lifecycle-policy.json"
DUMP_RE = re.compile(r"^paperclip-(\d{8})-(\d{6})\.sql\.gz$")
XML_NS = "{http://s3.amazonaws.com/doc/2006-03-01/}"
READ_SIZE = 1 << 20

# Preços de tabela R2 (USD) usados na ESTIMATIVA de orçamento — o recibo de
# billing real vem do dashboard; aqui medimos bytes e projetamos custo.
R2_STORAGE_USD_PER_GB_MONTH = 0.015
ALERT_MONTHLY_CENTS = 1000  # US$10 — 40% do teto
CAP_MONTHLY_CENTS = 2500  # US$25 — teto sem aprovação expressa do CEO

DEFAULT_RETENTION = {
    "keepHoursDays": 2,  # janela horária além do dia corrente
    "keepDailyDays": 30,  # 1 dump/dia (o último do dia)
    "keepMonthlyMonths": 12,  # 1 dump/mês (o último do mês)
}

# ------------------------------------------------------------------ helpers


def utcnow_iso() -> str:
    return dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def sha256_of(path: Path) -> tuple[str, int]:
    digest = hashlib.sha256()
    total = 0
    with path.open("rb") as handle:
        while chunk := handle.read(READ_SIZE):
            digest.update(chunk)
            total += len(chunk)
    return digest.hexdigest(), total


def parse_dump_name(name: str) -> dt.datetime | None:
    match = DUMP_RE.match(name)
    if not match:
        return None
    return dt.datetime.strptime(
        f"{match.group(1)}-{match.group(2)}", "%Y%m%d-%H%M%S"
    ).replace(tzinfo=dt.timezone.utc)


def client_from_env() -> S3Client:
    endpoint = os.environ.get("ADS_BACKUPS_ENDPOINT", "")
    if not endpoint:
        raise SystemExit(
            "ADS_BACKUPS_ENDPOINT ausente (ex.: https://<acct>.r2.cloudflarestorage.com)"
        )
    return S3Client(
        endpoint=endpoint,
        access_key_id=os.environ.get("ADS_BACKUPS_ACCESS_KEY_ID", ""),
        secret_access_key=os.environ.get("ADS_BACKUPS_SECRET_ACCESS_KEY", ""),
        region=os.environ.get("ADS_BACKUPS_REGION", "auto"),
        bucket=os.environ.get("ADS_BACKUPS_BUCKET", "aidevschool-backups"),
    )


def list_objects(client: S3Client, prefix: str = PREFIX) -> list[dict]:
    objects: list[dict] = []
    token: str | None = None
    while True:
        query = {"list-type": "2", "prefix": prefix, "max-keys": "1000"}
        if token:
            query["continuation-token"] = token
        raw = read_response(client._request("GET", query=query))
        root = parse_xml(raw)
        for contents in root.findall(f".//{XML_NS}Contents"):
            key = contents.findtext(f"{XML_NS}Key") or ""
            if key == LIFECYCLE_KEY:
                continue  # objeto de policy, não é dump
            stamp = parse_dump_name(Path(key).name)
            if stamp is None:
                objects.append({"key": key, "bytes": -1, "at": None, "unparsed": True})
                continue
            objects.append(
                {
                    "key": key,
                    "bytes": int(contents.findtext(f"{XML_NS}Size") or "0"),
                    "at": stamp,
                    "unparsed": False,
                }
            )
        token = root.findtext(f"{XML_NS}NextContinuationToken")
        if not token:
            return objects


def head_object(client: S3Client, key: str) -> dict | None:
    try:
        response = client._request("HEAD", key=key)
    except S3Error as error:
        if error.status == 404:
            return None
        raise
    meta = response.headers.get("x-amz-meta-sha256", "")
    length = int(response.headers.get("Content-Length", "0"))
    response.read()
    return {"bytes": length, "sha256": meta}


# ---------------------------------------------------------------- bootstrap


def cmd_bootstrap(client: S3Client, _: argparse.Namespace) -> dict:
    created = False
    create_note = ""
    try:
        read_response(client._request("PUT", key="", bucket=client.bucket))
        created = True
    except S3Error as error:
        if error.status == 409 and "BucketAlreadyOwnedByYou" in str(error):
            create_note = "já existente (BucketAlreadyOwnedByYou)"
        elif error.status == 409:
            create_note = f"já existente ({error.code})"
        else:
            raise
    policy = {
        "description": "Política de retenção dos dumps do Paperclip DB "
        "(documental; a autoridade é o comando `retention` do "
        "db_backup_replicator.py, runbook DB_BACKUP_REPLICATION.md)",
        "prefix": PREFIX,
        "tiers": DEFAULT_RETENTION,
        "budget": {
            "alertMonthlyUsd": ALERT_MONTHLY_CENTS / 100,
            "capMonthlyUsd": CAP_MONTHLY_CENTS / 100,
        },
        "notes": [
            "egress R2 = US$0 — restore drill trimestral não gera custo de saída",
            "a poda LOCAL continua 100% com o mecanismo tiered do Paperclip "
            "(decisão AID-2950 D1) — este pipeline nunca deleta dump local",
        ],
        "updatedAt": utcnow_iso(),
    }
    body = json.dumps(policy, indent=2, ensure_ascii=False).encode()
    client._request(
        "PUT",
        key=LIFECYCLE_KEY,
        body=body,
        headers={"content-type": "application/json"},
    ).read()
    return {
        "action": "bootstrap",
        "bucket": client.bucket,
        "created": created,
        "createNote": create_note,
        "lifecyclePolicyObject": LIFECYCLE_KEY,
        "retention": DEFAULT_RETENTION,
        "status": "ok",
    }


# --------------------------------------------------------------- replicate


def cmd_replicate(client: S3Client, args: argparse.Namespace) -> dict:
    source = Path(args.from_dir)
    local = []
    for path in sorted(source.iterdir()):
        if parse_dump_name(path.name) is not None:
            local.append(path)
    if not local:
        return {
            "action": "replicate",
            "from": str(source),
            "uploaded": [],
            "skipped": [],
            "status": "EMPTY",
            "generatedAt": utcnow_iso(),
        }
    uploaded, skipped, problems = [], [], []
    for path in local:
        key = PREFIX + path.name
        remote = head_object(client, key)
        digest, size = sha256_of(path)
        if remote is not None:
            if remote["bytes"] == size:
                skipped.append({"key": key, "bytes": size, "reason": "size-match"})
                continue
            problems.append(
                f"{key}: tamanho remoto {remote['bytes']} != local {size} "
                "— imutável, NÃO sobrescrito (intervenção manual)"
            )
            continue
        body = path.read_bytes()
        if len(body) != size:  # dump trocou no disco durante leitura
            problems.append(f"{key}: arquivo mudou durante leitura — abortado")
            continue
        client._request(
            "PUT",
            key=key,
            body=body,
            headers={
                "content-type": "application/gzip",
                "x-amz-meta-sha256": digest,
                "x-amz-meta-source": "paperclip-db:backup-loop",
            },
        ).read()
        check = head_object(client, key)
        if check is None or check["bytes"] != size:
            problems.append(f"{key}: HEAD pós-PUT divergente ({check})")
            continue
        uploaded.append(
            {"key": key, "bytes": size, "sha256": digest, "headOk": True}
        )
    report: dict = {
        "action": "replicate",
        "from": str(source),
        "localDumps": len(local),
        "uploaded": uploaded,
        "skipped": skipped,
        "problems": problems,
        "status": "ok" if not problems else "FAILED",
        "generatedAt": utcnow_iso(),
    }
    if args.prune and not problems:
        report["retention"] = apply_retention(client, dry_run=False)
    return report


# --------------------------------------------------------------- retention


def select_retention_deletions(
    objects: list[dict],
    now: dt.datetime,
    policy: dict,
) -> dict:
    """Tiers: horário (recente) → diário (último do dia) → mensal (último do mês).

    Dumps são nomeados em UTC (`parse_dump_name`). Só objetos sob PREFIX com
    nome parseável entram; chaves não-parseadas NUNCA são deletadas (uncertain
    purpose → surfaced, não removida).
    """
    dumps = [o for o in objects if not o.get("unparsed") and o["at"] is not None]
    horizon_hours = now - dt.timedelta(days=policy["keepHoursDays"])
    horizon_daily = now - dt.timedelta(days=policy["keepDailyDays"])
    horizon_monthly = now - dt.timedelta(days=policy["keepMonthlyMonths"] * 31)

    by_day: dict[str, dict] = {}
    by_month: dict[str, dict] = {}
    for obj in dumps:
        day = obj["at"].strftime("%Y-%m-%d")
        month = obj["at"].strftime("%Y-%m")
        if day not in by_day or obj["at"] > by_day[day]["at"]:
            by_day[day] = obj
        if month not in by_month or obj["at"] > by_month[month]["at"]:
            by_month[month] = obj

    keep = set()
    for obj in dumps:
        if obj["at"] >= horizon_hours:
            keep.add(obj["key"])  # janela horária recente: tudo fica
    for day, obj in by_day.items():
        if obj["at"] >= horizon_daily:
            keep.add(obj["key"])  # último do dia dentro de keepDailyDays
    for month, obj in by_month.items():
        if obj["at"] >= horizon_monthly:
            keep.add(obj["key"])  # último do mês dentro de keepMonthlyMonths

    delete = [obj for obj in dumps if obj["key"] not in keep]
    delete.sort(key=lambda o: o["key"])
    kept = [obj for obj in dumps if obj["key"] in keep]
    kept.sort(key=lambda o: o["key"])
    return {
        "policy": policy,
        "asOf": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "keep": [o["key"] for o in kept],
        "delete": [o["key"] for o in delete],
        "bytesKept": sum(o["bytes"] for o in kept),
        "bytesDeleted": sum(o["bytes"] for o in delete),
    }


def apply_retention(client: S3Client, dry_run: bool) -> dict:
    objects = list_objects(client)
    unparsed = [o["key"] for o in objects if o.get("unparsed")]
    plan = select_retention_deletions(objects, dt.datetime.now(dt.timezone.utc), DEFAULT_RETENTION)
    deleted: list[str] = []
    if not dry_run:
        for key in plan["delete"]:
            client._request("DELETE", key=key).read()
            deleted.append(key)
    return {
        "action": "retention",
        "dryRun": dry_run,
        "objects": len(objects),
        "unparsedNotTouched": unparsed,
        "deleted": deleted,
        "planned": plan["delete"],
        "kept": len(plan["keep"]),
        "bytesDeleted": plan["bytesDeleted"],
        "bytesKept": plan["bytesKept"],
        "status": "ok",
        "generatedAt": utcnow_iso(),
    }


def cmd_retention(client: S3Client, args: argparse.Namespace) -> dict:
    return apply_retention(client, dry_run=not args.apply)


# ------------------------------------------------------------------ verify


def cmd_verify(client: S3Client, args: argparse.Namespace) -> dict:
    objects = list_objects(client)
    local_dir = Path(args.from_dir) if args.from_dir else None
    problems: list[str] = []
    checked = 0
    for obj in objects:
        if obj.get("unparsed"):
            problems.append(f"{obj['key']}: nome não parseado — surfaced")
            continue
        remote = head_object(client, obj["key"])
        if remote is None:
            problems.append(f"{obj['key']}: HEAD 404 no listing")
            continue
        checked += 1
        if remote["bytes"] != obj["bytes"]:
            problems.append(f"{obj['key']}: size HEAD {remote['bytes']} != listing {obj['bytes']}")
        local_path = local_dir / Path(obj["key"]).name if local_dir else None
        if local_path and local_path.exists():
            if local_path.stat().st_size != remote["bytes"]:
                problems.append(
                    f"{obj['key']}: size remoto != local "
                    f"({remote['bytes']} != {local_path.stat().st_size})"
                )
            if args.deep:
                raw = read_response(client._request("GET", key=obj["key"]))
                digest = hashlib.sha256(raw).hexdigest()
                if remote["sha256"] and digest != remote["sha256"]:
                    problems.append(f"{obj['key']}: sha256 deep divergente do meta")
        elif args.deep and not remote["sha256"]:
            problems.append(f"{obj['key']}: sem meta sha256 (deep check impossível)")
    report = {
        "action": "verify",
        "bucket": client.bucket,
        "objects": len(objects),
        "headChecked": checked,
        "deep": bool(args.deep),
        "problems": problems,
        "ok": not problems,
        "status": "ok" if not problems else "FAILED",
        "generatedAt": utcnow_iso(),
    }
    return report


# ------------------------------------------------------------------ budget


def cmd_budget(client: S3Client, _: argparse.Namespace) -> dict:
    objects = list_objects(client)
    total_bytes = sum(obj["bytes"] for obj in objects)
    gb = total_bytes / (1000 ** 3)
    storage_usd = gb * R2_STORAGE_USD_PER_GB_MONTH
    estimate_cents = round(storage_usd * 100)
    level = "ok"
    if estimate_cents >= CAP_MONTHLY_CENTS:
        level = "cap_exceeded"
    elif estimate_cents >= ALERT_MONTHLY_CENTS:
        level = "alert"
    return {
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


# ------------------------------------------------------------------ restore


def cmd_restore_latest(client: S3Client, args: argparse.Namespace) -> dict:
    objects = [o for o in list_objects(client) if o["at"] is not None]
    if not objects:
        return {"action": "restore-latest", "status": "EMPTY"}
    newest = max(objects, key=lambda o: o["at"])
    target = Path(args.into)
    target.mkdir(parents=True, exist_ok=True)
    raw = read_response(client._request("GET", key=newest["key"]))
    digest = hashlib.sha256(raw).hexdigest()
    problems = []
    remote = head_object(client, newest["key"]) or {}
    if remote.get("sha256") and digest != remote["sha256"]:
        problems.append(
            f"{newest['key']}: sha256 {digest[:12]}… != meta {remote['sha256'][:12]}…"
        )
    out = target / Path(newest["key"]).name
    if not problems:
        out.write_bytes(raw)
    return {
        "action": "restore-latest",
        "key": newest["key"],
        "bytes": newest["bytes"],
        "sha256": digest,
        "metaSha256": remote.get("sha256", ""),
        "into": str(out),
        "problems": problems,
        "status": "ok" if not problems else "FAILED",
        "generatedAt": utcnow_iso(),
    }


# ---------------------------------------------------------------- self-test


class FakeS3:
    """Fake S3 in-process (stdlib http.server) para e2e sem rede/creds.

    Subconjunto usado pelo replicador; exige header Authorization AWS SigV4
    em toda requisição (valida que o cliente assina tudo).
    """

    from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

    def __init__(self) -> None:
        self.buckets: dict[str, dict[str, dict]] = {}

        class Handler(self.BaseHTTPRequestHandler):
            outer = self

            def _auth(self) -> None:
                auth = self.headers.get("Authorization", "")
                if not auth.startswith("AWS4-HMAC-SHA256"):
                    self._reply(403, "AccessDenied", "missing SigV4 Authorization")

            def _reply(self, status: int, code: str, message: str) -> None:
                payload = (
                    f'<?xml version="1.0"?><Error><Code>{code}</Code>'
                    f"<Message>{message}</Message></Error>"
                ).encode()
                self.send_response(status)
                self.send_header("Content-Type", "application/xml")
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
                    for k, v in urllib.parse.parse_qs(
                        parsed.query, keep_blank_values=True
                    ).items()
                }
                return bucket, key, query

            def do_PUT(self) -> None:  # noqa: N802 — nome exigido pelo http.server
                self._auth()
                bucket, key, _ = self._split()
                body = self._body()
                if bucket not in self.outer.buckets:
                    if not key:
                        self.outer.buckets[bucket] = {}
                        self.send_response(200)
                        self.send_header("Content-Length", "0")
                        self.end_headers()
                        return
                    self._reply(404, "NoSuchBucket", bucket)
                    return
                self.outer.buckets[bucket][key] = {
                    "body": body,
                    "sha256": self.headers.get("x-amz-meta-sha256", ""),
                }
                self.send_response(200)
                self.send_header("Content-Length", "0")
                self.end_headers()

            def do_HEAD(self) -> None:  # noqa: N802
                self._auth()
                bucket, key, _ = self._split()
                obj = self.outer.buckets.get(bucket, {}).get(key)
                if obj is None:
                    self._reply(404, "NoSuchKey", key)
                    return
                self.send_response(200)
                self.send_header("Content-Length", str(len(obj["body"])))
                if obj["sha256"]:
                    self.send_header("x-amz-meta-sha256", obj["sha256"])
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
                self.send_response(200)
                self.send_header("Content-Length", str(len(obj["body"])))
                if obj["sha256"]:
                    self.send_header("x-amz-meta-sha256", obj["sha256"])
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

        threading.Thread(target=self.server.serve_forever, daemon=True).start()

    def stop(self) -> None:
        self.server.shutdown()
        self.server.server_close()


def cmd_self_test(_: argparse.Namespace) -> dict:
    import tempfile

    fake = FakeS3()
    fake.start()
    steps: list[dict] = []
    try:
        os.environ["ADS_BACKUPS_ENDPOINT"] = f"http://127.0.0.1:{fake.port}"
        os.environ["ADS_BACKUPS_ACCESS_KEY_ID"] = "test-key"
        os.environ["ADS_BACKUPS_SECRET_ACCESS_KEY"] = "test-secret"
        os.environ["ADS_BACKUPS_REGION"] = "us-east-1"
        os.environ["ADS_BACKUPS_BUCKET"] = "aidevschool-backups"

        def run(cli_args: list[str]) -> dict:
            proc = subprocess.run(
                [sys.executable, str(Path(__file__).resolve()), *cli_args],
                capture_output=True,
                text=True,
                check=False,
            )
            if proc.returncode != 0:
                raise AssertionError(
                    f"{cli_args} rc={proc.returncode}\n{proc.stdout}\n{proc.stderr}"
                )
            return json.loads(proc.stdout)

        with tempfile.TemporaryDirectory() as tmp:
            source = Path(tmp) / "backups"
            source.mkdir()
            now = dt.datetime.now(dt.timezone.utc)

            def seed(name: str, payload: bytes) -> None:
                (source / name).write_bytes(payload)

            # janela horária: hoje (3 dumps) e ontem (2)
            today = now.strftime("%Y%m%d")
            yday = (now - dt.timedelta(days=1)).strftime("%Y%m%d")
            seed(f"paperclip-{today}-010000.sql.gz", b"d0a")
            seed(f"paperclip-{today}-020000.sql.gz", b"d0b")
            seed(f"paperclip-{today}-030000.sql.gz", b"d0c")
            seed(f"paperclip-{yday}-220000.sql.gz", b"d1a")
            seed(f"paperclip-{yday}-230000.sql.gz", b"d1b")
            # tier diário: 10 dias atrás, dois dumps no mesmo dia (fica o último)
            d10 = (now - dt.timedelta(days=10)).strftime("%Y%m%d")
            seed(f"paperclip-{d10}-010000.sql.gz", b"d10a")
            seed(f"paperclip-{d10}-230000.sql.gz", b"d10b")
            # tier mensal: 90 dias atrás (fora de 30d, dentro de 12 meses)
            d90 = (now - dt.timedelta(days=90)).strftime("%Y%m%d")
            seed(f"paperclip-{d90}-010000.sql.gz", b"d90a")
            seed(f"paperclip-{d90}-020000.sql.gz", b"d90b")

            steps.append(run(["bootstrap"]))
            rep = run(["replicate", "--from", str(source)])
            steps.append(rep)
            assert len(rep["uploaded"]) == 9, rep
            # idempotência: segunda passada só skip
            rep2 = run(["replicate", "--from", str(source)])
            steps.append(rep2)
            assert not rep2["uploaded"] and len(rep2["skipped"]) == 9, rep2

            plan = run(["retention"])  # dry-run default
            steps.append(plan)
            # dentro da janela horária (2d) tudo fica; d10/d90 só o último do dia/mês
            expected_deleted = {
                PREFIX + f"paperclip-{d10}-010000.sql.gz",
                PREFIX + f"paperclip-{d90}-010000.sql.gz",
            }
            assert set(plan["planned"]) == expected_deleted, plan
            applied = run(["retention", "--apply"])
            steps.append(applied)
            assert set(applied["deleted"]) == expected_deleted, applied

            ver = run(["verify", "--from", str(source)])
            steps.append(ver)
            assert ver["status"] == "ok", ver
            bud = run(["budget"])
            steps.append(bud)
            assert bud["status"] == "ok", bud

            restored = run(["restore-latest", "--into", str(Path(tmp) / "down")])
            steps.append(restored)
            assert restored["status"] == "ok", restored
            latest_name = f"paperclip-{today}-030000.sql.gz"
            assert restored["key"] == PREFIX + latest_name, restored
            got = (Path(tmp) / "down" / latest_name).read_bytes()
            assert got == b"d0c", got

        return {"action": "self-test", "status": "PASS", "steps": steps}
    finally:
        fake.stop()


# --------------------------------------------------------------------- main


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("bootstrap", help="cria bucket + objeto de policy")
    replicate = sub.add_parser("replicate", help="sobe dumps novos (idempotente)")
    replicate.add_argument("--from", dest="from_dir", default="/paperclip/instances/default/data/backups")
    replicate.add_argument("--prune", action="store_true", help="aplica retention após upload")
    verify = sub.add_parser("verify", help="listing + HEAD (+ deep vs local)")
    verify.add_argument("--deep", action="store_true")
    verify.add_argument("--from", dest="from_dir", default="/paperclip/instances/default/data/backups")
    retention = sub.add_parser("retention", help="poda tiered off-box (dry-run default)")
    retention.add_argument("--apply", action="store_true")
    sub.add_parser("budget", help="bytes medidos → US$ vs alerta/teto")
    restore = sub.add_parser("restore-latest", help="baixa o dump mais novo + sha256")
    restore.add_argument("--into", required=True)
    sub.add_parser("self-test", help="e2e contra fake S3 in-process (sem rede)")
    return parser


def main() -> int:
    args = build_parser().parse_args()
    if args.command == "self-test":
        result = cmd_self_test(args)
    else:
        result = globals()[f"cmd_{args.command.replace('-', '_')}"](
            client_from_env(), args
        )
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if result.get("status") in ("ok", "PASS") else 1


if __name__ == "__main__":
    raise SystemExit(main())
