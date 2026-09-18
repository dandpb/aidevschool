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
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from learner.gate.evidence_io import EvidenceParseError, MAX_EVIDENCE_BYTES
from learner.gate.evidence_validator import validate_literacy_evidence_structure
from shared.fsio import atomic_write_text
from .literacy_evaluator import recompute_literacy_evidence

REPO_ROOT = Path(__file__).resolve().parents[2]

VERIFIER_SOURCE = "independent-literacy-verifier"

#: Append-only owner queue for the 0.4–0.75 escalation band (RFC ACCEPTED).
ESCALATIONS_PATH = (
    REPO_ROOT / "learner" / "verifier_receipts" / "literacy-escalations.ndjson"
)

__all__ = tuple(
    "LiteracyVerdict VERIFIER_SOURCE main verify_literacy_evidence "
    "load_literacy_evidence write_literacy_receipt ESCALATIONS_PATH".split()
)


@dataclass(frozen=True, slots=True)
class LiteracyVerdict:
    """Structured independent verdict for one LiteracyEvidenceRecord."""

    verdict: str  # PASS | FAIL | ESCALATE
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
    judgment_receipt_digest: str | None = None
    resolution: str | None = None  # "manual" when an approved escalation turned the digest into PASS

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
        raise EvidenceParseError(f"literacy evidence unreadable: {exc}") from exc
    if len(text.encode("utf-8")) > MAX_EVIDENCE_BYTES:
        raise EvidenceParseError("literacy evidence exceeds 65536 bytes")
    try:
        raw = json.loads(text)
    except json.JSONDecodeError as exc:
        raise EvidenceParseError(
            f"literacy evidence is not parseable JSON: {exc.msg} at line {exc.lineno}"
        ) from exc
    if not isinstance(raw, dict):
        raise EvidenceParseError("literacy evidence must be a JSON object")
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
        evidence_digest=literacy_evidence_digest(raw) if "schemaVersion" in raw else "",
        lesson_id=str(raw.get("lessonId") or ""),
        activity_id=str(raw.get("activityId") or ""),
        attempt_id=str(raw.get("attemptId") or ""),
        activity_type=str(raw.get("activityType") or ""),
        score=score,
        producer_pass_claim=producer_pass if isinstance(producer_pass, bool) else None,
        independent_pass=False,
        mastery_eligible=False,
        errors=errors,
    )


def _load_queue(path: Path) -> list[dict[str, Any]]:
    if not path.is_file():
        return []
    entries = [
        json.loads(line)
        for line in path.read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]
    return entries


def _append_queue(path: Path, entry: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(entry, ensure_ascii=False) + "\n")


def _approved_manual(evidence_digest: str, queue_path: Path) -> str | None:
    """"manual" if the owner approved this digest's escalation, else None."""
    for entry in _load_queue(queue_path):
        if (
            entry.get("evidence_digest") == evidence_digest
            and entry.get("status") == "resolved"
            and entry.get("resolution") == "approve"
        ):
            return "manual"
    return None


def _queue_escalation(
    escalations_path: Path | None,
    evidence: dict[str, Any],
    evidence_digest: str,
    recomputed: dict[str, Any] | None,
    judgment_digest: str | None,
    resolution: str | None,
) -> None:
    if resolution is not None:
        return  # already resolved by the owner: no further queue entries
    _append_queue(
        escalations_path,
        {
            "attempt_id": str(evidence["attemptId"]),
            "evidence_digest": evidence_digest,
            "field_scores": (recomputed or {}).get("judgment", {}).get(
                "field_scores", {}
            ),
            "judgment_receipt_digest": judgment_digest,
            "status": "open",
        },
    )


def _envelope_verdict(evidence: Any) -> LiteracyVerdict | None:
    """A failed verdict for missing/invalid envelopes, else None."""
    if evidence is None:
        return _failed_verdict(None, ("missing evidence",))
    if not isinstance(evidence, dict):
        return _failed_verdict(None, ("evidence must be a JSON object",))
    errors = validate_literacy_evidence_structure(evidence)
    if errors:
        return _failed_verdict(evidence, tuple(errors))
    return None


def _judgment_outcome(
    evidence: dict[str, Any],
    root: Path,
    judgment_client: Any,
    receipts_root: Path | None,
) -> tuple[dict[str, Any] | None, list[str], bool, bool]:
    """(recomputed, errors, independent_pass, escalate) from the recomputation."""
    recomputed, judgment_errors = recompute_literacy_evidence(
        evidence, root, judgment_client, receipts_root
    )
    ok = not judgment_errors and recomputed is not None
    return recomputed, judgment_errors, ok and bool(recomputed["pass"]), ok and bool(
        recomputed.get("escalate")
    )


def _with_approval(
    independent_pass: bool, evidence_digest: str, queue_path: Path
) -> tuple[bool, str | None]:
    """Approved escalations turn ANY non-passing digest into PASS(manual) —
    the ESCALATE band included, which is the normal escalation path."""
    if independent_pass:
        return independent_pass, None
    resolution = _approved_manual(evidence_digest, queue_path)
    return resolution is not None, resolution


def verify_literacy_evidence(
    evidence: dict[str, Any] | None,
    *,
    root: Path = REPO_ROOT,
    judgment_client: Any = None,
    escalations_path: Path | None = None,
    judgment_receipts_root: Path | None = None,
) -> LiteracyVerdict:
    """Independently verify one LiteracyEvidenceRecord-shaped dict.

    Missing evidence (``None``) and invalid envelopes fail closed with verdict
    FAIL. prompt_builder answers verify via the injected judgment client
    (RFC-accepted); the 0.4–0.75 band appends to the escalations queue (when
    ``escalations_path`` is given) and returns ESCALATE; a digest with an
    approved escalation re-verifies as PASS with ``resolution: "manual"``.
    ``mastery_eligible`` is true only for independent PASS (judgment or
    approved escalation). The producer surface never writes ``mastered``.
    """
    # Normalized once: None means the committed queue — verification is an
    # entry point, so reading and writing the real queue is the default.
    queue_path = escalations_path or ESCALATIONS_PATH
    failed = _envelope_verdict(evidence)
    if failed is not None:
        return failed

    recomputed, judgment_errors, independent_pass, escalate = _judgment_outcome(
        evidence, root, judgment_client, judgment_receipts_root
    )
    evidence_digest = literacy_evidence_digest(evidence)
    judgment_digest = (recomputed or {}).get("judgment", {}).get("receipt_digest")
    independent_pass, resolution = _with_approval(
        independent_pass, evidence_digest, queue_path
    )
    if escalate:
        _queue_escalation(
            queue_path, evidence, evidence_digest, recomputed,
            judgment_digest, resolution,
        )
    verdict = "PASS" if independent_pass else ("ESCALATE" if escalate else "FAIL")
    return LiteracyVerdict(
        verdict=verdict,
        context_isolated=True,
        source=VERIFIER_SOURCE,
        evidence_digest=evidence_digest,
        lesson_id=str(evidence["lessonId"]),
        activity_id=str(evidence["activityId"]),
        attempt_id=str(evidence["attemptId"]),
        activity_type=str(evidence["activityType"]),
        score=float(recomputed["score"]) if recomputed else float(evidence["score"]),
        producer_pass_claim=bool(evidence["pass"]),
        independent_pass=independent_pass,
        mastery_eligible=independent_pass,
        errors=tuple(judgment_errors),
        judgment_receipt_digest=judgment_digest,
        resolution=resolution,
    )


def write_literacy_receipt(verdict: LiteracyVerdict, path: str | Path) -> Path:
    """Write the independent receipt JSON (does not touch learning_state or UI).

    Uses the shared atomic-write helper: a crash mid-write leaves the previous
    receipt (or an absent slot) intact. The receipt is bound to producer
    evidence by digest, so a torn file would re-validate against the wrong
    producer block — atomicity is part of the contract, not a nicety.
    """
    out = Path(path)
    out.parent.mkdir(parents=True, exist_ok=True)
    atomic_write_text(
        out,
        json.dumps(verdict.to_receipt_dict(), indent=2, sort_keys=True) + "\n",
    )
    return out


def resolve_escalation(
    attempt_id: str, *, approve: bool, path: Path | None = None
) -> tuple[int, str]:
    """Resolve the latest open escalation for ``attempt_id`` (owner action).

    Rewrites the queue entry with the resolution and manual provenance;
    returns ``(exit_code, message)``. Unknown or non-open attempts exit 1.
    """
    queue_path = path or ESCALATIONS_PATH
    entries = _load_queue(queue_path)
    matches = [e for e in entries if e.get("attempt_id") == attempt_id]
    if not matches:
        return 1, f"no escalation entry for attempt {attempt_id!r}"
    entry = matches[-1]
    if entry.get("status") != "open":
        return 1, f"escalation {attempt_id!r} is {entry.get('status')!r}, not open"
    entry.update(
        {
            "status": "resolved",
            "resolution": "approve" if approve else "reject",
            "resolved_by": "owner",
            "resolved_at": datetime.now(timezone.utc).isoformat(),
        }
    )
    atomic_write_text(
        queue_path,
        "\n".join(json.dumps(e, ensure_ascii=False) for e in entries) + "\n",
    )
    return 0, f"escalation {attempt_id!r} resolved: {entry['resolution']}"


def _run_verify(args: argparse.Namespace, root: Path) -> int:
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
    except EvidenceParseError as exc:
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

    from learner.substrate import default_judgment_client

    verdict = verify_literacy_evidence(
        evidence, root=root, judgment_client=default_judgment_client()
    )
    print(json.dumps(verdict.to_receipt_dict(), indent=2, sort_keys=True))

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
    if verdict.verdict == "ESCALATE":
        print(
            f"LITERACY VERDICT ESCALATE — queued for owner review "
            f"(--resolve {verdict.attempt_id} --approve|--reject)",
            file=sys.stderr,
        )
        return 3
    print(
        f"LITERACY VERDICT FAIL — errors={list(verdict.errors)}; mastery_eligible=false",
        file=sys.stderr,
    )
    return 1


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="learner-gate-literacy", description=__doc__)
    parser.add_argument(
        "--evidence",
        default=None,
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
    parser.add_argument(
        "--resolve",
        default=None,
        help="attempt id of an open escalation entry to resolve",
    )
    parser.add_argument("--approve", action="store_true", help="approve the escalation")
    parser.add_argument("--reject", action="store_true", help="reject the escalation")
    args = parser.parse_args(argv)

    if args.resolve is not None:
        if args.approve == args.reject:
            print("exactly one of --approve / --reject is required", file=sys.stderr)
            return 1
        code, message = resolve_escalation(args.resolve, approve=args.approve)
        print(message, file=sys.stderr)
        return code

    if args.evidence is None:
        parser.error("--evidence is required unless --resolve is used")
    return _run_verify(args, Path(args.root))


if __name__ == "__main__":
    sys.exit(main())
