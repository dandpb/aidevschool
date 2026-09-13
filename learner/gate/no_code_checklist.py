"""Independent structural verifier for the ADR-0004 no-code checklist.

ADR-0004 gates the Level-0 track (``00_ai_in_practice``) on a learner-written
checklist of falsifiable claims: "the AI claimed X; I verified X like this:
[concrete source/action]; result: confirmed/refuted". Until now that checklist
had no executable verification at all (verifier-map §3, L3) — the Prometor
reviewed free-form text with no audit trail.

This module is the deterministic HALF of that gate. It parses the learner's
checklist artifact, enforces the closed schema, and emits a digest-bound
receipt. It **never** decides mastery:

- ``mastery_eligible`` is always ``false`` here;
- the receipt carries ``promoter_countersign_required: true`` — the human
  Prometor review of ADR-0004 §3 remains the final countersign and is not
  replaced (and not represented) by this verdict;
- the checks below are STRUCTURAL (schema, floors, consistency). Whether a
  claim is genuinely falsifiable is a semantic judgment that stays with the
  Prometor; the floors only catch empty or contentless stubs.

Artifact schema (closed, JSON object, fail-closed):

{
  "schema_version": 1,
  "source": "no-code-learner",
  "unit_id": "00_*",
  "attempt_id": "<non-empty>",
  "checklist": [
    {"claim": "<the AI affirmed X>",
     "verification": "<how X was checked: concrete source/action>",
     "result": "confirmado" | "refutado"}
  ]
}

CLI mirrors the literacy verifier: exit 0 only on a structurally valid
artifact; ``--write-receipt`` persists the digest-bound receipt (the caller
chooses the path, e.g. ``learner/verifier_receipts/``). This module never
writes ``learner/learning_state.yaml``.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any

from learner.gate.evidence_io import EvidenceParseError, MAX_EVIDENCE_BYTES

VERIFIER_SOURCE = "independent-no-code-checklist-verifier"
ALLOWED_KEYS = frozenset(
    {"schema_version", "source", "unit_id", "attempt_id", "checklist"}
)
ALLOWED_ITEM_KEYS = frozenset({"claim", "verification", "result"})
RESULTS = frozenset({"confirmado", "refutado"})
SOURCE = "no-code-learner"

# Structural floors (NOT a falsifiability judgment — that stays with the
# Prometor). They only reject contentless stubs the Prometor should never
# have to count: a one-word "claim" or a "verification" too short to name
# any source or action cannot be item-verified at all.
MIN_ITEMS = 3
MIN_CLAIM_CHARS = 10
MIN_VERIFICATION_CHARS = 20

__all__ = tuple(
    "NoCodeChecklistVerdict VERIFIER_SOURCE main verify_no_code_checklist "
    "load_no_code_checklist no_code_checklist_digest write_no_code_receipt".split()
)


@dataclass(frozen=True, slots=True)
class NoCodeChecklistVerdict:
    """Structural verdict for one ADR-0004 checklist artifact."""

    verdict: str  # PASS | FAIL (structural only — never mastery)
    context_isolated: bool
    source: str
    evidence_digest: str
    unit_id: str
    attempt_id: str
    items_total: int
    items_confirmado: int
    items_refutado: int
    mastery_eligible: bool  # always False: Prometor countersign required
    errors: tuple[str, ...] = field(default_factory=tuple)

    @property
    def passed(self) -> bool:
        return self.verdict == "PASS"

    def to_receipt_dict(self) -> dict[str, Any]:
        payload = asdict(self)
        payload["errors"] = list(self.errors)
        payload["producer_writes_mastered"] = False
        payload["max_producer_claim"] = "completed"
        payload["promoter_countersign_required"] = True
        return payload


def load_no_code_checklist(path: str | Path) -> dict[str, Any]:
    """Load one checklist artifact. Fail closed on size/parse errors."""
    raw_path = Path(path)
    try:
        text = raw_path.read_text(encoding="utf-8")
    except OSError as exc:
        raise EvidenceParseError(f"checklist unreadable: {exc}") from exc
    if len(text.encode("utf-8")) > MAX_EVIDENCE_BYTES:
        raise EvidenceParseError("checklist exceeds 65536 bytes")
    try:
        raw = json.loads(text)
    except json.JSONDecodeError as exc:
        raise EvidenceParseError(
            f"checklist is not parseable JSON: {exc.msg} at line {exc.lineno}"
        ) from exc
    if not isinstance(raw, dict):
        raise EvidenceParseError("checklist must be a JSON object")
    return raw


def no_code_checklist_digest(checklist: dict[str, Any]) -> str:
    """SHA-256 over the stable artifact fields (schema…checklist, no ts)."""
    stable = {key: checklist[key] for key in sorted(ALLOWED_KEYS) if key in checklist}
    encoded = json.dumps(stable, sort_keys=True, separators=(",", ":")).encode()
    return hashlib.sha256(encoded).hexdigest()


def _failed(
    checklist: dict[str, Any] | None, errors: tuple[str, ...]
) -> NoCodeChecklistVerdict:
    raw = checklist or {}
    items = raw.get("checklist") if isinstance(raw.get("checklist"), list) else []
    tally = {"confirmado": 0, "refutado": 0}
    for item in items:
        if isinstance(item, dict) and item.get("result") in tally:
            tally[item["result"]] += 1
    return NoCodeChecklistVerdict(
        verdict="FAIL",
        context_isolated=True,
        source=VERIFIER_SOURCE,
        evidence_digest=no_code_checklist_digest(raw) if raw else "",
        unit_id=str(raw.get("unit_id") or ""),
        attempt_id=str(raw.get("attempt_id") or ""),
        items_total=len(items),
        items_confirmado=tally["confirmado"],
        items_refutado=tally["refutado"],
        mastery_eligible=False,
        errors=errors,
    )


def _structure_errors(checklist: dict[str, Any]) -> tuple[str, ...]:
    errors: list[str] = []
    unknown = sorted(set(checklist) - ALLOWED_KEYS)
    missing = sorted(ALLOWED_KEYS - set(checklist))
    if unknown:
        errors.append(f"unknown fields: {', '.join(unknown)}")
    if missing:
        errors.append(f"missing fields: {', '.join(missing)}")
    if unknown or missing:
        return tuple(errors)
    if checklist["schema_version"] != 1:
        errors.append("schema_version must be 1")
    if checklist["source"] != SOURCE:
        errors.append(f"source must be {SOURCE!r}")
    unit_id = checklist["unit_id"]
    if not isinstance(unit_id, str) or not unit_id.startswith("00_"):
        errors.append("unit_id must belong to the no-code track ('00_*')")
    attempt_id = checklist["attempt_id"]
    if not isinstance(attempt_id, str) or not attempt_id:
        errors.append("attempt_id must be a non-empty string")
    items = checklist["checklist"]
    if not isinstance(items, list) or len(items) < MIN_ITEMS:
        errors.append(f"checklist must list at least {MIN_ITEMS} items")
        return tuple(errors)
    seen: set[tuple[str, str]] = set()
    for index, item in enumerate(items):
        if not isinstance(item, dict) or set(item) != ALLOWED_ITEM_KEYS:
            errors.append(f"item {index} must have exactly claim/verification/result")
            continue
        claim = item["claim"]
        if not isinstance(claim, str) or len(claim.strip()) < MIN_CLAIM_CHARS:
            errors.append(f"item {index} claim is too short to be an affirmation")
        verification = item["verification"]
        if (
            not isinstance(verification, str)
            or len(verification.strip()) < MIN_VERIFICATION_CHARS
        ):
            errors.append(
                f"item {index} verification is too short to name a source or action"
            )
        if item["result"] not in RESULTS:
            errors.append(f"item {index} result must be confirmado or refutado")
        if isinstance(claim, str) and isinstance(verification, str):
            fingerprint = (claim.strip().lower(), verification.strip().lower())
            if fingerprint in seen:
                errors.append(f"item {index} duplicates an earlier item")
            seen.add(fingerprint)
    return tuple(errors)


def verify_no_code_checklist(
    checklist: dict[str, Any] | None,
) -> NoCodeChecklistVerdict:
    """Structurally verify one ADR-0004 checklist artifact.

    ``None`` and invalid artifacts fail closed. A PASS here only means the
    checklist is structurally verifiable; mastery still requires the Prometor
    countersign, so ``mastery_eligible`` is always ``False``.
    """
    if checklist is None:
        return _failed(None, ("missing checklist",))
    if not isinstance(checklist, dict):
        return _failed(None, ("checklist must be a JSON object",))

    errors = _structure_errors(checklist)
    items = checklist.get("checklist")
    items = items if isinstance(items, list) else []
    tally = {"confirmado": 0, "refutado": 0}
    for item in items:
        if isinstance(item, dict) and item.get("result") in tally:
            tally[item["result"]] += 1
    return NoCodeChecklistVerdict(
        verdict="FAIL" if errors else "PASS",
        context_isolated=True,
        source=VERIFIER_SOURCE,
        evidence_digest=no_code_checklist_digest(checklist),
        unit_id=str(checklist.get("unit_id") or ""),
        attempt_id=str(checklist.get("attempt_id") or ""),
        items_total=len(items),
        items_confirmado=tally["confirmado"],
        items_refutado=tally["refutado"],
        mastery_eligible=False,
        errors=errors,
    )


def write_no_code_receipt(verdict: NoCodeChecklistVerdict, path: str | Path) -> Path:
    """Write the independent receipt JSON (never touches learning_state)."""
    from learner.substrate.fsio import atomic_write_text

    out = Path(path)
    out.parent.mkdir(parents=True, exist_ok=True)
    atomic_write_text(
        out,
        json.dumps(verdict.to_receipt_dict(), indent=2, sort_keys=True) + "\n",
    )
    return out


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="learner-gate-no-code-checklist", description=__doc__)
    parser.add_argument(
        "--evidence", required=True, help="path to the checklist artifact JSON"
    )
    parser.add_argument(
        "--write-receipt", default=None, help="optional path for the receipt JSON"
    )
    args = parser.parse_args(argv)

    try:
        checklist = load_no_code_checklist(args.evidence)
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
                    "promoter_countersign_required": True,
                },
                indent=2,
            )
        )
        return 1

    verdict = verify_no_code_checklist(checklist)
    print(json.dumps(verdict.to_receipt_dict(), indent=2, sort_keys=True))

    if args.write_receipt:
        write_no_code_receipt(verdict, args.write_receipt)
        print(f"receipt written: {args.write_receipt}", file=sys.stderr)

    if verdict.passed:
        print(
            "NO-CODE CHECKLIST VERDICT PASS — structural only; "
            "mastery_eligible=false (Prometor countersign required)",
            file=sys.stderr,
        )
        return 0
    print(
        f"NO-CODE CHECKLIST VERDICT FAIL — errors={list(verdict.errors)}",
        file=sys.stderr,
    )
    return 1


if __name__ == "__main__":
    sys.exit(main())
