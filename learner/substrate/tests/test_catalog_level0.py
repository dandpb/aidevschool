"""Level-0 catalog support (spec: .specs/features/vision-dual-audience — VIS-06).

Derived from spec ACs, not from the implementation:
- AC1: `## Level 0` + `### 00.` parse, and level 0 maps to phase `aplicacao_ia`.
- AC2: non-contiguous numbering raises CatalogFormatError.
- Edge: project heading before any level heading still fails.
- Edge: legacy catalogs starting at 01 keep parsing.
- Edge: a level without a phase mapping still fails at render time.
"""

import unittest

from learner.substrate.catalog import (
    CatalogFormatError,
    parse_catalog,
    render_projects_ts,
)


def _project_block(number: int, slug: str) -> str:
    return "\n".join(
        [
            f"### {number:02d}. Project {number}",
            "",
            "| Field | Value |",
            "|-------|-------|",
            f"| **Slug** | `{slug}` |",
            "| **Status** | planned |",
            "| **Concepts** | concept |",
            "| **Key question** | question? |",
            f"| **Directory** | `{slug}/` |",
            "| **Dependencies** | None |",
            "",
        ]
    )


def _catalog(*sections: str) -> str:
    return "\n".join(sections)


class TestLevelZeroParsing(unittest.TestCase):
    def test_accepts_level0_catalog_and_maps_aplicacao_ia_phase(self):
        text = _catalog(
            "## Level 0",
            _project_block(0, "00_ai_in_practice"),
            "## Level 1",
            _project_block(1, "01_rate_limiter"),
        )
        projects = parse_catalog(text)
        self.assertEqual([p.number for p in projects], [0, 1])
        self.assertEqual(projects[0].level, 0)
        self.assertEqual(projects[0].status, "planned")
        rendered = render_projects_ts(projects)
        self.assertIn('id: "p00"', rendered)
        self.assertIn('phase: "aplicacao_ia"', rendered)

    def test_rejects_noncontiguous_numbering_from_zero(self):
        text = _catalog(
            "## Level 0",
            _project_block(0, "00_ai_in_practice"),
            "## Level 1",
            _project_block(2, "02_key_value_store"),
        )
        with self.assertRaises(CatalogFormatError):
            parse_catalog(text)

    def test_rejects_project_before_any_level(self):
        text = _catalog(_project_block(0, "00_ai_in_practice"))
        with self.assertRaises(CatalogFormatError):
            parse_catalog(text)

    def test_legacy_catalog_starting_at_one_still_parses(self):
        text = _catalog("## Level 1", _project_block(1, "01_rate_limiter"))
        projects = parse_catalog(text)
        self.assertEqual([p.number for p in projects], [1])

    def test_level_without_phase_mapping_fails_at_render(self):
        text = _catalog("## Level 7", _project_block(1, "01_rate_limiter"))
        projects = parse_catalog(text)
        with self.assertRaises(CatalogFormatError):
            render_projects_ts(projects)


if __name__ == "__main__":
    unittest.main()
