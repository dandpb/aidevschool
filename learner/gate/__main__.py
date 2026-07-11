"""CLI: independently verify evidence for the active learner unit.

Run from the ecosystem root:

    python3 -m learner.gate [--evidence PATH] [--verifier-receipt PATH] [--dry-run]

Without --evidence the verifier looks for the NDJSON contract first
(engines/pixelDojo/pixel-quest/.logs/evidence.ndjson), then falls back to the
legacy single-record file (engines/pixelDojo/.logs/last_run_evidence.json).

Exit codes: 0 = gate applied (pass or fail recorded) OR nothing to grade
(no evidence / no attempt awaiting verification), 1 = evidence rejected by
the gate preconditions or unreadable.
After a successful gate, regenerate derived views: python3 -m learner.substrate
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from learner.gate import (
    check_evidence_semantics,
    load_evidence,
    load_evidence_ndjson,
    select_evidence,
    verify_and_gate,
)
from learner.substrate import load_and_validate
from learner.gate.verifier_receipt import load_verifier_receipt

#: Preferred evidence source: the NDJSON contract written by the Playwright
#: smoke run (see EVIDENCE_CONTRACT.md), then the legacy single-record file.
DEFAULT_EVIDENCE_CANDIDATES = (
    "engines/pixelDojo/pixel-quest/.logs/evidence.ndjson",
    "engines/pixelDojo/.logs/last_run_evidence.json",
)


def _resolve_evidence(root: Path, explicit: str | None) -> Path | None:
    """Explicit path wins (as given); otherwise first existing default."""
    if explicit:
        return Path(explicit)
    for candidate in DEFAULT_EVIDENCE_CANDIDATES:
        path = root / candidate
        if path.exists():
            return path
    return None


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="learner-gate", description=__doc__)
    parser.add_argument(
        "--evidence",
        default=None,
        help="evidence path (.json single record or .ndjson contract); "
        f"default: first existing of {', '.join(DEFAULT_EVIDENCE_CANDIDATES)}",
    )
    parser.add_argument(
        "--verifier-receipt",
        default=None,
        help="independent verifier JSON receipt under learner/verifier_receipts",
    )
    parser.add_argument("--root", default=".", help="ecosystem root (default: cwd)")
    parser.add_argument(
        "--dry-run", action="store_true", help="decide but do not write state"
    )
    args = parser.parse_args(argv)
    root = Path(args.root)

    try:
        state = load_and_validate(root / "learner" / "learning_state.yaml")
    except (OSError, ValueError) as exc:
        print(f"CANNOT GATE — learner state unreadable/invalid: {exc}")
        return 1

    unit = state.get("active_unit", {})
    evidence_path = _resolve_evidence(root, args.evidence)
    if args.dry_run and args.evidence and evidence_path is not None and evidence_path.exists():
        try:
            if evidence_path.suffix == ".ndjson":
                evidence = select_evidence(load_evidence_ndjson(evidence_path), unit)
            else:
                evidence = load_evidence(evidence_path)
        except ValueError as exc:
            print(f"NOT ELIGIBLE — evidence unreadable: {exc}")
            return 1
        if evidence is not None and unit.get("state") != "evaluating":
            try:
                verifier_receipt = (
                    load_verifier_receipt(args.verifier_receipt, root)
                    if args.verifier_receipt is not None
                    else None
                )
            except ValueError as exc:
                print(f"NOT ELIGIBLE — verifier receipt unreadable: {exc}")
                return 1
            semantic_errors = check_evidence_semantics(
                evidence, unit, verifier_receipt
            )
            if semantic_errors:
                print("NOT ELIGIBLE — evidence rejected by independent semantics:")
                for error in semantic_errors:
                    print(f"  - {error}")
                return 1
            print(
                "EVIDENCE SEMANTIC PASS — transition not applicable for active unit "
                f"{unit.get('id')!r} in state {unit.get('state')!r} (no state was written)."
            )
            return 0
    if unit.get("state") != "evaluating":
        print(
            f"NOTHING TO GRADE — active unit {unit.get('id')!r} is in state "
            f"{unit.get('state')!r}, not 'evaluating'. The gate only runs after a "
            "learner attempt is awaiting verification (no state was written)."
        )
        return 0

    if evidence_path is None or not evidence_path.exists():
        looked = args.evidence or ", ".join(DEFAULT_EVIDENCE_CANDIDATES)
        print(
            f"NOTHING TO GRADE — no evidence file found (looked for: {looked}). "
            "Play the mission first: `pnpm run smoke` inside "
            "engines/pixelDojo/pixel-quest/ regenerates the NDJSON evidence."
        )
        return 0

    try:
        decision = verify_and_gate(
            root,
            evidence_path,
            dry_run=args.dry_run,
            verifier_receipt_path=args.verifier_receipt,
        )
    except ValueError as exc:
        print(f"NOT ELIGIBLE — evidence unreadable: {exc}")
        return 1

    if decision is None:
        print(
            f"NOTHING TO GRADE — {evidence_path} has no record for active unit "
            f"{unit.get('id')!r}. Replay that unit's encounter to produce evidence."
        )
        return 0

    if not decision.ok:
        print("NOT ELIGIBLE — evidence rejected by the gate preconditions:")
        for err in decision.errors:
            print(f"  - {err}")
        return 1

    verb = "would be" if args.dry_run else "was"
    print(
        f"GATE {decision.gate_outcome.upper()} (rating: {decision.rating}) — "
        f"outcome {verb} recorded in learner/learning_state.yaml > units_log "
        f"(evidence: {evidence_path})"
    )
    if not args.dry_run:
        print("Committed via learner.substrate.gate (views resynced for repo path).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
