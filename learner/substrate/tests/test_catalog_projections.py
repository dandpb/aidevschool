from __future__ import annotations

import unittest
from pathlib import Path

from learner.substrate.catalog import (
    parse_catalog,
    render_backlog,
    render_projects_ts,
)


CATALOG = """# Catalog

## Level 1 — Fundamentals

### 01. Rate Limiter

| Field | Value |
| --- | --- |
| **Slug** | `01_rate_limiter` |
| **Status** | ✅ Implemented |
| **Concepts** | Token bucket, concurrency |
| **Key question** | How do runtimes coordinate refill? |
| **Directory** | `01_rate_limiter/` |
| **Evidence** | Verifier PASS with executable evidence. |
| **Dependencies** | None |
"""


class TestCatalogProjections(unittest.TestCase):
    def test_projects_are_derived_from_catalog(self) -> None:
        projects = parse_catalog(CATALOG)

        rendered = render_projects_ts(projects)

        self.assertIn("AUTO-GENERATED", rendered)
        self.assertIn('id: "p01"', rendered)
        self.assertIn('title: "Rate Limiter"', rendered)
        self.assertIn('phase: "fundamentos"', rendered)
        self.assertIn("How do runtimes coordinate refill?", rendered)
        evidence = rendered.index("Verifier PASS with executable evidence.")
        status = rendered.index("implemented", evidence)
        self.assertLess(evidence, status)

    def test_backlog_preserves_catalog_evidence_and_has_one_update_rule(self) -> None:
        backlog = render_backlog(parse_catalog(CATALOG))

        self.assertIn("Verifier PASS with executable evidence.", backlog)
        self.assertIn("Edit `curriculum/catalog.md`", backlog)
        self.assertNotIn("Update this file's row", backlog)
        self.assertIn("AUTO-GENERATED", backlog)

    def test_rendering_is_deterministic(self) -> None:
        projects = parse_catalog(CATALOG)

        self.assertEqual(render_projects_ts(projects), render_projects_ts(projects))
        self.assertEqual(render_backlog(projects), render_backlog(projects))

    def test_real_catalog_preserves_node_only_certification_caveat(self) -> None:
        root = Path(__file__).resolve().parents[3]

        backlog = render_backlog(
            parse_catalog((root / "curriculum" / "catalog.md").read_text(encoding="utf-8"))
        )

        self.assertIn("Node.js-only", backlog)
        self.assertIn("not performance-parity certified", backlog)


if __name__ == "__main__":
    unittest.main()
