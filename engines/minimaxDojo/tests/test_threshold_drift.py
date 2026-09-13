"""Drift check: threshold seam vs canonical learner state and MME skill prose.

The single numeric source is ``engines/minimaxDojo/config/learner.yaml``.
``learner/learning_state.yaml`` and high-level skill docs must not invent a second
mutation threshold.
"""

from __future__ import annotations

import re
import unittest
from pathlib import Path

import yaml

ENGINE_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = ENGINE_ROOT.parents[1]
CONFIG_PATH = ENGINE_ROOT / "config" / "learner.yaml"
LEARNING_STATE = REPO_ROOT / "learner" / "learning_state.yaml"
AGORA_SKILL = (
    REPO_ROOT
    / "engines"
    / "miniMaxEvolutionEngine"
    / ".claude"
    / "skills"
    / "agora-continuum"
    / "SKILL.md"
)


def load_config() -> dict:
    with CONFIG_PATH.open("r", encoding="utf-8") as f:
        for doc in yaml.safe_load_all(f):
            if doc is not None:
                return doc
    raise ValueError("no YAML document found")


class TestThresholdDrift(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.config = load_config()
        cls.mutation = float(cls.config["gates"]["mutation_score_min"])
        cls.coverage = float(cls.config["gates"]["cobertura_nucleo_min"])

    def test_learning_state_mutation_min_matches_seam(self) -> None:
        state = yaml.safe_load(LEARNING_STATE.read_text(encoding="utf-8"))
        unit_gate = (state.get("active_unit") or {}).get("empirical_gate") or {}
        self.assertIn("mutation_min", unit_gate)
        self.assertAlmostEqual(
            float(unit_gate["mutation_min"]),
            self.mutation,
            places=4,
            msg=(
                "active_unit.empirical_gate.mutation_min must match "
                "engines/minimaxDojo/config/learner.yaml gates.mutation_score_min"
            ),
        )
        if "min_coverage" in unit_gate:
            self.assertAlmostEqual(
                float(unit_gate["min_coverage"]),
                self.coverage,
                places=4,
            )

    def test_agora_skill_does_not_hardcode_lower_mutation(self) -> None:
        if not AGORA_SKILL.exists():
            self.skipTest("agora-continuum skill not present")
        text = AGORA_SKILL.read_text(encoding="utf-8")
        # Flag bare 0.60 / 60% mutation claims that disagree with the seam (0.65).
        bad = re.findall(
            r"mutation[^\n]{0,40}(?:0\.60|60\s*%|≥\s*60)",
            text,
            flags=re.IGNORECASE,
        )
        self.assertEqual(
            bad,
            [],
            msg=(
                f"agora-continuum skill hardcodes mutation threshold(s) {bad!r}; "
                f"use ⟨config: gates.mutation_score_min⟩ (= {self.mutation})"
            ),
        )

def _threshold_literal_violations(root: Path) -> list[str]:
    """Scan production .py files for hardcoded mutation/coverage thresholds.

    Excludes ``tests`` directories (fixtures legitimately carry scores) and
    ``__pycache__``. The live bar is read from the seam at judgment time by
    ``learner/gate/standards.load_thresholds``; any literal here is drift.
    """
    import re

    pattern = re.compile(
        r"(mutation(?:_score)?(?:_min)?|cobertura|coverage(?:_core)?(?:_min)?)"
        r"[^\n]{0,40}(?:=|:|<|>|≥)\s*0\.[6-9][0-9]",
        re.IGNORECASE,
    )
    findings: list[str] = []
    for area in ("learner", "curriculum"):
        for path in (root / area).rglob("*.py"):
            if "tests" in path.parts or "__pycache__" in path.parts:
                continue
            try:
                text = path.read_text(encoding="utf-8")
            except OSError:
                continue
            for lineno, line in enumerate(text.splitlines(), start=1):
                if pattern.search(line):
                    findings.append(f"{path.relative_to(root)}:{lineno}: {line.strip()}")
    return findings


class TestThresholdLiterals(unittest.TestCase):
    """Cerca estendida (H2): nenhum literal de threshold fora do seam."""

    def test_no_hardcoded_threshold_literals(self) -> None:
        findings = _threshold_literal_violations(REPO_ROOT)
        self.assertEqual(
            findings,
            [],
            msg=(
                "Hardcoded threshold literal(s) found; the enforced bar lives in "
 f"{CONFIG_PATH} (read at judgment time by learner.gate.standards). "
                f"Offenders: {findings}"
            ),
        )

    def test_fence_discriminates(self) -> None:
        import tempfile

        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            good = root / "learner" / "pkg"
            good.mkdir(parents=True)
            (good / "clean.py").write_text(
                'THRESH = load_thresholds()\n', encoding="utf-8"
            )
            self.assertEqual(_threshold_literal_violations(root), [])

            (good / "dirty.py").write_text(
                "MUTATION_MIN = 0.65\n", encoding="utf-8"
            )
            findings = _threshold_literal_violations(root)
            self.assertEqual(len(findings), 1)
            self.assertIn("dirty.py", findings[0])

            # Test fixtures are exempt by design.
            fixture = root / "learner" / "pkg" / "tests"
            fixture.mkdir()
            (fixture / "test_fixture.py").write_text(
                'verifier = {"mutation_score": 0.64}\n', encoding="utf-8"
            )
            self.assertEqual(len(_threshold_literal_violations(root)), 1)


if __name__ == "__main__":
    unittest.main()
