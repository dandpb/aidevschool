"""Independent no-code verifier for LiteracyEvidenceRecord.

LiteracyDojo (the producer) emits raw evidence with ``verifierRequired: true``
and may record at most local ``completed``. It never writes ``mastered``.

This module re-judges the envelope in an isolated process and emits a
structured verdict/receipt. Open-ended application reports never become
mastery-eligible. Invalid or missing evidence fails closed.
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any

from learner.gate.security import parse_aware_timestamp

#: Matches LiteracyDojo domain evaluation default (MVP threshold).
PASS_SCORE_MIN = 0.75

EVIDENCE_SCHEMA_VERSION = 1
EVIDENCE_SOURCE = "literacydojo"
VERIFIER_SOURCE = "independent-literacy-verifier"

#: The seven activity types from docs/design/ai-literacy/content-contract.md and
#: engines/literacyDojo/src/domain/evaluation.ts (evaluateActivity switch).
#: Invented types are not accepted; unknown types fail closed.
DETERMINISTIC_ACTIVITY_TYPES = frozenset(
    {
        "choice",
        "sort",
        "missing_context",
        "safety_classification",
        "prompt_builder",
        "output_comparison",
        "rubric_review",
    }
)

#: Not real activity types in the content contract. Kept only so any legacy /
#: mistaken producer that labels open application this way never becomes
#: mastery-eligible (application stays fail-closed for mastery).
APPLICATION_ACTIVITY_TYPES = frozenset({"application_report", "real_world_application"})

REQUIRED_KEYS = (
    "schemaVersion",
    "source",
    "attemptId",
    "lessonId",
    "lessonVersion",
    "activityId",
    "activityType",
    "skillIds",
    "deterministicChecks",
    "score",
    "pass",
    "timestamp",
    "verifierRequired",
)

ALLOWED_KEYS = frozenset(REQUIRED_KEYS) | frozenset({"context"})

__all__ = [
    "DETERMINISTIC_ACTIVITY_TYPES",
    "LiteracyVerdict",
    "PASS_SCORE_MIN",
    "VERIFIER_SOURCE",
    "verify_literacy_evidence",
    "load_literacy_evidence",
    "write_literacy_receipt",
]


@dataclass(frozen=True, slots=True)
class LiteracyVerdict:
    """Structured independent verdict for one LiteracyEvidenceRecord."""

    verdict: str  # PASS | FAIL
    context_isolated: bool
    source: str
    evidence_digest: str
    lesson_id: str
    activity_id: str
    attempt_id: str
    activity_type: str
    score: float | None
    producer_pass_claim: bool | None
    independent_pass: bool
    mastery_eligible: bool
    errors: tuple[str, ...] = field(default_factory=tuple)

    @property
    def passed(self) -> bool:
        return self.verdict == "PASS"

    def to_receipt_dict(self) -> dict[str, Any]:
        """JSON-serializable receipt (never claims UI wrote mastery)."""
        payload = asdict(self)
        payload["errors"] = list(self.errors)
        payload["producer_writes_mastered"] = False
        payload["max_producer_claim"] = "completed"
        return payload


def load_literacy_evidence(path: str | Path) -> dict[str, Any]:
    """Load a single LiteracyEvidenceRecord JSON object. Fail closed on parse errors."""
    raw_path = Path(path)
    try:
        text = raw_path.read_text(encoding="utf-8")
    except OSError as exc:
        raise ValueError(f"literacy evidence unreadable: {exc}") from exc
    try:
        raw = json.loads(text)
    except json.JSONDecodeError as exc:
        raise ValueError(
            f"literacy evidence is not parseable JSON: {exc.msg} at line {exc.lineno}"
        ) from exc
    if not isinstance(raw, dict):
        raise ValueError("literacy evidence must be a JSON object")
    return raw


def literacy_evidence_digest(evidence: dict[str, Any]) -> str:
    """SHA-256 of stable producer fields (excludes timestamp)."""
    stable = {
        key: evidence[key]
        for key in (
            "schemaVersion",
            "source",
            "attemptId",
            "lessonId",
            "lessonVersion",
            "activityId",
            "activityType",
            "skillIds",
            "deterministicChecks",
            "score",
            "pass",
            "verifierRequired",
        )
        if key in evidence
    }
    if "context" in evidence:
        stable["context"] = evidence["context"]
    encoded = json.dumps(stable, sort_keys=True, separators=(",", ":")).encode()
    return hashlib.sha256(encoded).hexdigest()


def _structural_errors(evidence: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    for key in evidence:
        if key not in ALLOWED_KEYS:
            errors.append(f"unknown field {key!r}")
    for key in REQUIRED_KEYS:
        if key not in evidence:
            errors.append(f"missing required field {key!r}")
    if errors:
        return errors

    if evidence["schemaVersion"] != EVIDENCE_SCHEMA_VERSION:
        errors.append(
            f"schemaVersion must be {EVIDENCE_SCHEMA_VERSION}, got {evidence['schemaVersion']!r}"
        )
    if evidence["source"] != EVIDENCE_SOURCE:
        errors.append(f"source must be {EVIDENCE_SOURCE!r}, got {evidence['source']!r}")
    if evidence["verifierRequired"] is not True:
        errors.append("verifierRequired must be literal true")
    if "verifier" in evidence:
        errors.append(
            "embedded verifier is producer-controlled and cannot authorize mastery"
        )

    for string_field in ("attemptId", "lessonId", "activityId", "activityType"):
        value = evidence[string_field]
        if not isinstance(value, str) or not value.strip():
            errors.append(f"{string_field} must be a non-empty string")

    if not isinstance(evidence["lessonVersion"], int) or isinstance(
        evidence["lessonVersion"], bool
    ):
        errors.append("lessonVersion must be an integer")
    elif evidence["lessonVersion"] < 1:
        errors.append("lessonVersion must be >= 1")

    skill_ids = evidence["skillIds"]
    if not isinstance(skill_ids, list) or not all(
        isinstance(item, str) and item for item in skill_ids
    ):
        errors.append("skillIds must be a list of non-empty strings")

    checks = evidence["deterministicChecks"]
    if not isinstance(checks, dict):
        errors.append("deterministicChecks must be an object")
    else:
        for check_key, check_value in checks.items():
            if not isinstance(check_key, str) or not check_key:
                errors.append("deterministicChecks keys must be non-empty strings")
            if not isinstance(check_value, (bool, int, float, str)) or (
                isinstance(check_value, float)
                and (
                    check_value != check_value  # NaN
                    or check_value in (float("inf"), float("-inf"))
                )
            ):
                errors.append(
                    f"deterministicChecks[{check_key!r}] must be bool|number|string"
                )
            # Fail closed on free-text-looking blobs (evidence contract: no free text).
            if isinstance(check_value, str) and len(check_value) > 200:
                errors.append(
                    f"deterministicChecks[{check_key!r}] string too long "
                    "(free text not allowed in evidence)"
                )

    score = evidence["score"]
    if (
        not isinstance(score, (int, float))
        or isinstance(score, bool)
        or not (0.0 <= float(score) <= 1.0)
    ):
        errors.append("score must be a number in [0, 1]")

    if not isinstance(evidence["pass"], bool):
        errors.append("pass must be a boolean")

    try:
        parse_aware_timestamp(str(evidence["timestamp"]))
    except (TypeError, ValueError):
        # Also accept plain ISO with Z via parse; if that fails, try Date-like.
        ts = evidence["timestamp"]
        if not isinstance(ts, str) or not ts.strip():
            errors.append("timestamp must be a non-empty ISO-8601 string")
        else:
            # LiteracyDojo uses ISO strings; require parseable via fromisoformat-ish.
            try:
                from datetime import datetime

                datetime.fromisoformat(ts.replace("Z", "+00:00"))
            except ValueError:
                errors.append(f"timestamp {ts!r} is not a valid ISO-8601 string")

    context = evidence.get("context")
    if context is not None and context not in {"initial", "review"}:
        errors.append("context must be 'initial', 'review', or omitted")

    return errors


def _independent_judgment(evidence: dict[str, Any]) -> tuple[bool, list[str]]:
    """Re-judge pass eligibility from structured fields only (no LLM)."""
    errors: list[str] = []
    activity_type = str(evidence["activityType"])
    score = float(evidence["score"])
    claimed_pass = bool(evidence["pass"])
    checks = evidence["deterministicChecks"]

    if activity_type in APPLICATION_ACTIVITY_TYPES:
        # Open application is never mastery-eligible; independent pass is only
        # "application reported with valid envelope", not skill mastery.
        if claimed_pass and score < PASS_SCORE_MIN:
            errors.append(
                f"application activity claims pass with score {score} < {PASS_SCORE_MIN}"
            )
        independent_pass = claimed_pass and score >= PASS_SCORE_MIN and not errors
        return independent_pass, errors

    if activity_type not in DETERMINISTIC_ACTIVITY_TYPES:
        # Unknown types fail closed for independent pass (envelope may still be valid).
        errors.append(
            f"activityType {activity_type!r} is not independently re-judgeable; fail closed"
        )
        return False, errors

    if not checks:
        errors.append("deterministicChecks is empty; fail closed")
        return False, errors

    # Consistency: a pass claim must meet the MVP score threshold.
    if claimed_pass and score < PASS_SCORE_MIN:
        errors.append(
            f"producer claims pass with score {score} < {PASS_SCORE_MIN} (inconsistent)"
        )

    # If producer claims fail, independent pass is false (honest fail is valid evidence).
    if not claimed_pass:
        return False, errors

    # Boolean checks: if any named *required*/trap-style false is present, fail.
    # Convention used by LiteracyDojo: trap criteria set to true means user selected trap.
    trap_true = [
        key
        for key, value in checks.items()
        if isinstance(value, bool)
        and value is True
        and ("trap" in key.lower() or "armadilha" in key.lower())
    ]
    if trap_true:
        errors.append(f"trap criteria selected: {', '.join(sorted(trap_true))}")

    bool_failures = [
        key
        for key, value in checks.items()
        if isinstance(value, bool)
        and value is False
        and "trap" not in key.lower()
        and "armadilha" not in key.lower()
    ]
    # Not every false is a failure (e.g. optional flags); require majority of bools true
    # only when producer claims pass — and score already gates. Prefer score + non-empty checks.
    independent_pass = claimed_pass and score >= PASS_SCORE_MIN and not errors
    if independent_pass and bool_failures and len(bool_failures) == len(
        [v for v in checks.values() if isinstance(v, bool)]
    ):
        # All boolean checks false while claiming pass → inconsistent.
        errors.append("all boolean deterministicChecks are false while pass is true")
        independent_pass = False

    return independent_pass and not errors, errors


def verify_literacy_evidence(evidence: dict[str, Any] | None) -> LiteracyVerdict:
    """Independently verify one LiteracyEvidenceRecord-shaped dict.

    Missing evidence (``None``) and invalid envelopes fail closed with verdict FAIL.
    ``mastery_eligible`` is true only for deterministic activities with independent PASS.
    The producer surface is never authorized to write ``mastered``.
    """
    if evidence is None:
        return LiteracyVerdict(
            verdict="FAIL",
            context_isolated=True,
            source=VERIFIER_SOURCE,
            evidence_digest="",
            lesson_id="",
            activity_id="",
            attempt_id="",
            activity_type="",
            score=None,
            producer_pass_claim=None,
            independent_pass=False,
            mastery_eligible=False,
            errors=("missing evidence",),
        )

    if not isinstance(evidence, dict):
        return LiteracyVerdict(
            verdict="FAIL",
            context_isolated=True,
            source=VERIFIER_SOURCE,
            evidence_digest="",
            lesson_id="",
            activity_id="",
            attempt_id="",
            activity_type="",
            score=None,
            producer_pass_claim=None,
            independent_pass=False,
            mastery_eligible=False,
            errors=("evidence must be a JSON object",),
        )

    structural = _structural_errors(evidence)
    if structural:
        return LiteracyVerdict(
            verdict="FAIL",
            context_isolated=True,
            source=VERIFIER_SOURCE,
            evidence_digest=literacy_evidence_digest(evidence)
            if "schemaVersion" in evidence
            else "",
            lesson_id=str(evidence.get("lessonId") or ""),
            activity_id=str(evidence.get("activityId") or ""),
            attempt_id=str(evidence.get("attemptId") or ""),
            activity_type=str(evidence.get("activityType") or ""),
            score=float(evidence["score"])
            if isinstance(evidence.get("score"), (int, float))
            and not isinstance(evidence.get("score"), bool)
            else None,
            producer_pass_claim=evidence["pass"]
            if isinstance(evidence.get("pass"), bool)
            else None,
            independent_pass=False,
            mastery_eligible=False,
            errors=tuple(structural),
        )

    independent_pass, judgment_errors = _independent_judgment(evidence)
    activity_type = str(evidence["activityType"])
    mastery_eligible = (
        independent_pass
        and activity_type in DETERMINISTIC_ACTIVITY_TYPES
        and activity_type not in APPLICATION_ACTIVITY_TYPES
    )
    verdict = "PASS" if independent_pass and not judgment_errors else "FAIL"
    if judgment_errors and independent_pass:
        independent_pass = False
        mastery_eligible = False
        verdict = "FAIL"

    # Fail verdict when judgment found inconsistencies even if score looked ok.
    if judgment_errors:
        independent_pass = False
        mastery_eligible = False
        verdict = "FAIL"

    # Honest fail attempt: valid envelope, producer_pass false → still FAIL verdict
    # (not mastery), but not a structural rejection — errors may be empty.
    if not evidence["pass"] and not judgment_errors:
        verdict = "FAIL"
        independent_pass = False
        mastery_eligible = False

    return LiteracyVerdict(
        verdict=verdict,
        context_isolated=True,
        source=VERIFIER_SOURCE,
        evidence_digest=literacy_evidence_digest(evidence),
        lesson_id=str(evidence["lessonId"]),
        activity_id=str(evidence["activityId"]),
        attempt_id=str(evidence["attemptId"]),
        activity_type=activity_type,
        score=float(evidence["score"]),
        producer_pass_claim=bool(evidence["pass"]),
        independent_pass=independent_pass,
        mastery_eligible=mastery_eligible,
        errors=tuple(judgment_errors),
    )


def write_literacy_receipt(verdict: LiteracyVerdict, path: str | Path) -> Path:
    """Write the independent receipt JSON (does not touch learning_state or UI)."""
    out = Path(path)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(
        json.dumps(verdict.to_receipt_dict(), indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    return out
