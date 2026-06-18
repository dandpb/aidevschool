"""Tests for the benchmark analyzer.

Validates:
- N >= 3 sample count enforcement
- CV% < 20% threshold for valid comparisons
- Statistical summary correctness (mean, median, stddev, min, max)
- Full report validation (all scenarios, languages, gates)
"""

import math
import unittest
from pathlib import Path

import sys

# Add the repo root to path so we can import the analyzer
sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from curriculum._shared.benchmarks.analyzer import (
    BenchmarkAnalyzer,
    BenchmarkReport,
    MetricSummary,
    ScenarioResult,
)


class TestMetricSummary(unittest.TestCase):
    def setUp(self):
        self.analyzer = BenchmarkAnalyzer()

    def test_summarize_basic_metrics(self):
        samples = [10.0, 12.0, 11.0, 13.0, 10.5]
        summary = self.analyzer.summarize(samples, "p99_ms")

        self.assertEqual(summary.metric, "p99_ms")
        self.assertEqual(summary.count, 5)
        self.assertAlmostEqual(summary.mean, 11.3, places=1)
        self.assertAlmostEqual(summary.median, 11.0, places=1)
        self.assertEqual(summary.minimum, 10.0)
        self.assertEqual(summary.maximum, 13.0)
        self.assertGreater(summary.stddev, 0)

    def test_summarize_single_sample_has_zero_stddev(self):
        summary = self.analyzer.summarize([42.0], "rps")
        self.assertEqual(summary.count, 1)
        self.assertEqual(summary.stddev, 0.0)
        self.assertEqual(summary.cv_percent, 0.0)

    def test_cv_percent_calculated_correctly(self):
        # mean=100, stddev=5 → CV=5%
        samples = [95.0, 100.0, 105.0]
        summary = self.analyzer.summarize(samples, "latency")
        self.assertAlmostEqual(summary.cv_percent, 5.0, places=1)

    def test_passes_cv_gate_under_threshold(self):
        samples = [100.0, 101.0, 102.0]  # low variance
        summary = self.analyzer.summarize(samples, "rps")
        self.assertTrue(summary.passes_cv_gate)

    def test_fails_cv_gate_over_threshold(self):
        samples = [50.0, 100.0, 150.0]  # high variance → CV~40%
        summary = self.analyzer.summarize(samples, "rps")
        self.assertFalse(summary.passes_cv_gate)

    def test_passes_sample_count_gate_with_three(self):
        summary = self.analyzer.summarize([1.0, 2.0, 3.0], "x")
        self.assertTrue(summary.passes_sample_count_gate)

    def test_fails_sample_count_gate_with_two(self):
        summary = self.analyzer.summarize([1.0, 2.0], "x")
        self.assertFalse(summary.passes_sample_count_gate)

    def test_empty_samples_raises_error(self):
        with self.assertRaises(ValueError):
            self.analyzer.summarize([], "metric")

    def test_zero_mean_cv_is_zero(self):
        """CV% should be 0 when mean is 0 (not division by zero)."""
        summary = self.analyzer.summarize([0.0, 0.0, 0.0], "errors")
        self.assertEqual(summary.cv_percent, 0.0)


class TestScenarioResult(unittest.TestCase):
    def test_empty_metrics_fails(self):
        sr = ScenarioResult(scenario="baseline", language="go")
        self.assertFalse(sr.passes_all_gates)

    def test_passes_with_valid_metrics(self):
        analyzer = BenchmarkAnalyzer()
        good_metric = analyzer.summarize([100.0, 101.0, 99.0], "rps")
        sr = ScenarioResult(
            scenario="baseline",
            language="go",
            metrics={"rps": good_metric},
        )
        self.assertTrue(sr.passes_all_gates)

    def test_fails_with_high_cv(self):
        analyzer = BenchmarkAnalyzer()
        bad_metric = analyzer.summarize([50.0, 100.0, 200.0], "rps")
        sr = ScenarioResult(
            scenario="stress",
            language="rust",
            metrics={"rps": bad_metric},
        )
        self.assertFalse(sr.passes_all_gates)


class TestBenchmarkReport(unittest.TestCase):
    def setUp(self):
        self.analyzer = BenchmarkAnalyzer()
        self.good_samples = [100.0, 101.0, 99.0, 100.5]

    def _make_good_result(self, scenario, language):
        return ScenarioResult(
            scenario=scenario,
            language=language,
            metrics={"rps": self.analyzer.summarize(self.good_samples, "rps")},
        )

    def test_empty_report_passes(self):
        report = BenchmarkReport(project_id="test")
        self.assertTrue(report.all_pass)  # vacuously true

    def test_report_with_all_scenarios_passes(self):
        report = BenchmarkReport(project_id="test")
        for scenario in ("baseline", "stress", "spike", "endurance"):
            for lang in ("go", "rust", "node"):
                report.add_result(self._make_good_result(scenario, lang))
        self.assertTrue(report.all_pass)

    def test_report_with_failing_scenario_does_not_pass(self):
        report = BenchmarkReport(project_id="test")
        report.add_result(self._make_good_result("baseline", "go"))
        bad_metric = self.analyzer.summarize([10.0, 200.0, 50.0], "rps")
        report.add_result(ScenarioResult(
            scenario="baseline", language="rust", metrics={"rps": bad_metric}
        ))
        self.assertFalse(report.all_pass)


class TestBenchmarkAnalyzerValidation(unittest.TestCase):
    def setUp(self):
        self.analyzer = BenchmarkAnalyzer()

    def test_valid_report_has_no_errors(self):
        good_samples = [100.0, 101.0, 102.0]
        report = BenchmarkReport(project_id="test")
        for scenario in ("baseline", "stress", "spike", "endurance"):
            for lang in ("go", "rust", "node"):
                m = self.analyzer.summarize(good_samples, "rps")
                report.add_result(ScenarioResult(
                    scenario=scenario, language=lang, metrics={"rps": m}
                ))
        errors = self.analyzer.validate_report(report)
        self.assertEqual(errors, [])

    def test_missing_scenario_reported(self):
        report = BenchmarkReport(project_id="test")
        errors = self.analyzer.validate_report(report)
        self.assertIn("missing scenario: baseline", errors)
        self.assertIn("missing scenario: stress", errors)

    def test_missing_language_reported(self):
        report = BenchmarkReport(project_id="test")
        m = self.analyzer.summarize([100.0, 101.0, 102.0], "rps")
        report.add_result(ScenarioResult(
            scenario="baseline", language="go", metrics={"rps": m}
        ))
        errors = self.analyzer.validate_report(report)
        self.assertTrue(any("missing language 'rust'" in e for e in errors))
        self.assertTrue(any("missing language 'node'" in e for e in errors))

    def test_insufficient_samples_reported(self):
        report = BenchmarkReport(project_id="test")
        m = self.analyzer.summarize([100.0, 101.0], "rps")  # N=2 < 3
        for scenario in ("baseline", "stress", "spike", "endurance"):
            for lang in ("go", "rust", "node"):
                report.add_result(ScenarioResult(
                    scenario=scenario, language=lang, metrics={"rps": m}
                ))
        errors = self.analyzer.validate_report(report)
        self.assertTrue(any("N=2" in e for e in errors))

    def test_high_cv_reported(self):
        report = BenchmarkReport(project_id="test")
        m = self.analyzer.summarize([50.0, 100.0, 200.0], "rps")  # CV high
        for scenario in ("baseline", "stress", "spike", "endurance"):
            for lang in ("go", "rust", "node"):
                report.add_result(ScenarioResult(
                    scenario=scenario, language=lang, metrics={"rps": m}
                ))
        errors = self.analyzer.validate_report(report)
        self.assertTrue(any("CV%" in e for e in errors))


class TestAnalyzeRawSamples(unittest.TestCase):
    def setUp(self):
        self.analyzer = BenchmarkAnalyzer()

    def test_analyze_well_formed_data(self):
        raw = {
            "baseline": {
                "go": [
                    {"rps": 45000, "p99_ms": 8.4},
                    {"rps": 45100, "p99_ms": 8.2},
                    {"rps": 44900, "p99_ms": 8.6},
                ],
            },
        }
        report = self.analyzer.analyze_raw_samples("test", raw)
        self.assertIn("baseline", report.scenarios)
        self.assertIn("go", report.scenarios["baseline"])
        metrics = report.scenarios["baseline"]["go"].metrics
        self.assertIn("rps", metrics)
        self.assertEqual(metrics["rps"].count, 3)

    def test_analyze_skips_non_numeric_values(self):
        raw = {
            "baseline": {
                "go": [
                    {"rps": 45000, "label": "run1"},
                    {"rps": 45100, "label": "run2"},
                    {"rps": 44900, "label": "run3"},
                ],
            },
        }
        report = self.analyzer.analyze_raw_samples("test", raw)
        metrics = report.scenarios["baseline"]["go"].metrics
        self.assertIn("rps", metrics)
        self.assertNotIn("label", metrics)


if __name__ == "__main__":
    unittest.main()
