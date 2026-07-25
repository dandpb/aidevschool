"""CLI: independently verify LiteracyEvidenceRecord (no-code path).

Run from the ecosystem root:

    python3 -m learner.gate.literacy --evidence PATH.json
    python3 -m learner.gate.literacy --evidence PATH.json --write-receipt learner/verifier_receipts/literacy-last.json

Exit codes:
  0 = independent verdict PASS (and optional receipt written)
  1 = FAIL, missing/invalid evidence, or unreadable input (fail closed)

This path never writes ``mastered`` into LiteracyDojo UI state or
``learner/learning_state.yaml``. Receipts only record the independent judgment.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from learner.gate.literacy_verifier import (
    load_literacy_evidence,
    verify_literacy_evidence,
    write_literacy_receipt,
)


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
