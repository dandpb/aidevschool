"""Contract tests for the empirical gates.

These tests define the REQUIRED behavior of the empirical gate evaluator
that determines whether a unit can be marked DOMINADO.

Gate criteria (from docs/04_empirical_gates.md):
- mutation_score >= 0.65
- coverage_core >= 0.80
- Tests pass (exit 0 in sandbox)
- Linter clean (0 errors, 0 warnings)
- No anti-patterns from the blacklist

Reference: engines/minimaxDojo/docs/04_empirical_gates.md
"""

import unittest


class TestEmpiricalGate(unittest.TestCase):
    """Tests for the empirical gate evaluator."""

    def setUp(self):
        from engines.minimaxDojo.core.gates import EmpiricalGate
        self.gate_class = EmpiricalGate

    def test_pass_with_all_criteria_met(self):
        gate = self.gate_class()
        result = gate.evaluate(
            mutation_score=0.72,
            coverage_core=0.86,
            tests_pass=True,
            lint_clean=True,
            anti_patterns=[],
        )
        self.assertTrue(result.passed)
        self.assertEqual(result.verdict, "PASS")

    def test_fail_with_low_mutation_score(self):
        gate = self.gate_class()
        result = gate.evaluate(
            mutation_score=0.42,  # below 0.65
            coverage_core=0.86,
            tests_pass=True,
            lint_clean=True,
            anti_patterns=[],
        )
        self.assertFalse(result.passed)
        self.assertEqual(result.verdict, "FAIL")
        self.assertTrue(any("mutation" in g.lower() for g in result.gaps))

    def test_fail_with_low_coverage(self):
        gate = self.gate_class()
        result = gate.evaluate(
            mutation_score=0.72,
            coverage_core=0.70,  # below 0.80
            tests_pass=True,
            lint_clean=True,
            anti_patterns=[],
        )
        self.assertFalse(result.passed)
        self.assertTrue(any("coverage" in g.lower() for g in result.gaps))

    def test_fail_with_failing_tests(self):
        gate = self.gate_class()
        result = gate.evaluate(
            mutation_score=0.72,
            coverage_core=0.86,
            tests_pass=False,
            lint_clean=True,
            anti_patterns=[],
        )
        self.assertFalse(result.passed)
        self.assertTrue(any("test" in g.lower() for g in result.gaps))

    def test_fail_with_lint_errors(self):
        gate = self.gate_class()
        result = gate.evaluate(
            mutation_score=0.72,
            coverage_core=0.86,
            tests_pass=True,
            lint_clean=False,
            anti_patterns=[],
        )
        self.assertFalse(result.passed)
        self.assertTrue(any("lint" in g.lower() for g in result.gaps))

    def test_fail_with_anti_patterns(self):
        gate = self.gate_class()
        result = gate.evaluate(
            mutation_score=0.72,
            coverage_core=0.86,
            tests_pass=True,
            lint_clean=True,
            anti_patterns=["assert_true_in_test", "swallowed_exception"],
        )
        self.assertFalse(result.passed)
        self.assertTrue(any("anti-pattern" in g.lower() for g in result.gaps))

    def test_mutation_threshold_is_configurable(self):
        gate = self.gate_class(mutation_threshold=0.50)
        result = gate.evaluate(
            mutation_score=0.55,  # would fail default (0.65) but passes custom (0.50)
            coverage_core=0.86,
            tests_pass=True,
            lint_clean=True,
            anti_patterns=[],
        )
        self.assertTrue(result.passed)

    def test_coverage_threshold_is_configurable(self):
        gate = self.gate_class(coverage_threshold=0.70)
        result = gate.evaluate(
            mutation_score=0.72,
            coverage_core=0.75,  # would fail default (0.80) but passes custom (0.70)
            tests_pass=True,
            lint_clean=True,
            anti_patterns=[],
        )
        self.assertTrue(result.passed)

    def test_result_includes_evidence(self):
        gate = self.gate_class()
        result = gate.evaluate(
            mutation_score=0.72,
            coverage_core=0.86,
            tests_pass=True,
            lint_clean=True,
            anti_patterns=[],
        )
        self.assertEqual(result.mutation_score, 0.72)
        self.assertEqual(result.coverage_core, 0.86)
        self.assertTrue(result.tests_pass)
        self.assertTrue(result.lint_clean)

    def test_boundary_mutation_score_exactly_at_threshold(self):
        gate = self.gate_class()
        result = gate.evaluate(
            mutation_score=0.65,  # exactly at threshold
            coverage_core=0.86,
            tests_pass=True,
            lint_clean=True,
            anti_patterns=[],
        )
        self.assertTrue(result.passed)  # >= threshold passes

    def test_boundary_coverage_exactly_at_threshold(self):
        gate = self.gate_class()
        result = gate.evaluate(
            mutation_score=0.72,
            coverage_core=0.80,  # exactly at threshold
            tests_pass=True,
            lint_clean=True,
            anti_patterns=[],
        )
        self.assertTrue(result.passed)  # >= threshold passes

class TestGateConfigSeam(unittest.TestCase):
    """The gate's live thresholds must come from config/learner.yaml (the seam),
    not hardcoded constants. Guards the D8 wiring against regressions."""

    def test_gate_thresholds_reads_seam(self):
        from engines.minimaxDojo.core.config import gate_thresholds
        mutation, coverage = gate_thresholds()
        self.assertAlmostEqual(mutation, 0.65)
        self.assertAlmostEqual(coverage, 0.80)

    def test_gate_thresholds_overrides_drive_behavior(self):
        from engines.minimaxDojo.core.gates import EmpiricalGate
        from engines.minimaxDojo.core.config import gate_thresholds
        mutation, coverage = gate_thresholds(
            {"gates": {"mutation_score_min": 0.50, "cobertura_nucleo_min": 0.50}}
        )
        lenient = EmpiricalGate(mutation_threshold=mutation, coverage_threshold=coverage)
        result = lenient.evaluate(
            mutation_score=0.55, coverage_core=0.55, tests_pass=True, lint_clean=True
        )
        self.assertTrue(result.passed)


if __name__ == "__main__":
    unittest.main()
