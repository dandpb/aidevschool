"""Public deterministic core for learner-gate skill packages.

Implements the §4.2 exit-code convention, the §7.1 hash-chained append-only
ledger, atomic §8.3 writes, the §8.3.1 lockfile, ULID minting, and the
§5.3 round-half-up gap helper. Imported by every entry script; never a CLI.
"""

from __future__ import annotations

import hashlib
import json
import os
import sys
import time
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Iterator, NoReturn

# --- exit-code convention (§4.2) -------------------------------------------
# 0 success; 1 usage / guard rejection (no mutation); 2 inconsistency.


class SkillError(Exception):
    """Guard rejection — exit 1, one plain-language stderr sentence."""

    code = 1


class InconsistencyError(Exception):
    """Schema / chain / cycle violation — exit 2."""

    code = 2


def die(message: str, code: int) -> NoReturn:
    """Print exactly one sentence to stderr and exit with code."""
    sys.stderr.write(message.rstrip(".") + ".\n")
    sys.exit(code)
def read_args() -> dict[str, Any]:
    """Read one JSON object from stdin; exit 1 on any failure."""
    raw = sys.stdin.read()
    try:
        obj = json.loads(raw)
    except Exception:
        die("Could not read JSON arguments from stdin", 1)
        raise  # unreachable: die() exits; satisfies type checkers
    if not isinstance(obj, dict):
        die("stdin arguments must be one JSON object", 1)
        raise  # unreachable
    return obj


def require(obj: dict[str, Any], key: str) -> Any:
    if key not in obj:
        die(f"Missing required argument {key}", 1)
    return obj[key]


# --- time + hashing --------------------------------------------------------
#
# Injectable sources (ADR seam for §12 byte-for-byte acceptance): the real
# implementation reads wall-clock time and uuid4; a fixture clock / ULID
# minter can be injected so ledger lines reproduce pinned event ids and
# timestamps exactly.

_now_fn: Callable[[], datetime] | None = None
_ulid_fn: Callable[[], str] | None = None


def set_clock(fn: Callable[[], datetime]) -> None:
    """Inject a fixture clock: fn returns a tz-aware datetime (converted to UTC)."""
    global _now_fn
    _now_fn = fn


def set_ulid_minter(fn: Callable[[], str]) -> None:
    """Inject a fixture ULID minter (e.g. a deterministic sequence for replay)."""
    global _ulid_fn
    _ulid_fn = fn


def reset_sources() -> None:
    """Restore real wall-clock time and uuid4-backed ULIDs."""
    global _now_fn, _ulid_fn
    _now_fn = None
    _ulid_fn = None


# --- Process-visible fixture source (§12 CLI acceptance) -------------------
# In-process set_clock/set_ulid_minter only help direct imports; §12 drives the
# scripts as executables. When AIDEVSCHOOL_FIXTURE_DIR is set, each appended
# event draws its event_id and ts from <dir>/ulids.txt and <dir>/ts.txt,
# indexed by the ledger's current line count. That index is deterministic and
# identical across separate subprocess invocations (each re-reads the persisted
# ledger), so the CLI path reproduces pinned ledger bytes exactly.
FIXTURE_DIR_ENV = "AIDEVSCHOOL_FIXTURE_DIR"
_fixture_cache: dict[str, list[str]] = {}


def _fixture_dir() -> str | None:
    d = os.environ.get(FIXTURE_DIR_ENV)
    return d if d and os.path.isdir(d) else None


def _fixture_lines(name: str) -> list[str] | None:
    if name in _fixture_cache:
        return _fixture_cache[name]
    d = _fixture_dir()
    if d is None:
        return None
    p = os.path.join(d, name)
    if not os.path.isfile(p):
        return None
    with open(p, encoding="utf-8") as fh:
        lines = [ln.strip() for ln in fh.read().splitlines() if ln.strip()]
    _fixture_cache[name] = lines
    return lines


def ledger_line_count(state_dir: Path) -> int:
    path = ledger_path(state_dir)
    if not path.exists():
        return 0
    return sum(1 for ln in path.read_text(encoding="utf-8").splitlines() if ln.strip())


def mint_ulid(idx: int) -> str:
    seq = _fixture_lines("ulids.txt")
    if seq is not None:
        if idx >= len(seq):
            die(f"Fixture ulids.txt exhausted at index {idx}", 2)
        return seq[idx]
    return ulid()


def mint_ts(idx: int) -> str:
    seq = _fixture_lines("ts.txt")
    if seq is not None:
        if idx >= len(seq):
            die(f"Fixture ts.txt exhausted at index {idx}", 2)
        return seq[idx]
    return utc_now_iso()


def utc_now_iso() -> str:
    """ISO 8601 UTC, second precision, trailing Z (spec format)."""
    if _now_fn is not None:
        dt = _now_fn().astimezone(timezone.utc).replace(microsecond=0)
        return dt.isoformat().replace("+00:00", "Z")
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def parse_iso(ts: str) -> datetime:
    if ts.endswith("Z"):
        ts = ts[:-1] + "+00:00"
    return datetime.fromisoformat(ts)


def sha256_hex(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def round_half_up(x: float) -> int:
    """Decimal round-half-up (§5.3): 4.5 -> 5, 6.75 -> 7, 13.5 -> 14."""
    import decimal

    return int(decimal.Decimal(x).quantize(decimal.Decimal("1"), rounding=decimal.ROUND_HALF_UP))


def gap_days(target_days: int) -> int:
    """§5.3 gap rule: max(1, round_half_up(0.15 * T))."""
    return max(1, round_half_up(0.15 * target_days))


# --- ULID (Crockford base32, time-sortable, 26 chars, §7.1) ----------------

_B32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"  # no I, L, O, U


def _ulid_from_ms(ms: int, ent: int) -> str:
    """10 base32 chars of ms timestamp + 16 of entropy (Crockford, 26 total)."""
    ts_chars = [_B32[(ms >> (45 - 5 * i)) & 0x1F] for i in range(10)]
    ent_chars = [_B32[(ent >> (75 - 5 * i)) & 0x1F] for i in range(16)]
    return "".join(ts_chars + ent_chars)


def ulid() -> str:
    """Time-sortable ULID. Uses the injected minter when set, else uuid4."""
    if _ulid_fn is not None:
        return _ulid_fn()
    ms = int(time.time() * 1000)
    return _ulid_from_ms(ms, int.from_bytes(uuid.uuid4().bytes, "big"))


# --- JSON I/O + atomic write (§8.3) ----------------------------------------


def read_json(path: Path) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        die(f"Required file not found: {path}", 1)
    except json.JSONDecodeError as exc:
        die(f"Invalid JSON in {path}: {exc}", 2)


def emit_json(obj: Any) -> None:
    """Write one JSON line to stdout (§4.2 script output contract)."""
    sys.stdout.write(json.dumps(obj, ensure_ascii=False) + "\n")


def atomic_write_json(path: Path, obj: Any) -> None:
    """Write-temp-then-rename (§8.3 atomic commit). state.json/plan.json are
    pretty-printed for audit; only ledger lines are byte-pinned (hash chain)."""
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    data = json.dumps(obj, ensure_ascii=False, indent=2)
    tmp.write_text(data, encoding="utf-8")
    os.replace(tmp, path)


# --- §8.3.1 lockfile -------------------------------------------------------

LOCKNAME = ".aidevschool.lock"


@contextmanager
def state_lock(state_dir: Path) -> Iterator[None]:
    """Exclusive create-or-fail lock over $STATE_DIR (§8.3.1)."""
    lock = state_dir / LOCKNAME
    state_dir.mkdir(parents=True, exist_ok=True)
    try:
        fd = os.open(str(lock), os.O_CREAT | os.O_EXCL | os.O_WRONLY)
        os.write(fd, str(os.getpid()).encode())
        os.close(fd)
    except FileExistsError:
        die("Another tutor session holds the state lock; stop and retry later", 1)
    try:
        yield
    finally:
        try:
            lock.unlink()
        except FileNotFoundError:
            pass


# --- §7.1 hash-chained append-only ledger ----------------------------------

LEDGER = "ledger.jsonl"


def ledger_path(state_dir: Path) -> Path:
    return state_dir / LEDGER


def canonical(obj: Any) -> str:
    """The ONE canonical ledger serializer (§7.1): json.dumps with DEFAULT
    separators (", ", ": ") and ensure_ascii=False (raw UTF-8 artifact).
    Proven to reproduce the pinned lines byte-for-byte: sha256 of each line
    1059–1062 equals the next line's prev_sha256. Changing this voids the chain."""
    return json.dumps(obj, ensure_ascii=False)


def read_ledger(state_dir: Path) -> list[dict[str, Any]]:
    path = ledger_path(state_dir)
    if not path.exists():
        return []
    out = []
    for ln, raw in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        if not raw.strip():
            continue
        try:
            out.append(json.loads(raw))
        except json.JSONDecodeError:
            die(f"Corrupt ledger line {ln}", 2)
    return out


def last_line_sha(state_dir: Path) -> str | None:
    """SHA-256 of the last ledger line exactly as written (no newline)."""
    path = ledger_path(state_dir)
    if not path.exists():
        return None
    lines = path.read_text(encoding="utf-8").splitlines()
    lines = [ln for ln in lines if ln.strip()]
    if not lines:
        return None
    return sha256_hex(lines[-1])


def append_event(
    state_dir: Path,
    type_: str,
    concept_id: str | None,
    payload: dict[str, Any],
    ts: str | None = None,
) -> str:
    """Append one hash-chained ledger line; return its event_id.

    Idempotent: callers gate on a payload idempotency key before appending.
    """
    path = ledger_path(state_dir)
    path.parent.mkdir(parents=True, exist_ok=True)
    idx = ledger_line_count(state_dir)
    event_id = mint_ulid(idx)
    when = ts or mint_ts(idx)
    line = {
        "event_id": event_id,
        "ts": when,
        "type": type_,
        "concept_id": concept_id,
        "payload": payload,
        "prev_sha256": last_line_sha(state_dir),
    }
    with open(path, "a", encoding="utf-8") as fh:
        fh.write(canonical(line) + "\n")
    return event_id


def idempotency_keys(state_dir: Path) -> set[str]:
    """All payload idempotency keys already in the ledger."""
    keys: set[str] = set()
    for ev in read_ledger(state_dir):
        p = ev.get("payload", {})
        for k in ("attempt_id", "lesson_id", "idem_key", "plan_version"):
            if k in p:
                keys.add(f"{k}|{p[k]}")
        # review_due carries idem_key explicitly
    return keys


# --- §9.2 gate-integrity manifest ------------------------------------------
# A tampered key or rubric silently corrupts verdicts. The manifest hash detects
# it: install.py writes keys/.manifest.sha256 over keys/ + rubrics/; every script
# verifies at startup and exits 2 on mismatch (the chain detects tampered
# evidence; the manifest detects tampered instruments).
MANIFEST_NAME = ".manifest.sha256"


def manifest_hash(skill_dir: Path) -> str:
    h = hashlib.sha256()
    for folder in ("keys", "rubrics"):
        d = skill_dir / folder
        if not d.is_dir():
            continue
        for f in sorted(d.glob("*.json")):
            if f.name == MANIFEST_NAME:
                continue
            h.update(f.name.encode())
            h.update(f.read_bytes())
    return h.hexdigest()


def write_manifest(skill_dir: Path) -> Path:
    path = skill_dir / "keys" / MANIFEST_NAME
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(manifest_hash(skill_dir), encoding="utf-8")
    return path


def verify_manifest(skill_dir: Path) -> None:
    """Exit 2 if keys/ or rubrics/ diverge from the stored manifest (§9.2). A
    missing manifest is a no-op (pre-install / direct-constructed state)."""
    path = skill_dir / "keys" / MANIFEST_NAME
    if not path.is_file():
        return
    if manifest_hash(skill_dir) != path.read_text(encoding="utf-8").strip():
        die("Gate integrity check failed: keys/ or rubrics/ diverge from the install manifest", 2)
