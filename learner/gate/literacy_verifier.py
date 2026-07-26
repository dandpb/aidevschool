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

from learner.gate.evidence_io import MAX_EVIDENCE_BYTES
from learner.gate.evidence_validator import validate_literacy_evidence_structure
from .literacy_evaluator import recompute_literacy_evidence

REPO_ROOT = Path(__file__).resolve().parents[2]

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

__all__ = [
    "DETERMINISTIC_ACTIVITY_TYPES",
    "LiteracyVerdict",
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
    if len(text.encode("utf-8")) > MAX_EVIDENCE_BYTES:
        raise ValueError("literacy evidence exceeds 65536 bytes")
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
            "answer",
        )
        if key in evidence
    }
    if "context" in evidence:
        stable["context"] = evidence["context"]
    encoded = json.dumps(stable, sort_keys=True, separators=(",", ":")).encode()
    return hashlib.sha256(encoded).hexdigest()


def _failed_verdict(
    evidence: dict[str, Any] | None, errors: tuple[str, ...]
) -> LiteracyVerdict:
    raw = evidence or {}
    raw_score = raw.get("score")
    score = (
        float(raw_score)
        if isinstance(raw_score, (int, float)) and not isinstance(raw_score, bool)
        else None
    )
    producer_pass = raw.get("pass")
    return LiteracyVerdict(
        verdict="FAIL",
        context_isolated=True,
        source=VERIFIER_SOURCE,
        evidence_digest=literacy_evidence_digest(raw)
        if "schemaVersion" in raw
        else "",
        lesson_id=str(raw.get("lessonId") or ""),
        activity_id=str(raw.get("activityId") or ""),
        attempt_id=str(raw.get("attemptId") or ""),
        activity_type=str(raw.get("activityType") or ""),
        score=score,
        producer_pass_claim=producer_pass
        if isinstance(producer_pass, bool)
        else None,
        independent_pass=False,
        mastery_eligible=False,
        errors=errors,
    )


def verify_literacy_evidence(
    evidence: dict[str, Any] | None, *, root: Path = REPO_ROOT
) -> LiteracyVerdict:
    """Independently verify one LiteracyEvidenceRecord-shaped dict.

    Missing evidence (``None``) and invalid envelopes fail closed with verdict FAIL.
    ``mastery_eligible`` is true only for deterministic activities with independent PASS.
    The producer surface is never authorized to write ``mastered``.
    """
    if evidence is None:
        return _failed_verdict(None, ("missing evidence",))

    if not isinstance(evidence, dict):
        return _failed_verdict(None, ("evidence must be a JSON object",))

    structural = validate_literacy_evidence_structure(evidence)
    if structural:
        return _failed_verdict(evidence, tuple(structural))

    recomputed, judgment_errors = recompute_literacy_evidence(evidence, root)
    activity_type = str(evidence["activityType"])
    independent_pass = bool(recomputed and recomputed["pass"] and not judgment_errors)
    mastery_eligible = independent_pass
    verdict = "PASS" if independent_pass else "FAIL"

    return LiteracyVerdict(
        verdict=verdict,
        context_isolated=True,
        source=VERIFIER_SOURCE,
        evidence_digest=literacy_evidence_digest(evidence),
        lesson_id=str(evidence["lessonId"]),
        activity_id=str(evidence["activityId"]),
        attempt_id=str(evidence["attemptId"]),
        activity_type=activity_type,
        score=float(recomputed["score"]) if recomputed else float(evidence["score"]),
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

    verdict = verify_literacy_evidence(evidence, root=root)
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
