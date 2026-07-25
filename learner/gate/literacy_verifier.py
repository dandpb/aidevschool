"""Independent no-code verifier for LiteracyEvidenceRecord.

LiteracyDojo (the producer) emits raw evidence with ``verifierRequired: true``
and may record at most local ``completed``. It never writes ``mastered``.

This module re-judges the envelope in an isolated process and emits a
structured verdict/receipt. Open-ended application reports never become
mastery-eligible. Invalid or missing evidence fails closed.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any

from learner.gate.evidence_validator import validate_literacy_evidence_structure

#: Matches LiteracyDojo domain evaluation default (MVP threshold).
PASS_SCORE_MIN = 0.75

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

__all__ = [
    "DETERMINISTIC_ACTIVITY_TYPES",
    "LiteracyVerdict",
    "PASS_SCORE_MIN",
    "VERIFIER_SOURCE",
    "main",
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

    structural = validate_literacy_evidence_structure(evidence)
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


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="learner-gate-literacy", description=__doc__)
    parser.add_argument(
        "--evidence",
        required=True,
        help="path to a LiteracyEvidenceRecord JSON object",
    )
    parser.add_argument(
        "--write-receipt",
        default=None,
        help="optional path for the independent receipt JSON",
    )
    parser.add_argument(
        "--root",
        default=".",
        help="ecosystem root (default: cwd); used only to resolve relative paths",
    )
    args = parser.parse_args(argv)
    root = Path(args.root)
    evidence_path = Path(args.evidence)
    if not evidence_path.is_absolute():
        evidence_path = root / evidence_path

    if not evidence_path.exists():
        print(f"FAIL CLOSED — evidence file not found: {evidence_path}")
        missing = verify_literacy_evidence(None)
        print(json.dumps(missing.to_receipt_dict(), indent=2, sort_keys=True))
        return 1

    try:
        evidence = load_literacy_evidence(evidence_path)
    except ValueError as exc:
        print(f"FAIL CLOSED — {exc}")
        print(
            json.dumps(
                {
                    "verdict": "FAIL",
                    "errors": [str(exc)],
                    "mastery_eligible": False,
                    "producer_writes_mastered": False,
                    "max_producer_claim": "completed",
                },
                indent=2,
            )
        )
        return 1

    verdict = verify_literacy_evidence(evidence)
    receipt = verdict.to_receipt_dict()
    print(json.dumps(receipt, indent=2, sort_keys=True))

    if args.write_receipt:
        receipt_path = Path(args.write_receipt)
        if not receipt_path.is_absolute():
            receipt_path = root / receipt_path
        write_literacy_receipt(verdict, receipt_path)
        print(f"receipt written: {receipt_path}", file=sys.stderr)

    if verdict.passed:
        print(
            f"LITERACY VERDICT PASS — mastery_eligible={verdict.mastery_eligible} "
            f"(producer max claim remains completed; UI cannot write mastered)",
            file=sys.stderr,
        )
        return 0

    print(
        f"LITERACY VERDICT FAIL — errors={list(verdict.errors)}; mastery_eligible=false",
        file=sys.stderr,
    )
    return 1


if __name__ == "__main__":
    sys.exit(main())
