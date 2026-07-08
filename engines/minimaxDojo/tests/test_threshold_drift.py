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


if __name__ == "__main__":
    unittest.main()
