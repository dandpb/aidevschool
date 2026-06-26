"""Contract tests for the arena agent specs.

These are structural checks on the Markdown agent files — the load-bearing
ADR-005 invariant is producer != verifier, enforced here by asserting the
fairness-auditor (a judge) has NO Write/Edit tools. The behavioral fixture (the
agent actually flagging an unfair impl) is exercised when the pipeline runs
(task_06), not in a unit test — an LLM agent cannot run inside unittest.
"""

import sys
import unittest
from pathlib import Path

import yaml

REPO = Path(__file__).resolve().parents[4]
AGENTS = REPO / "engines" / "miniMaxEvolutionEngine" / ".claude" / "agents"
RUBRIC = REPO / "curriculum" / "_shared" / "arena" / "effort_budget_rubric.md"


def frontmatter(path: Path):
    text = path.read_text(encoding="utf-8")
    assert text.startswith("---"), f"{path} missing frontmatter"
    fm = yaml.safe_load(text.split("---", 2)[1])
    return fm, text


def tool_list(fm):
    return [t.strip() for t in str(fm.get("tools", "")).split(",")]


class TestFairnessAuditor(unittest.TestCase):
    def setUp(self):
        self.fm, self.text = frontmatter(AGENTS / "fairness-auditor.md")

    def test_is_a_judge_with_no_write_tools(self):
        tools = tool_list(self.fm)
        self.assertNotIn("Write", tools)  # ADR-005: producer != verifier
        self.assertNotIn("Edit", tools)

    def test_frontmatter_fields(self):
        self.assertEqual(self.fm["name"], "fairness-auditor")
        self.assertEqual(self.fm["model"], "opus")

    def test_verdict_contract_present(self):
        self.assertIn("VEREDICTO: PASS | FLAG", self.text)
        for lang in ("go", "rust", "node"):
            self.assertIn(f"{lang}:", self.text)


class TestArenaNarrator(unittest.TestCase):
    def setUp(self):
        self.fm, self.text = frontmatter(AGENTS / "arena-narrator.md")

    def test_is_a_producer_with_write_tools(self):
        self.assertIn("Write", tool_list(self.fm))  # narrator authors the narrative
        self.assertEqual(self.fm["name"], "arena-narrator")
        self.assertEqual(self.fm["model"], "opus")

    def test_grounding_and_single_concept_rules_present(self):
        # Every claim cites a measured metric; exactly one transferable concept.
        self.assertIn("aggregated.json", self.text)
        self.assertIn("conceito transferível", self.text.lower())

    def test_only_fills_narrative_does_not_unlock_gate(self):
        self.assertIn("Narrative", self.text)
        self.assertIn("gate", self.text.lower())


class TestEffortBudgetRubric(unittest.TestCase):
    def test_covers_all_three_languages(self):
        text = RUBRIC.read_text(encoding="utf-8")
        for lang in ("Go", "Rust", "Node"):
            self.assertIn(lang, text)

    def test_names_concrete_unfair_criteria_and_verdict(self):
        text = RUBRIC.read_text(encoding="utf-8")
        for token in ("unsafe", "SIMD", "release"):
            self.assertIn(token, text)
        self.assertIn("FLAG", text)


if __name__ == "__main__":
    unittest.main()
