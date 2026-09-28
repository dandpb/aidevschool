#!/usr/bin/env python3
"""Drill de restore do Paperclip DB — AID-2953 (decisão CEO AID-2950).

Prova de que a cópia off-box é utilizável: baixa (ou recebe) um dump
`paperclip-*.sql.gz`, confere sha256, inicializa um PG DESCARTÁVEL com os
binários do PG embutido do Paperclip (@embedded-postgres; sem psql — por isso
`pg_miniclient.py`), restaura o dump via simple query + COPY FROM stdin e
roda sanity checks (tabelas, row counts, spot-check de issue conhecida).

Fail-closed: o dump é UMA transação (BEGIN…COMMIT); qualquer erro SQL aborta
o drill com FAILED. O cluster de drill vive em diretório temporário e é
destruído no fim (a não ser com --keep).

Storage preserva evidência e reporta recibos — nunca avalia (producer ≠
verifier).

Uso:
  restore_drill.py --dump DUMP.sql.gz [--pg-bin DIR] [--port N]
                   [--spot-issue AID-XXXX] [--keep]
  restore_drill.py --from-bucket --into DIR   # baixa via db_backup_replicator
                   (args restantes idem; requer env ADS_BACKUPS_*)
"""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from pg_miniclient import PGConnection, PGError  # noqa: E402

DEFAULT_PG_BIN = (
    "/usr/local/lib/node_modules/paperclipai/node_modules/"
    "@embedded-postgres/linux-x64/native/bin"
)
BREAKPOINT_RE = re.compile(r"^-- paperclip statement breakpoint ")
COPY_FROM_RE = re.compile(r"^COPY\s+.*\sFROM\s+stdin\s*;", re.IGNORECASE)
READ_SIZE = 1 << 20


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


def run(cmd: list[str], **kwargs) -> subprocess.CompletedProcess[str]:
    return subprocess.run(cmd, capture_output=True, text=True, check=False, **kwargs)


class DrillPG:
    """Cluster PG descartável (initdb + pg_ctl) com binários do PG embutido."""

    def __init__(self, pg_bin: Path, workdir: Path, port: int):
        self.pg_bin = pg_bin
        self.datadir = workdir / "pgdata"
        self.sockdir = workdir / "sock"
        self.logfile = workdir / "postgres.log"
        self.port = port

    def init(self) -> str:
        self.sockdir.mkdir(parents=True, exist_ok=True)
        proc = run(
            [
                str(self.pg_bin / "initdb"),
                "-D", str(self.datadir),
                "-U", "postgres",
                "-A", "trust",
                "--no-locale",
                "-E", "UTF8",
            ]
        )
        if proc.returncode != 0:
            raise RuntimeError(f"initdb falhou: {proc.stderr[-2000:]}")
        # pg_ctl -w sonda porta/socket lendo postgresql.conf — passar por -o
        # NÃO entra no probe (timeout "could not start" com server vivo).
        conf = self.datadir / "postgresql.conf"
        with conf.open("a") as handle:
            handle.write(
                f"\n# drill (AID-2953) — descartável\n"
                f"port = {self.port}\n"
                f"listen_addresses = '127.0.0.1'\n"
                f"unix_socket_directories = '{self.sockdir}'\n"
                "fsync = off\n"
                "synchronous_commit = off\n"
                "full_page_writes = off\n"
            )
        return "initdb ok (superuser postgres, auth trust, UTF8; conf de drill aplicada)"

    def start(self) -> str:
        ctl_out = self.datadir.parent / "pg_ctl.out"
        with ctl_out.open("wb") as sink:
            proc = subprocess.run(
                [str(self.pg_bin / "pg_ctl"), "-D", str(self.datadir),
                 "-l", str(self.logfile), "-w", "start"],
                stdout=sink, stderr=subprocess.STDOUT, check=False,
            )
        if proc.returncode != 0:
            log_tail = ""
            if self.logfile.exists():
                log_tail = self.logfile.read_text(errors="replace")[-1500:]
            raise RuntimeError(
                f"pg_ctl start falhou (rc={proc.returncode}); postgres.log tail:\n{log_tail}"
            )
        return f"postgres up em 127.0.0.1:{self.port} (fsync=off — descartável)"

    def stop(self) -> str:
        proc = run([str(self.pg_bin / "pg_ctl"), "-D", str(self.datadir), "-m", "immediate", "stop"])
        return "pg_ctl stop: rc=" + str(proc.returncode)


def dump_tail(dump: Path, keep: int = 400) -> str:
    """Últimos bytes decomprimidos do dump (detecção de truncamento)."""
    import gzip

    tail = ""
    with gzip.open(dump, "rb") as handle:
        while chunk := handle.read(1 << 20):
            tail = (tail + chunk.decode("utf-8", "replace"))[-keep:]
    return tail


def cmd_check(dump: Path) -> dict:
    """Drill step 0: dump termina com COMMIT? (dump truncado não restaura).

    O dumper emite um breakpoint comment APÓS o COMMIT final — linhas
    trailing de breakpoint são aceitas e desconsideradas.
    """
    tail = dump_tail(dump)
    lines = [
        line
        for line in tail.splitlines()
        if line.strip() and not BREAKPOINT_RE.match(line.strip())
    ]
    ends_ok = bool(lines) and lines[-1].strip() == "COMMIT;"
    return {
        "endsWithCommit": ends_ok,
        "tailPreview": tail[-160:],
        "status": "ok" if ends_ok else "TRUNCATED",
    }


def iter_statements(dump: Path):
    """Stream O(1): yields ('sql', texto) / ('copy', header) / ('data', bytes).

    O dump usa `-- paperclip statement breakpoint` antes de cada statement;
    blocos `COPY … FROM stdin;` carregam dados até a linha `\\.` — tudo é
    lido linha a linha (um bloco pode ter ~1GB: nada de bufferizar bloco).
    """
    import gzip

    handle = gzip.open(dump, "rt", encoding="utf-8", errors="replace")
    buf: list[str] = []
    copy_mode = False
    try:
        for raw in handle:
            line = raw.rstrip("\n")
            if copy_mode:
                if line == "\\.":
                    copy_mode = False
                    continue
                yield ("data", (line + "\n").encode("utf-8"))
                continue
            if BREAKPOINT_RE.match(line):
                if buf:
                    yield ("sql", "\n".join(buf))
                    buf = []
                continue
            buf.append(line)
            if COPY_FROM_RE.match(line.strip()):
                yield ("copy", "\n".join(buf))
                buf = []
                copy_mode = True
        if buf:
            yield ("sql", "\n".join(buf))
    finally:
        handle.close()


def restore_dump(conn: PGConnection, dump: Path) -> dict:
    statements = 0
    copy_blocks = 0
    data_bytes = 0
    errors: list[str] = []
    started = dt.datetime.now(dt.timezone.utc)
    stream = iter_statements(dump)
    pushback: list[tuple[str, object]] = []

    def data_lines():
        nonlocal data_bytes
        while True:
            if pushback:
                kind, payload = pushback.pop()
            else:
                try:
                    kind, payload = next(stream)
                except StopIteration:
                    return
            if kind == "data":
                data_bytes += len(payload)
                yield payload
            else:
                pushback.append((kind, payload))
                return

    while True:
        if pushback:
            kind, payload = pushback.pop()
        else:
            try:
                kind, payload = next(stream)
            except StopIteration:
                break
        try:
            if kind == "copy":
                conn.execute(payload, copy_stream=data_lines())
                copy_blocks += 1
            elif kind == "sql":
                if str(payload).strip():
                    conn.execute(payload)
                    statements += 1
        except PGError as error:
            context = payload if isinstance(payload, str) else str(payload)
            errors.append(f"{error} | statement: {context[:200]}")
            if len(errors) >= 3:
                break
    return {
        "statements": statements,
        "copyBlocks": copy_blocks,
        "copyDataBytes": data_bytes,
        "errors": errors,
        "seconds": round((dt.datetime.now(dt.timezone.utc) - started).total_seconds(), 1),
    }


def sanity_checks(conn: PGConnection, spot_issue: str) -> dict:
    _, _, tables = conn.execute(
        "SELECT table_name FROM information_schema.tables "
        "WHERE table_schema='public' ORDER BY table_name"
    )
    table_names = [row[0] for row in tables]
    counts: dict[str, int] = {}
    for name in table_names:
        tag, _, rows = conn.execute(f'SELECT COUNT(*) FROM "{name}"')
        counts[name] = int(rows[0][0]) if rows else -1
    spot = None
    if spot_issue:
        safe = spot_issue.replace("'", "''").replace("%", "\\%")
        _, cols, rows = conn.execute(
            f"SELECT title, status FROM issues "
            f"WHERE title ILIKE '%{safe}%' ORDER BY created_at LIMIT 3"
        )
        spot = {"columns": cols, "rows": [[str(c) for c in row] for row in rows]}
    return {"tables": len(table_names), "tableNames": table_names, "rowCounts": counts, "spotIssue": spot}


def main() -> int:
    parser = argparse.ArgumentParser(description="Drill de restore do Paperclip DB")
    parser.add_argument("--dump", help="dump .sql.gz local (já baixado do bucket)")
    parser.add_argument("--from-bucket", action="store_true",
                        help="baixa o dump mais novo via db_backup_replicator restore-latest")
    parser.add_argument("--into", help="dir do download (com --from-bucket)", default=None)
    parser.add_argument("--pg-bin", default=DEFAULT_PG_BIN)
    parser.add_argument("--port", type=int, default=55432)
    parser.add_argument("--spot-issue", default="verificar os caches",
                        help="trecho do título de issue conhecida p/ spot-check no restore")
    parser.add_argument("--keep", action="store_true", help="preserva o sandbox pós-drill")
    args = parser.parse_args()

    workdir = Path(tempfile.mkdtemp(prefix="aid2953-restore-drill-", dir="/tmp/opencode"))
    receipt: dict = {"action": "restore-drill", "sandbox": str(workdir), "generatedAt": utcnow_iso()}
    try:
        dump_path: Path | None = None
        if args.from_bucket:
            proc = run([sys.executable, str(Path(__file__).with_name("db_backup_replicator.py")),
                        "restore-latest", "--into", args.into or str(workdir / "download")])
            payload = json.loads(proc.stdout) if proc.stdout.strip() else {}
            receipt["download"] = payload
            if payload.get("status") != "ok":
                receipt["status"] = "FAILED"
                receipt["reason"] = "download do bucket falhou"
                return finish(receipt, workdir, args.keep)
            dump_path = Path(payload["into"])
        elif args.dump:
            dump_path = Path(args.dump)
        if not dump_path or not dump_path.exists():
            receipt["status"] = "FAILED"
            receipt["reason"] = "dump não informado/encontrado"
            return finish(receipt, workdir, args.keep)

        digest, size = sha256_of(dump_path)
        receipt["dump"] = {"path": str(dump_path), "bytes": size, "sha256": digest}
        receipt["completeness"] = cmd_check(dump_path)
        if receipt["completeness"]["status"] != "ok":
            receipt["status"] = "FAILED"
            receipt["reason"] = "dump truncado (sem COMMIT final) — não restaurável"
            return finish(receipt, workdir, args.keep)

        pg = DrillPG(Path(args.pg_bin), workdir, args.port)
        receipt["init"] = pg.init()
        receipt["start"] = pg.start()
        try:
            admin = PGConnection("127.0.0.1", args.port, "postgres", "postgres")
            admin.execute("CREATE DATABASE paperclip_restore_drill")
            admin.close()
            conn = PGConnection("127.0.0.1", args.port, "postgres", "paperclip_restore_drill")
            receipt["restore"] = restore_dump(conn, dump_path)
            if receipt["restore"]["errors"]:
                receipt["status"] = "FAILED"
                receipt["reason"] = "erro SQL durante restore (transação abortou)"
                return finish(receipt, workdir, args.keep, pg=pg, conn=conn)
            receipt["sanity"] = sanity_checks(conn, args.spot_issue)
            conn.close()
        finally:
            receipt.setdefault("stop", pg.stop())
        spot = receipt.get("sanity", {}).get("spotIssue")
        receipt["spotOk"] = bool(spot and spot.get("rows"))
        receipt["status"] = "PASS" if receipt.get("spotOk") or not args.spot_issue else "FAILED"
        if receipt["status"] == "FAILED":
            receipt["reason"] = f"spot-issue {args.spot_issue} não encontrada no restore"
        return finish(receipt, workdir, args.keep)
    except Exception as error:  # noqa: BLE001 — recibo de drill reporta tudo
        receipt["status"] = "FAILED"
        receipt["reason"] = f"{type(error).__name__}: {error}"
        return finish(receipt, workdir, args.keep)


def finish(receipt: dict, workdir: Path, keep: bool, pg: DrillPG | None = None, conn=None) -> int:
    if conn:
        try:
            conn.close()
        except Exception:  # noqa: BLE001
            pass
    if pg:
        try:
            receipt.setdefault("stop", pg.stop())
        except Exception:  # noqa: BLE001
            pass
    if not keep:
        shutil.rmtree(workdir, ignore_errors=True)
        receipt["sandboxCleaned"] = True
    print(json.dumps(receipt, ensure_ascii=False, indent=2))
    return 0 if receipt.get("status") in ("PASS", "ok") else 1


if __name__ == "__main__":
    raise SystemExit(main())
