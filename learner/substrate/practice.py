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


def verify_practice_conclusion(receipt: dict[str, Any], practice: dict[str, Any]) -> dict[str, str]:
    """Independently verify a practice-conclusion receipt against the catalog.

    Returns the normalized ``{"outcome", "rating", "family"}`` mapping on
    success; raises :class:`PracticeReceiptError` on ANY conclusion condition
    failure. Deterministic: same receipt + same catalog record → same verdict.
    """
    receipt = _require_mapping(receipt, "receipt")
    practice_id = _require_nonempty_str(receipt.get("practice_id"), "receipt.practice_id")
    if practice_id != practice.get("practice_id"):
        raise PracticeReceiptError(
            f"receipt.practice_id {practice_id!r} does not match the canonical"
            f" practice {practice.get('practice_id')!r}"
        )
    version = _require_nonempty_str(receipt.get("content_version"), "receipt.content_version")
    if version != practice.get("content_version"):
        raise PracticeReceiptError(
            f"receipt.content_version {version!r} does not match the canonical"
            f" package ({practice.get('content_version')!r}); the conclusion"
            " graded content the catalog no longer serves"
        )
    if receipt.get("phase") != "concluida":
        raise PracticeReceiptError(
            "receipt.phase must be 'concluida'; only a verified conclusion"
            " writes an FSRS review"
        )
    family = receipt.get("family")
    policy = _FAMILY_POLICY.get(family if isinstance(family, str) else "")
    if policy is None:
        raise PracticeReceiptError(
            f"receipt.family must be one of {sorted(_FAMILY_POLICY)}"
        )

    attempt = receipt.get("attempt")
    if not isinstance(attempt, int) or isinstance(attempt, bool) or attempt < 1:
        raise PracticeReceiptError("receipt.attempt must be a positive integer")
    cap = policy["attempt_cap"]
    if cap is not None and attempt > cap:
        raise PracticeReceiptError(
            f"receipt.attempt {attempt} exceeds the {family} conclusion cap {cap}"
        )

    assessments = _require_mapping(
        receipt.get("assessments"), "receipt.assessments"
    )
    expected_criteria = list(practice.get("rubric_criteria") or [])
    if sorted(assessments.keys()) != sorted(expected_criteria):
        raise PracticeReceiptError(
            "receipt.assessments must cover exactly the canonical rubric"
            f" criteria {expected_criteria}; got {sorted(assessments.keys())}"
        )
    for criterion_id, raw in assessments.items():
        assessment = _require_mapping(raw, f"receipt.assessments[{criterion_id!r}]")
        verdict = assessment.get("verdict")
        if verdict not in policy["allowed"]:
            raise PracticeReceiptError(
                f"assessments[{criterion_id!r}].verdict {verdict!r} is outside"
                f" the {family} policy vocabulary {sorted(policy['allowed'])}"
            )
        if verdict not in policy["passing"]:
            if policy["partial_ok"] and verdict == "partial":
                justification = assessment.get("partial_justification")
                if not isinstance(justification, str) or not justification.strip():
                    raise PracticeReceiptError(
                        f"assessments[{criterion_id!r}] is 'partial' without a"
                        " written justification"
                    )
                continue
            raise PracticeReceiptError(
                f"assessments[{criterion_id!r}].verdict {verdict!r} does not"
                " pass; a conclusion requires every criterion passing"
            )
        evidence = assessment.get("evidence")
        if not isinstance(evidence, str) or not evidence.strip():
            raise PracticeReceiptError(
                f"assessments[{criterion_id!r}] passes without recorded evidence"
            )

    steps = receipt.get("step_evidence")
    if (
        not isinstance(steps, list)
        or not steps
        or any(not isinstance(step, str) or not step.strip() for step in steps)
    ):
        raise PracticeReceiptError(
            "receipt.step_evidence must be a non-empty list of non-empty strings"
        )

    takeaway = _require_mapping(receipt.get("takeaway"), "receipt.takeaway")
    for key in ("a", "b"):
        _require_nonempty_str(takeaway.get(key), f"receipt.takeaway.{key}")

    # Conclusion is verified. Attempt 1 → pass_first_try → good;
    # a conclusion after retry → pass_retried → hard (RATING_FROM_GATE is the
    # single rating source; no self-report ever reaches the scheduler).
    outcome = "pass_first_try" if attempt == 1 else "pass_retried"
    return {"outcome": outcome, "rating": RATING_FROM_GATE[outcome], "family": family}


def _receipt_bytes(receipt: dict[str, Any]) -> bytes:
    return json.dumps(
        receipt, sort_keys=True, ensure_ascii=False, indent=1
    ).encode("utf-8") + b"\n"


def persist_practice_receipt(
    root: Path, receipt: dict[str, Any], concluded_at: datetime
) -> tuple[str, str]:
    """Persist the receipt under ``learner/practice_receipts/`` (atomic write).

    Returns ``(repo_relative_path, sha256_hex)`` of the written bytes. File
    name is deterministic per (practice, date, sequence) so reruns of the same
    conclusion never fork the evidence trail.
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


def bound_practice_receipt_violations(
    evidence_path: str | Path,
    expected_digests: str | list[str],
    root: Path,
) -> list[str]:
    """Digest-bound check for guided-practice receipt evidence.

    Mirrors the no_code/literacy pattern in ``validate()``: the evidence file
    must exist under ``root``, hash to one of the digests recorded in the
    unit's practice gate reviews (a unit may conclude several practices, each
    with its own receipt), stay producer-owned (no embedded ``verifier``
    block) and remain a well-formed conclusion receipt.
    """
    prefix = "evidence_file"
    digests = [expected_digests] if isinstance(expected_digests, str) else list(
        expected_digests
    )
    candidate = Path(evidence_path)
    candidate = candidate if candidate.is_absolute() else root / candidate
    try:
        resolved = candidate.resolve(strict=True)
        resolved.relative_to(root.resolve())
    except FileNotFoundError:
        return [f"{prefix} points at a missing path: {evidence_path!r}"]
    except ValueError:
        return [f"{prefix} escapes root: {evidence_path!r}"]
    errors: list[str] = []
    raw_bytes = resolved.read_bytes()
    if hashlib.sha256(raw_bytes).hexdigest() not in digests:
        errors.append(
            f"{prefix} does not match any digest recorded by the verifier"
        )
    try:
        raw = json.loads(raw_bytes.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        return errors + [f"{prefix} is not valid UTF-8 JSON: {evidence_path!r}"]
    if not isinstance(raw, dict):
        return errors + [f"{prefix} is valid JSON but not an object: {evidence_path!r}"]
    if "verifier" in raw:
        errors.append(
            f"{prefix} embeds a producer-controlled 'verifier' block;"
            " the substrate is the verifier of record"
        )
    return errors


def practice_review_trail_violations(unit: dict[str, Any], root: Path) -> list[str]:
    """Every practice gate review's own receipt file must still back its digest.

    Each conclusion persists one receipt; the review records the receipt path
    (``evidence_attempt_id``) and its sha256 (``evidence_digest``). This keeps
    the whole trail honest, not just the unit-level pointer.
    """
    errors: list[str] = []
    for review in unit.get("reviews") or []:
        if not isinstance(review, dict):
            continue
        if review.get("gate_kind") != PRACTICE_GATE_KIND:
            continue
        digest = review.get("evidence_digest")
        path = review.get("evidence_attempt_id")
        if not isinstance(digest, str) or not isinstance(path, str):
            errors.append("guided_practice review must record evidence_digest/path")
            continue
        candidate = Path(path)
        candidate = candidate if candidate.is_absolute() else root / candidate
        try:
            raw_bytes = candidate.resolve(strict=True).read_bytes()
        except FileNotFoundError:
            errors.append(f"guided_practice receipt missing: {path!r}")
            continue
        if hashlib.sha256(raw_bytes).hexdigest() != digest:
            errors.append(
                f"guided_practice receipt {path!r} does not match the"
                " digest recorded by the verifier"
            )
    return errors


def transition_practice_conclusion(
    state: dict[str, Any],
    *,
    receipt: dict[str, Any],
    practice: dict[str, Any],
    today: date,
    root: Path | None = None,
) -> dict[str, Any]:
    """Apply a verified practice conclusion to the canonical state (pure).

    Appends exactly one gate review (``gate_kind`` = ``guided_practice``) to
    the practice unit, extends the streak, and leaves ``mastered`` untouched
    (stays ``false`` — practice is re-exposure, never mastery). Raises
    :class:`PracticeReceiptError` when the receipt fails verification or the
    resulting state violates substrate invariants.
    """
    verified = verify_practice_conclusion(receipt, practice)
    new_state = deepcopy(state)

    concluded_at = receipt.get("concluded_at")
    if isinstance(concluded_at, datetime):
        evidence_ts = concluded_at.astimezone(timezone.utc).isoformat()
    else:
        evidence_ts = _require_nonempty_str(
            concluded_at, "receipt.concluded_at"
        )

    if root is None:
        root = Path.cwd()
    receipt_path, digest = persist_practice_receipt(
        root, deepcopy(receipt), _to_utc_datetime(concluded_at)
    )

    unit_id = practice_unit_id(receipt["practice_id"])
    gate_review = {
        "date": today,
        "event": "gate",
        "rating": verified["rating"],
        "gate_outcome": verified["outcome"],
        "gate_kind": PRACTICE_GATE_KIND,
        "evidence_ts": evidence_ts,
        "evidence_digest": digest,
        "evidence_run_id": f"sha256:{digest}",
        "evidence_attempt_id": receipt_path,
        "evidence_attempt_digest": digest,
        "evidence_scenario_id": receipt["practice_id"],
        "evidence_verifier_source": PRACTICE_VERIFIER_SOURCE,
    }

    units_log = new_state.setdefault("units_log", [])
    entry = next(
        (item for item in units_log if item.get("unit_id") == unit_id), None
    )
    if entry is None:
        units_log.append(
            {
                "unit_id": unit_id,
                "concept": practice.get("title", unit_id),
                "kind": "concept",
                "project": "sequencia-dev-guiada",
                "mastered": False,  # a practice conclusion never masters
                "evidence_file": receipt_path,
                "attempt_file": receipt_path,
                "gate_kind": PRACTICE_GATE_KIND,
                "reviews": [
                    {"date": today, "event": "presented"},
                    gate_review,
                ],
            }
        )
    else:
        if entry.get("mastered"):
            raise PracticeReceiptError(
                f"{unit_id} is mastered; a practice conclusion cannot touch a"
                " mastered unit"
            )
        entry["mastered"] = False
        entry["gate_kind"] = PRACTICE_GATE_KIND
        entry["evidence_file"] = receipt_path
        entry["attempt_file"] = receipt_path
        entry.setdefault("reviews", []).append(gate_review)

    new_state["streak"] = record_gate_outcome(
        new_state.get("streak", {}), True, today
    )
    card_due_hint = receipt.get("next_review_hint")
    new_state["next_action"] = {
        "owner": "leader",
        "action": (
            f"Practice {receipt['practice_id']} concluded"
            f" (guided_practice gate, rating {verified['rating']})."
            " Re-exposure scheduled by FSRS"
            + (f" (hint: {card_due_hint})" if card_due_hint else "")
            + "; pick the next mission or lesson."
        ),
    }

    errors = validate(new_state, root)
    if errors:
        raise PracticeReceiptError(
            f"practice conclusion violates substrate invariants: {errors}"
        )
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
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
    raise PracticeReceiptError(
        "receipt.concluded_at must be an ISO-8601 timestamp"
    )
