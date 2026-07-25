"""CLI: independently verify evidence for the active learner unit.

Run from the ecosystem root:

    python3 -m learner.gate [--evidence PATH] [--verifier-receipt PATH] [--dry-run]

Without --evidence the verifier uses the active unit's declared ``evidence_file``
when it exists, then the NDJSON contract
(engines/pixelDojo/pixel-quest/.logs/evidence.ndjson), then the legacy
single-record file (engines/pixelDojo/.logs/last_run_evidence.json).

Exit codes: 0 = gate applied (pass or fail recorded) OR nothing to grade
(no evidence / no attempt awaiting verification), 1 = evidence rejected by
the gate preconditions or unreadable.
After a successful gate, regenerate derived views: python3 -m learner.substrate
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from learner.gate.verifier import (
    DEFAULT_EVIDENCE_CANDIDATES,
    GameVerifier,
    LiteracyVerifier,
    Verdict,
    Verifier,
    detect_evidence_shape,
    dry_run_semantic_check,
    load_one_evidence,
    load_state,
    resolve_evidence,
)


def _print_game_outcome(decision: Verdict, evidence_path: Path, dry_run: bool) -> None:
    verb = "would be" if dry_run else "was"
    print(
        f"GATE {decision.gate_outcome.upper()} (rating: {decision.rating}) — "
        f"outcome {verb} recorded in learner/learning_state.yaml > units_log "
        f"(evidence: {evidence_path})"
    )
    if not dry_run:
        print("Committed via learner.substrate.gate (views resynced for repo path).")


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
        state = load_state(root)
    except (OSError, ValueError) as exc:
        print(f"CANNOT GATE — learner state unreadable/invalid: {exc}")
        return 1

    unit = state.get("active_unit", {})
    evidence_path = resolve_evidence(root, args.evidence, unit)
    if evidence_path is None or not evidence_path.exists():
        looked = args.evidence or ", ".join(DEFAULT_EVIDENCE_CANDIDATES)
        print(
            f"NOTHING TO GRADE — no evidence file found (looked for: {looked}). "
            "Play the mission first: `pnpm run smoke` inside "
            "engines/pixelDojo/pixel-quest/ regenerates the NDJSON evidence."
        )
        return 0

    try:
        evidence = load_one_evidence(evidence_path, unit)
    except ValueError as exc:
        print(f"NOT ELIGIBLE — evidence unreadable: {exc}")
        return 1

    shape = detect_evidence_shape(evidence or {})

    if shape == "literacy":
        verifier: Verifier = LiteracyVerifier()
        decision = verifier.verify(evidence_path, root=root)
        if decision.nothing_to_grade:
            print(
                f"NOTHING TO GRADE — {evidence_path} has no literacy record."
            )
            return 0
        if decision.errors:
            print("NOT ELIGIBLE — literacy evidence rejected:")
            for err in decision.errors:
                print(f"  - {err}")
            return 1
        print(
            f"LITERACY VERDICT PASS — mastery_eligible={decision.mastery_eligible} "
            f"(producer max claim remains completed; UI cannot write mastered)"
        )
        return 0

    # Game evidence: pixelDojo / voxelDojo / GATEKEEPER.
    semantic_only = (
        args.dry_run
        and args.evidence
        and unit.get("state") != "evaluating"
    )
    if semantic_only:
        decision = dry_run_semantic_check(
            evidence_path,
            root=root,
            active_unit=unit,
            verifier_receipt_path=args.verifier_receipt,
        )
    elif unit.get("state") != "evaluating":
        print(
            f"NOTHING TO GRADE — active unit {unit.get('id')!r} is in state "
            f"{unit.get('state')!r}, not 'evaluating'. The gate only runs after a "
            "learner attempt is awaiting verification (no state was written)."
        )
        return 0
    else:
        verifier = GameVerifier()
        decision = verifier.verify(
            evidence_path,
            root=root,
            dry_run=args.dry_run,
            verifier_receipt_path=args.verifier_receipt,
        )

    if decision.nothing_to_grade:
        print(
            f"NOTHING TO GRADE — {evidence_path} has no record for active unit "
            f"{unit.get('id')!r}. Replay that unit's encounter to produce evidence."
        )
        return 0

    if decision.errors:
        print("NOT ELIGIBLE — evidence rejected by the gate preconditions:")
        for err in decision.errors:
            print(f"  - {err}")
        return 1

    if semantic_only:
        print(
            "EVIDENCE SEMANTIC PASS — transition not applicable for active unit "
            f"{unit.get('id')!r} in state {unit.get('state')!r} (no state was written)."
        )
        return 0

    _print_game_outcome(decision, evidence_path, args.dry_run)
    return 0


if __name__ == "__main__":
    sys.exit(main())
