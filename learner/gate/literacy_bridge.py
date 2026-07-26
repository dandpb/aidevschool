"""Fixed stdin/stdout bridge for independent LiteracyDojo verification.

The browser supplies one evidence object. It cannot supply a path, executable,
argument list, credential, or receipt destination. The caller owns process
selection and treats both PASS and FAIL as closed independent receipts.
"""

from __future__ import annotations

import json
import sys
from typing import Any, TextIO

from learner.gate.literacy_verifier import verify_literacy_evidence


def verify_stream(input_stream: TextIO, output_stream: TextIO) -> int:
    try:
        raw: Any = json.load(input_stream)
    except (json.JSONDecodeError, UnicodeError):
        raw = None
    evidence = raw if isinstance(raw, dict) else None
    verdict = verify_literacy_evidence(evidence)
    output_stream.write(
        json.dumps(verdict.to_receipt_dict(), sort_keys=True, separators=(",", ":"))
        + "\n"
    )
    return 0 if verdict.passed else 1


def main() -> int:
    return verify_stream(sys.stdin, sys.stdout)


if __name__ == "__main__":
    raise SystemExit(main())
