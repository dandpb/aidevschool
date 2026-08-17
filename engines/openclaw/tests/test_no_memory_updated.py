"""Regression guard: ``MEMORY_UPDATED`` must not reappear in the openclaw package.

Audit ref: ``docs/TECH_DEBT_AUDIT_2026-07-08.md`` item 20 listed "dead
``MEMORY_UPDATED`` branches in openclaw" as open work. A follow-up scan of
the package at HEAD found no ``MEMORY_UPDATED`` reference anywhere in
``engines/openclaw/`` (only the audit document itself mentions the string).

This test pins that finding: it walks every Python file under the openclaw
package and fails if a ``MEMORY_UPDATED`` token reappears. The intent is
to catch a reintroduction of a Hermes/theater event handler that no real
producer emits — keeping the simulate runner honest (audit §"Healthy
findings" / "ponytail" in checklist.py).

If a future change legitimately needs to handle memory events here, the
import path is to re-introduce the branch in :mod:`engines.openclaw.runner`
and update this guard to scope the exemption (or remove the guard).
"""

from __future__ import annotations

import re
import unittest
from pathlib import Path


def _openclaw_root() -> Path:
    return Path(__file__).resolve().parent.parent


class TestNoMemoryUpdatedInOpenclaw(unittest.TestCase):
    """The ``MEMORY_UPDATED`` identifier is dead in openclaw; keep it that way."""

    def test_no_memory_updated_token_in_openclaw_sources(self) -> None:
        pattern = re.compile(r"\bMEMORY_UPDATED\b")
        offenders: list[str] = []
        for path in _openclaw_root().rglob("*.py"):
            if "__pycache__" in path.parts:
                continue
            if "tests" in path.parts:
                # Tests are allowed to mention the audit ref in docstrings.
                continue
            text = path.read_text(encoding="utf-8")
            for match in pattern.finditer(text):
                line_no = text[: match.start()].count("\n") + 1
                offenders.append(f"{path.relative_to(_openclaw_root().parent)}:{line_no}")
        self.assertEqual(
            offenders,
            [],
            "MEMORY_UPDATED is a dead identifier in openclaw (audit ref item 20); "
            "do not re-introduce a handler that no producer emits. Offenders: "
            + ", ".join(offenders),
        )


if __name__ == "__main__":
    unittest.main()
