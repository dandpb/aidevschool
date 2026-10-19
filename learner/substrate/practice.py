"""Guided-practice conclusion gate for the learner substrate (AID-5005).

A verified conclusion of a guided practice (``curriculum/sequencia-dev-guiada``
cycle: exemplo → tentativa → rúbrica → retry → takeaway) advances the unit's
FSRS card through the SAME scheduling seam as lesson gates — one rating
vocabulary, one replay path — while NEVER writing mastery: a practice is
re-exposure, not a mastery claim (AID-3534: local evidence is never a mastery
write).

Producer/verifier split: the OS practice app produces a deterministic receipt
(``guided-practice-evidence v1`` shape); this module is the independent
verifier. It re-checks every conclusion condition from the receipt payload
against the canonical catalog record (content pin, criterion set, verdict
policy, attempt cap, takeaway answers) before mapping the outcome to an FSRS
rating via :data:`RATING_FROM_GATE` — the single rating source. Nothing the
learner *feels* enters the scheduler.

Invariant: dado uma conclusão verificada da prática P na data D com tentativa N,
o cartão FSRS da unidade ``sequencia-dev-guiada:P`` avança exatamente uma vez
(rating ``good`` se N=1, ``hard`` se N>1), ``mastered`` permanece ``false`` e a
fila diária (`derive_next_reviews`) reflete o novo ``due`` na próxima derivação.
"""

from __future__ import annotations

import hashlib
import json
from copy import deepcopy
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any

from learner.substrate import commit_canonical, resolve_canonical_path, validate
from learner.substrate.mission_catalog_guided_practice import (
    GUIDED_PRACTICE_UNIT_PREFIX,
)
from learner.substrate.scheduling import RATING_FROM_GATE, record_gate_outcome

#: Evidence class label recorded on every practice gate review (ADR-0004
#: pattern: evidence classes stay labelled; a practice receipt never carries
#: code-gate mutation/coverage metrics, and never masters a unit).
PRACTICE_GATE_KIND = "guided_practice"

#: Verifier identity recorded in ``evidence_verifier_source``. The substrate
#: (not the OS app that produced the receipt) is the verifier of record.
PRACTICE_VERIFIER_SOURCE = "learner.substrate.practice"

#: Receipts are persisted here (repo-relative), one JSON file per conclusion.
PRACTICE_RECEIPTS_DIR = "learner/practice_receipts"

#: Verdict vocabulary per family policy — mirrors the OS cycle machine
#: (engines/codexdojo-os-prototype/src/practice/guidedPracticeCycle.ts):
#: graded practices allow met / partial-with-justification; daily practices
#: are binary sufficient/insufficient with a 2-attempt conclusion cap.
_GRADED_PASSING = frozenset({"met"})
_DAILY_PASSING = frozenset({"sufficient"})
_FAMILY_POLICY: dict[str, dict[str, Any]] = {
    "graded": {
        "allowed": frozenset({"met", "partial", "not_met"}),
        "passing": _GRADED_PASSING,
        "partial_ok": True,
        "attempt_cap": None,
    },
    "daily": {
        "allowed": frozenset({"sufficient", "insufficient"}),
        "passing": _DAILY_PASSING,
        "partial_ok": False,
        "attempt_cap": 2,
    },
}


class PracticeReceiptError(ValueError):
    """Raised when a practice receipt fails independent verification."""


def _require_mapping(value: Any, label: str) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise PracticeReceiptError(f"{label} must be a mapping")
    return value


def _require_nonempty_str(value: Any, label: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise PracticeReceiptError(f"{label} must be a non-empty string")
    return value


def practice_unit_id(practice_id: str) -> str:
    """Canonical units_log id for a guided practice."""
    return f"{GUIDED_PRACTICE_UNIT_PREFIX}{practice_id}"


def _verify_receipt_envelope(receipt: dict[str, Any]) -> None:
    if receipt.get("schema") != "guided-practice-evidence":
        raise PracticeReceiptError("receipt.schema must be 'guided-practice-evidence'")
    if type(receipt.get("version")) is not int or receipt["version"] != 1:
        raise PracticeReceiptError("receipt.version must be the integer 1")
    if "verifier" in receipt:
        raise PracticeReceiptError("receipt must not embed a producer-controlled verifier")
    if receipt.get("phase") != "concluida":
        raise PracticeReceiptError("receipt.phase must be 'concluida'")


def _verify_catalog_identity(receipt: dict[str, Any], practice: dict[str, Any]) -> None:
    for key in ("practice_id", "content_version"):
        value = _require_nonempty_str(receipt.get(key), f"receipt.{key}")
        if value != practice.get(key):
            raise PracticeReceiptError(
                f"receipt.{key} {value!r} does not match the canonical"
                f" package ({practice.get(key)!r})"
            )


def _receipt_family_policy(receipt: dict[str, Any]) -> tuple[str, dict[str, Any]]:
    family = receipt.get("family")
    policy = _FAMILY_POLICY.get(family if isinstance(family, str) else "")
    if policy is None:
        raise PracticeReceiptError(f"receipt.family must be one of {sorted(_FAMILY_POLICY)}")
    return family, policy


def _verify_attempt(receipt: dict[str, Any], policy: dict[str, Any]) -> int:
    attempt = receipt.get("attempt")
    if not isinstance(attempt, int) or isinstance(attempt, bool) or attempt < 1:
        raise PracticeReceiptError("receipt.attempt must be a positive integer")
    cap = policy["attempt_cap"]
    if cap is not None and attempt > cap:
        raise PracticeReceiptError(
            f"receipt.attempt {attempt} exceeds the {receipt['family']} conclusion cap {cap}"
        )
    return attempt


def _verify_assessment(criterion_id: str, raw: Any, policy: dict[str, Any]) -> None:
    assessment = _require_mapping(raw, f"receipt.assessments[{criterion_id!r}]")
    verdict = assessment.get("verdict")
    if not isinstance(verdict, str) or verdict not in policy["allowed"]:
        raise PracticeReceiptError(f"assessments[{criterion_id!r}].verdict is outside the policy vocabulary")
    if verdict in policy["passing"]:
        _require_nonempty_str(assessment.get("evidence"), f"assessments[{criterion_id!r}].evidence")
        return
    if policy["partial_ok"] and verdict == "partial":
        _require_nonempty_str(
            assessment.get("partial_justification"),
            f"assessments[{criterion_id!r}].partial_justification",
        )
        return
    raise PracticeReceiptError(f"assessments[{criterion_id!r}].verdict {verdict!r} does not pass")


def _verify_assessments(receipt: dict[str, Any], expected: list[str], policy: dict[str, Any]) -> None:
    assessments = _require_mapping(receipt.get("assessments"), "receipt.assessments")
    if not assessments or set(assessments) != set(expected):
        raise PracticeReceiptError(
            f"receipt.assessments must cover exactly the canonical rubric criteria {expected}"
        )
    for criterion_id, raw in assessments.items():
        _require_nonempty_str(criterion_id, "receipt.assessments criterion")
        _verify_assessment(criterion_id, raw, policy)


def _verify_reflection(receipt: dict[str, Any]) -> None:
    steps = receipt.get("step_evidence")
    if not isinstance(steps, list) or not steps:
        raise PracticeReceiptError("receipt.step_evidence must be a non-empty list")
    for step in steps:
        _require_nonempty_str(step, "receipt.step_evidence item")
    takeaway = _require_mapping(receipt.get("takeaway"), "receipt.takeaway")
    for key in ("a", "b"):
        _require_nonempty_str(takeaway.get(key), f"receipt.takeaway.{key}")
    _to_utc_datetime(receipt.get("concluded_at"))


def verify_practice_conclusion(receipt: dict[str, Any], practice: dict[str, Any]) -> dict[str, str]:
    """Verify the declared receipt and every conclusion condition against the catalog."""
    receipt = _require_mapping(receipt, "receipt")
    _verify_receipt_envelope(receipt)
    _verify_catalog_identity(receipt, practice)
    family, policy = _receipt_family_policy(receipt)
    attempt = _verify_attempt(receipt, policy)
    _verify_assessments(receipt, list(practice.get("rubric_criteria") or []), policy)
    _verify_reflection(receipt)
    outcome = "pass_first_try" if attempt == 1 else "pass_retried"
    return {"outcome": outcome, "rating": RATING_FROM_GATE[outcome], "family": family}


def _receipt_bytes(receipt: dict[str, Any]) -> bytes:
    return json.dumps(
        receipt, sort_keys=True, ensure_ascii=False, indent=1
    ).encode("utf-8") + b"\n"


def practice_receipt_digest(receipt: dict[str, Any]) -> str:
    """Stable identity of the exact serialized conclusion, shared by replay/readback."""
    return hashlib.sha256(_receipt_bytes(receipt)).hexdigest()


def persist_practice_receipt(
    root: Path, receipt: dict[str, Any], concluded_at: datetime
) -> tuple[str, str]:
    """Persist the receipt under ``learner/practice_receipts/`` (atomic write).

    Returns ``(repo_relative_path, sha256_hex)`` of the written bytes. File
    name includes (practice, date, sequence). The transition checks the exact
    receipt digest before calling this writer, so a replay does not fork the trail.
    """
    receipts_dir = root / PRACTICE_RECEIPTS_DIR
    receipts_dir.mkdir(parents=True, exist_ok=True)
    stamp = concluded_at.astimezone(timezone.utc).strftime("%Y%m%d")
    base = f"{receipt['practice_id']}-{stamp}"
    sequence = 1
    while (receipts_dir / f"{base}-{sequence:02d}.json").exists():
        sequence += 1
    path = receipts_dir / f"{base}-{sequence:02d}.json"
    payload = _receipt_bytes(receipt)
    tmp = path.with_suffix(".json.tmp")
    tmp.write_bytes(payload)
    tmp.replace(path)
    relative = path.relative_to(root).as_posix()
    return relative, hashlib.sha256(payload).hexdigest()


def _bound_receipt_bytes(evidence_path: str | Path, root: Path) -> tuple[bytes | None, list[str]]:
    candidate = Path(evidence_path)
    candidate = candidate if candidate.is_absolute() else root / candidate
    try:
        resolved = candidate.resolve(strict=True)
        resolved.relative_to(root.resolve())
        return resolved.read_bytes(), []
    except FileNotFoundError:
        return None, [f"evidence_file points at a missing path: {evidence_path!r}"]
    except ValueError:
        return None, [f"evidence_file escapes root: {evidence_path!r}"]
    except OSError:
        return None, [f"evidence_file cannot be read: {evidence_path!r}"]


def _receipt_shape_violations(raw_bytes: bytes) -> list[str]:
    try:
        raw = _require_mapping(json.loads(raw_bytes.decode("utf-8")), "evidence_file")
        # Persistence validation checks shape/policy, not catalog freshness. The
        # transition independently pins the criterion set and content version.
        assessments = _require_mapping(raw.get("assessments"), "receipt.assessments")
        practice = {
            "practice_id": raw.get("practice_id"),
            "content_version": raw.get("content_version"),
            "rubric_criteria": list(assessments),
        }
        verify_practice_conclusion(raw, practice)
    except (UnicodeDecodeError, json.JSONDecodeError, PracticeReceiptError) as exc:
        return [f"evidence_file is not a well-formed conclusion receipt: {exc}"]
    return []


def bound_practice_receipt_violations(
    evidence_path: str | Path,
    expected_digests: str | list[str],
    root: Path,
) -> list[str]:
    """Require a confined, digest-bound, producer-owned conclusion receipt."""
    raw_bytes, errors = _bound_receipt_bytes(evidence_path, root)
    if raw_bytes is None:
        return errors
    digests = [expected_digests] if isinstance(expected_digests, str) else expected_digests
    if hashlib.sha256(raw_bytes).hexdigest() not in digests:
        errors.append("evidence_file does not match the digest recorded by the verifier")
    return errors + _receipt_shape_violations(raw_bytes)


def _practice_review_violations(
    review: dict[str, Any], unit_id: str, root: Path
) -> list[str]:
    digest, path = review.get("evidence_digest"), review.get("evidence_attempt_id")
    if not isinstance(digest, str) or not isinstance(path, str):
        return ["guided_practice review must record evidence_digest/path"]
    errors = bound_practice_receipt_violations(path, digest, root)
    if errors:
        return errors
    raw_bytes, _ = _bound_receipt_bytes(path, root)
    receipt = json.loads(raw_bytes)
    if practice_unit_id(receipt["practice_id"]) != unit_id:
        errors.append("guided_practice receipt identity does not match its unit")
    if review.get("evidence_scenario_id") != receipt["practice_id"]:
        errors.append("guided_practice receipt identity does not match its review")
    return errors


def practice_review_trail_violations(unit: dict[str, Any], root: Path) -> list[str]:
    """Every practice gate review's confined receipt must still back its digest."""
    errors: list[str] = []
    for review in unit.get("reviews") or []:
        if isinstance(review, dict) and review.get("gate_kind") == PRACTICE_GATE_KIND:
            errors.extend(_practice_review_violations(review, unit.get("unit_id", ""), root))
    return errors


def _practice_entry(state: dict[str, Any], unit_id: str) -> dict[str, Any] | None:
    return next(
        (item for item in state.get("units_log", []) if item.get("unit_id") == unit_id),
        None,
    )


def _already_recorded(entry: dict[str, Any] | None, digest: str) -> bool:
    if entry is None:
        return False
    return any(
        review.get("gate_kind") == PRACTICE_GATE_KIND and review.get("evidence_digest") == digest
        for review in entry.get("reviews", [])
    )


def _require_valid_state(state: dict[str, Any], root: Path) -> None:
    errors = validate(state, root)
    if errors:
        raise PracticeReceiptError(f"practice conclusion violates substrate invariants: {errors}")


def _append_practice_review(
    state: dict[str, Any], practice: dict[str, Any], review: dict[str, Any], today: date
) -> None:
    unit_id = practice_unit_id(practice["practice_id"])
    entry = _practice_entry(state, unit_id)
    if entry is None:
        entry = {
            "unit_id": unit_id,
            "concept": practice.get("title", unit_id),
            "kind": "concept",
            "project": "sequencia-dev-guiada",
            "reviews": [{"date": today, "event": "presented"}],
        }
        state.setdefault("units_log", []).append(entry)
    entry.update(
        mastered=False,
        gate_kind=PRACTICE_GATE_KIND,
        evidence_file=review["evidence_attempt_id"],
        attempt_file=review["evidence_attempt_id"],
    )
    entry.setdefault("reviews", []).append(review)


def _practice_gate_review(
    receipt: dict[str, Any], verified: dict[str, str], today: date,
    receipt_path: str, digest: str,
) -> dict[str, Any]:
    evidence_ts = _to_utc_datetime(receipt["concluded_at"]).astimezone(timezone.utc)
    return {
        "date": today,
        "event": "gate",
        "rating": verified["rating"],
        "gate_outcome": verified["outcome"],
        "gate_kind": PRACTICE_GATE_KIND,
        "evidence_ts": evidence_ts.isoformat(),
        "evidence_digest": digest,
        "evidence_run_id": f"sha256:{digest}",
        "evidence_attempt_id": receipt_path,
        "evidence_attempt_digest": digest,
        "evidence_scenario_id": receipt["practice_id"],
        "evidence_verifier_source": PRACTICE_VERIFIER_SOURCE,
    }


def _practice_next_action(
    receipt: dict[str, Any], verified: dict[str, str]
) -> dict[str, str]:
    hint = receipt.get("next_review_hint")
    return {
        "owner": "leader",
        "action": (
            f"Practice {receipt['practice_id']} concluded"
            f" (guided_practice gate, rating {verified['rating']})."
            " Re-exposure scheduled by FSRS"
            + (f" (hint: {hint})" if hint else "")
            + "; pick the next mission or lesson."
        ),
    }


def transition_practice_conclusion(
    state: dict[str, Any],
    *,
    receipt: dict[str, Any],
    practice: dict[str, Any],
    today: date,
    root: Path | None = None,
) -> dict[str, Any]:
    """Apply a verified practice conclusion, persisting its receipt exactly once.

    Appends exactly one gate review (``gate_kind`` = ``guided_practice``) to
    the practice unit, extends the streak, and leaves ``mastered`` untouched
    (stays ``false`` — practice is re-exposure, never mastery). Raises
    :class:`PracticeReceiptError` when the receipt fails verification or the
    resulting state violates substrate invariants.
    """
    verified = verify_practice_conclusion(receipt, practice)
    root = root or Path.cwd()
    _require_valid_state(state, root)
    entry = _practice_entry(state, practice_unit_id(receipt["practice_id"]))
    if entry is not None and entry.get("mastered"):
        raise PracticeReceiptError("a practice conclusion cannot touch a mastered unit")
    digest = practice_receipt_digest(receipt)
    if _already_recorded(entry, digest):
        return deepcopy(state)
    new_state = deepcopy(state)
    receipt_path, digest = persist_practice_receipt(
        root, receipt, _to_utc_datetime(receipt["concluded_at"])
    )
    try:
        review = _practice_gate_review(receipt, verified, today, receipt_path, digest)
        _append_practice_review(new_state, practice, review, today)
        new_state["streak"] = record_gate_outcome(new_state.get("streak", {}), True, today)
        new_state["next_action"] = _practice_next_action(receipt, verified)
        _require_valid_state(new_state, root)
    except Exception:
        # This call owns a newly created sequence file; a rejected transition
        # must not leave it behind as apparent evidence of a committed review.
        (root / receipt_path).unlink(missing_ok=True)
        raise
    return new_state


def commit_practice_conclusion(
    state: dict[str, Any],
    *,
    receipt: dict[str, Any],
    practice: dict[str, Any],
    today: date,
    root: Path | None = None,
    path: str | Path = "learner/learning_state.yaml",
) -> dict[str, Any]:
    """Verify + transition + persist (mirrors ``commit_gate_transition``)."""
    target = resolve_canonical_path(path).resolve()
    resolved_root = root or (
        target.parent.parent if target.parent.name == "learner" else Path.cwd()
    )
    transitioned = transition_practice_conclusion(
        state,
        receipt=receipt,
        practice=practice,
        today=today,
        root=resolved_root,
    )
    commit_canonical(transitioned, path)
    return transitioned


def _to_utc_datetime(value: Any) -> datetime:
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if isinstance(value, str):
        try:
            parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError as exc:
            raise PracticeReceiptError("receipt.concluded_at must be an ISO-8601 timestamp") from exc
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
    raise PracticeReceiptError(
        "receipt.concluded_at must be an ISO-8601 timestamp"
    )
