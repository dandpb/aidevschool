"""Semantic judgment enrichment for the learner substrate.

Replaces string-shape parsing with typed judgments (TypeSafe/Jev System One)
at the one seam where code reads human-written prose: pitfall-recurrence
counting (``snapshot_sources.pitfalls_from_markdown``) and the Dreyfus/Bloom
overall level (``snapshot_sources.profile_matrix``). The deterministic
parsers stay as the fallback: this module only ever *overrides* their
outputs when a client is injected, and every judgment is recorded as an
auditable NDJSON receipt under ``learner/judgment_receipts/``.

Hard boundary (spaced-repetition ADR): judgments never produce FSRS
ratings. Ratings come only from gate outcomes via ``scheduling.py``; this
module exposes no rating and feeds no scheduling input beyond the pitfall
list it already receives.

Enrichment is injection-only: ``build_snapshot`` never reads the
environment. The sync entry constructs the real client from
``TYPESAFE_API_KEY`` and passes it down, so library callers (and the
existing test suite) stay deterministic and offline by default.
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable

from shared.fsio import atomic_write_text

ROOT = Path(__file__).resolve().parent.parent.parent

#: Receipts land beside the gate's verifier receipts, in their own directory:
#: gate receipts are evidence-grade, judgment receipts are advisory.
DEFAULT_RECEIPTS_ROOT = ROOT / "learner" / "judgment_receipts"

API_URL = "https://api.typesafe.ai/v1/systemone"
MODEL = "jev-latest"

#: A journal entry counts as a recurrence of a pitfall at/above this Noul
#: probability (validated separation on the real journal: unrelated entries
#: at 0.04, true recurrences at 0.5-0.92).
RECURRENCE_THRESHOLD = 0.5

#: A pitfall in ``pitfalls.md`` happened at least once — the semantic count
#: never falls below this (mirrors the parser's ``1 + ...`` semantics).
MIN_OCCURRENCES = 1

#: Receipt files kept after each write (task Unresolved 1 default).
RECEIPT_RETENTION = 30

_RETRYABLE_STATUSES = frozenset({429, 529})
_MAX_ATTEMPTS = 4
_TIMEOUT_SECS = 30

DREYFUS_STAGES: dict[str, str] = {
    "novice": "Needs step-by-step instruction to act",
    "advanced_beginner": "Recognizes situations but needs rules to decide",
    "competent": "Plans deliberately; handles complexity in familiar territory",
    "proficient": "Sees situations holistically; adapts rules to context",
    "expert": "Intuitive grasp; works from deep pattern experience",
}

BLOOM_LEVELS: dict[str, str] = {
    "remember": "Recalls concepts and facts",
    "understand": "Explains concepts in own words",
    "apply": "Uses concepts in concrete tasks",
    "analyze": "Breaks problems down and relates concepts",
    "evaluate": "Judges work against criteria and defends judgments",
    "create": "Produces new designs combining concepts",
}


class JudgmentError(RuntimeError):
    """A judgment call failed; callers fall back to deterministic values."""

    def __init__(self, message: str, error_class: str | None = None) -> None:
        self.error_class = error_class or type(self).__name__
        super().__init__(message)


# ---------------------------------------------------------------------------
# Clients: a client is a callable (state, questions) -> answers
# ---------------------------------------------------------------------------


def http_client(
    api_key: str,
    *,
    api_url: str = API_URL,
    model: str = MODEL,
    timeout: int = _TIMEOUT_SECS,
) -> Callable[[dict[str, Any], dict[str, Any]], dict[str, Any]]:
    """Build the real TypeSafe client: one batched POST per sweep."""

    def call(state: dict[str, Any], questions: dict[str, Any]) -> dict[str, Any]:
        body = json.dumps(
            {"state": state, "model": model, "questions": questions}
        ).encode("utf-8")
        last_error: urllib.error.HTTPError | None = None
        for attempt in range(_MAX_ATTEMPTS):
            request = urllib.request.Request(
                api_url,
                data=body,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
            )
            try:
                with urllib.request.urlopen(request, timeout=timeout) as response:
                    payload = json.load(response)
                break
            except urllib.error.HTTPError as exc:
                if exc.code in _RETRYABLE_STATUSES and attempt < _MAX_ATTEMPTS - 1:
                    time.sleep(2**attempt)
                    last_error = exc
                    continue
                raise JudgmentError(
                    f"judgment API HTTP {exc.code}", error_class="HTTPError"
                ) from exc
            except (urllib.error.URLError, TimeoutError) as exc:
                raise JudgmentError(
                    f"judgment API unreachable: {exc}", error_class="URLError"
                ) from exc
        else:  # pragma: no cover - every retryable attempt raised
            raise JudgmentError(
                f"judgment API exhausted retries: {last_error}", error_class="HTTPError"
            )
        answers = payload.get("answers")
        if not isinstance(answers, dict) or set(answers) != set(questions):
            raise JudgmentError("judgment API answers do not match asked questions")
        return answers

    return call


def memoized(
    client: Callable[[dict[str, Any], dict[str, Any]], dict[str, Any]],
) -> Callable[[dict[str, Any], dict[str, Any]], dict[str, Any]]:
    """Cache answers by input digest for one client's lifetime.

    A sync builds several views from the same source files; without this,
    each view's snapshot re-asks identical questions (4 sweeps and drifting
    answers per sync instead of one consistent sweep).
    """
    cache: dict[str, dict[str, Any]] = {}

    def wrapped(state: dict[str, Any], questions: dict[str, Any]) -> dict[str, Any]:
        digest = _input_digest(state, questions)
        if digest not in cache:
            cache[digest] = client(state, questions)
        return cache[digest]

    return wrapped


def default_client() -> Callable[[dict[str, Any], dict[str, Any]], dict[str, Any]] | None:
    """The client for the sync entry: real client when a key is configured."""
    try:
        from dotenv import load_dotenv

        load_dotenv(ROOT / ".env")
    except ImportError:  # pragma: no cover - dotenv is an existing dependency
        pass
    api_key = os.getenv("TYPESAFE_API_KEY")
    return memoized(http_client(api_key)) if api_key else None


# ---------------------------------------------------------------------------
# Receipts
# ---------------------------------------------------------------------------


def _utc_stamp() -> str:
    # Microsecond resolution: two syncs in the same second must not clobber
    # each other's receipts (auditable history, newest-wins pruning by name).
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")


def _input_digest(state: dict[str, Any], questions: dict[str, Any]) -> str:
    canonical = json.dumps(
        {"state": state, "questions": questions},
        sort_keys=True,
        ensure_ascii=False,
    ).encode("utf-8")
    return hashlib.sha256(canonical).hexdigest()


def _prune_receipts(receipts_root: Path) -> None:
    # Digest names are not time-sortable: keep the newest by mtime.
    receipts = sorted(
        (p for p in receipts_root.glob("*.ndjson") if p.is_file()),
        key=lambda p: p.stat().st_mtime,
    )
    for stale in receipts[:-RECEIPT_RETENTION]:
        stale.unlink()


def _write_ok_receipt(
    kind: str,
    state: dict[str, Any],
    questions: dict[str, Any],
    answers: dict[str, Any],
    payload_meta: dict[str, Any],
    receipts_root: Path,
) -> None:
    # Digest-named file: a re-sweep of identical inputs overwrites in place
    # instead of duplicating, so receipts map 1:1 to distinct sweeps.
    digest = _input_digest(state, questions)
    now = _utc_stamp()
    name = f"{kind}-{digest[:16]}.ndjson"
    lines = []
    for question_id, question in questions.items():
        answer = answers.get(question_id, {})
        lines.append(
            json.dumps(
                {
                    "kind": kind,
                    "question": question_id,
                    "answer": answer.get("choice", answer.get("noul")),
                    "probabilities": answer.get("probabilities"),
                    "model": payload_meta.get("model", MODEL),
                    "usage": payload_meta.get("usage", {}),
                    "input_digest": digest,
                    "timestamp": now,
                    "status": "ok",
                },
                ensure_ascii=False,
            )
        )
    receipts_root.mkdir(parents=True, exist_ok=True)
    atomic_write_text(receipts_root / name, "\n".join(lines) + "\n")
    _prune_receipts(receipts_root)


def _write_fallback_receipt(
    kind: str,
    state: dict[str, Any],
    questions: dict[str, Any],
    error_class: str,
    receipts_root: Path,
) -> None:
    receipts_root.mkdir(parents=True, exist_ok=True)
    now = _utc_stamp()
    digest = _input_digest(state, questions)
    line = json.dumps(
        {
            "kind": kind,
            "question": None,
            "answer": None,
            "probabilities": None,
            "model": MODEL,
            "usage": {},
            "input_digest": digest,
            "timestamp": now,
            "status": "fallback",
            "error_class": error_class,
        },
        ensure_ascii=False,
    )
    atomic_write_text(
        receipts_root / f"{kind}-{digest[:16]}-fallback.ndjson", line + "\n"
    )
    _prune_receipts(receipts_root)


# ---------------------------------------------------------------------------
# Enrichment helpers (used by dashboard_snapshot when a client is injected)
# ---------------------------------------------------------------------------


def _journal_entries(journal_path: Path) -> dict[str, dict[str, str]]:
    entries: dict[str, dict[str, str]] = {}
    if not journal_path.exists():
        return entries
    parts = re.split(r"^### ", journal_path.read_text(encoding="utf-8"), flags=re.MULTILINE)
    for part in parts[1:]:
        title, _, body = part.partition("\n")
        entries[f"e{len(entries):02d}"] = {
            "title": title.strip(),
            "body": body.strip()[:1200],
        }
    return entries


def semantic_pitfall_occurrences(
    pitfalls: list[dict[str, Any]],
    pitfalls_path: Path,
    journal_path: Path,
    client: Callable[[dict[str, Any], dict[str, Any]], dict[str, Any]],
    receipts_root: Path | None = None,
) -> list[dict[str, Any]]:
    """Replace first-word substring occurrence counts with semantic ones.

    Order, ids, descriptions and dates are preserved; only ``occurrences``
    changes. Any failure returns the input unchanged (deterministic
    fallback) plus a fallback receipt.
    """
    receipts_root = receipts_root or DEFAULT_RECEIPTS_ROOT
    try:
        entries = _journal_entries(journal_path)
        known = pitfalls_path.read_text(encoding="utf-8") if pitfalls_path.exists() else ""
        state = {"known_pitfalls": known, "entries": entries}
    except Exception as exc:  # reading sources failed: nothing to judge
        _write_fallback_receipt(
            "pitfalls", {"note": "source read failed"}, {}, type(exc).__name__, receipts_root
        )
        return pitfalls
    questions: dict[str, Any] = {}
    for pitfall in pitfalls:
        pid = pitfall.get("id", "P-000")
        for entry_id in entries:
            questions[f"{pid}__{entry_id}"] = {
                "type": "noul",
                "instructions": (
                    f"Does `entries.{entry_id}` describe the learner repeating, "
                    "suffering from, or explicitly guarding against the same "
                    "mistake as any entry in `known_pitfalls` (claiming mastery "
                    "or levels from non-executable work such as documentation, "
                    "dashboards, contract review, or ungated backfill "
                    "artifacts)? Mentioning the theme in passing without it "
                    "affecting the work does not count."
                ),
                "criteria": {
                    "true": "The entry's work was affected by, corrected for, or repeated this mistake",
                    "false": "The entry does not involve this mistake",
                },
            }
    if not questions:
        return pitfalls
    try:
        answers = client(state, questions)
        if not isinstance(answers, dict) or set(answers) != set(questions):
            raise JudgmentError("judgment answers do not match asked questions")
        enriched: list[dict[str, Any]] = []
        for pitfall in pitfalls:
            pid = pitfall.get("id", "P-000")
            hits = sum(
                1
                for entry_id in entries
                if _noul_value(answers.get(f"{pid}__{entry_id}")) >= RECURRENCE_THRESHOLD
            )
            updated = dict(pitfall)
            updated["occurrences"] = max(MIN_OCCURRENCES, hits)
            enriched.append(updated)
        _write_ok_receipt("pitfalls", state, questions, answers, {}, receipts_root)
        return enriched
    except JudgmentError as exc:
        _write_fallback_receipt("pitfalls", state, questions, exc.error_class, receipts_root)
        return pitfalls
    except Exception as exc:  # defensive: enrichment must never break a sync
        _write_fallback_receipt(
            "pitfalls", state, questions, type(exc).__name__, receipts_root
        )
        return pitfalls


def _noul_value(answer: Any) -> float:
    if isinstance(answer, dict):
        value = answer.get("noul")
        if isinstance(value, (int, float)) and not isinstance(value, bool):
            return float(value)
    return 0.0


def semantic_profile_levels(
    profile_path: Path,
    current: dict[str, str],
    client: Callable[[dict[str, Any], dict[str, Any]], dict[str, Any]],
    receipts_root: Path | None = None,
) -> dict[str, str]:
    """Replace first-row keyword matching with Choice judgments.

    Returns ``{"dreyfus": ..., "bloom": ...}`` from the canonical stage and
    level vocabularies; any failure returns ``current`` unchanged.
    """
    receipts_root = receipts_root or DEFAULT_RECEIPTS_ROOT
    try:
        profile_text = (
            profile_path.read_text(encoding="utf-8") if profile_path.exists() else ""
        )
    except Exception as exc:  # reading the profile failed: nothing to judge
        _write_fallback_receipt(
            "profile", {"note": "source read failed"}, {}, type(exc).__name__, receipts_root
        )
        return current
    state = {
        "profile_text": profile_text,
        "note": "profile_text contains the competency matrix table, one row per concept, with each row's Dreyfus stage and Bloom level (sometimes only in Portuguese)",
    }
    questions = {
        "dreyfus_overall": {
            "type": "choice",
            "instructions": (
                "Judging only from the competency matrix rows in `profile_text`, "
                "which single Dreyfus stage best describes this learner's "
                "OVERALL current stage across the concepts listed?"
            ),
            "criteria": DREYFUS_STAGES,
        },
        "bloom_overall": {
            "type": "choice",
            "instructions": (
                "Judging only from the competency matrix rows in `profile_text`, "
                "which single Bloom cognitive level best describes the HIGHEST "
                "level this learner consistently demonstrates across the "
                "concepts listed?"
            ),
            "criteria": BLOOM_LEVELS,
        },
    }
    try:
        answers = client(state, questions)
        if not isinstance(answers, dict) or set(answers) != set(questions):
            raise JudgmentError("judgment answers do not match asked questions")
        dreyfus = _choice_value(answers.get("dreyfus_overall"), DREYFUS_STAGES)
        bloom = _choice_value(answers.get("bloom_overall"), BLOOM_LEVELS)
        _write_ok_receipt("profile", state, questions, answers, {}, receipts_root)
        return {"dreyfus": dreyfus, "bloom": bloom}
    except JudgmentError as exc:
        _write_fallback_receipt("profile", state, questions, exc.error_class, receipts_root)
        return current
    except Exception as exc:  # defensive: enrichment must never break a sync
        _write_fallback_receipt(
            "profile", state, questions, type(exc).__name__, receipts_root
        )
        return current


def _choice_value(answer: Any, vocabulary: dict[str, str]) -> str:
    if isinstance(answer, dict):
        choice = answer.get("choice")
        if choice in vocabulary:
            return str(choice)
    raise JudgmentError(
        f"choice answer outside vocabulary: {answer!r}", error_class="JudgmentError"
    )
