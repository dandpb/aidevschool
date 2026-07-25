"""Thin CLI entry for the LiteracyDojo no-code verifier.

The canonical implementation lives in ``learner.gate.literacy_verifier``; this
module exists so both spellings work:

    python3 -m learner.gate.literacy
    python3 -m learner.gate.literacy_verifier
"""

from __future__ import annotations

import sys

from learner.gate.literacy_verifier import main as _literacy_verifier_main


def main(argv: list[str] | None = None) -> int:
    """Delegate to the literacy verifier CLI to preserve exact behavior."""
    return _literacy_verifier_main(argv)


if __name__ == "__main__":
    sys.exit(main())
