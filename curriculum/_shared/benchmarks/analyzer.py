"""Benchmark analyzer for aidevschool curriculum projects.

Validates that benchmark results meet reproducibility standards:
- N >= 3 samples per scenario per language
- Coefficient of Variation (CV%) < 20% for valid comparisons
- Raw samples preserved for audit

Usage:
    from curriculum._shared.benchmarks.analyzer import BenchmarkAnalyzer
    analyzer = BenchmarkAnalyzer()
    result = analyzer.analyze(samples, metric="p99_ms")
    if not result.passes_cv_gate:
        print(f"CV% too high: {result.cv_percent:.1f}%")
"""

from __future__ import annotations

import json
import math
import statistics
from dataclasses import dataclass, field
from pathlib import Path
from typing import Sequence


@dataclass(frozen=True)
class MetricSummary:
    """Statistical summary of a single metric across N samples."""

    metric: str
    samples: tuple[float, ...]
    count: int
    mean: float
    median: float
    minimum: float
    maximum: float
    stddev: float
    cv_percent: float

    @property
    def passes_cv_gate(self) -> bool:
        """True if CV% < 20% (threshold for valid cross-language comparison)."""
        return self.cv_percent < 20.0

    @property
    def passes_sample_count_gate(self) -> bool:
        """True if N >= 3 samples."""
        return self.count >= 3


@dataclass(frozen=True)
class ScenarioResult:
    """Results for one scenario (e.g., baseline) across one language."""

    scenario: str
    language: str
    metrics: dict[str, MetricSummary] = field(default_factory=dict)

    @property
    def passes_all_gates(self) -> bool:
        if not self.metrics:
            return False
        return all(
            m.passes_cv_gate and m.passes_sample_count_gate
            for m in self.metrics.values()
        )


@dataclass(frozen=True)
class BenchmarkReport:
    """Full benchmark report for a project."""

    project_id: str
    scenarios: dict[str, dict[str, ScenarioResult]] = field(default_factory=dict)

    def add_result(self, result: ScenarioResult) -> None:
        if result.scenario not in self.scenarios:
            self.scenarios[result.scenario] = {}
        self.scenarios[result.scenario][result.language] = result

    @property
    def all_pass(self) -> bool:
        return all(
            sr.passes_all_gates
            for lang_map in self.scenarios.values()
            for sr in lang_map.values()
        )

    def to_dict(self) -> dict:
        return {
            "project_id": self.project_id,
            "all_pass": self.all_pass,
            "scenarios": {
                scenario: {
                    lang: {
                        "passes": sr.passes_all_gates,
                        "metrics": {
                            name: {
                                "count": m.count,
                                "mean": round(m.mean, 4),
                                "median": round(m.median, 4),
                                "min": round(m.minimum, 4),
                                "max": round(m.maximum, 4),
                                "stddev": round(m.stddev, 4),
                                "cv_percent": round(m.cv_percent, 2),
                                "passes_cv": m.passes_cv_gate,
                                "passes_n": m.passes_sample_count_gate,
                            }
                            for name, m in sr.metrics.items()
                        },
                    }
                    for lang, sr in lang_map.items()
                }
                for scenario, lang_map in self.scenarios.items()
            },
        }


class BenchmarkAnalyzer:
    """Analyzes benchmark sample data and validates reproducibility."""

    CV_THRESHOLD = 20.0
    MIN_SAMPLES = 3
    REQUIRED_SCENARIOS = ("baseline", "stress", "spike", "endurance")
    REQUIRED_LANGUAGES = ("go", "rust", "node")

    def summarize(self, samples: Sequence[float], metric: str) -> MetricSummary:
        """Compute statistical summary for a list of sample values."""
        n = len(samples)
        if n == 0:
            raise ValueError(f"no samples for metric '{metric}'")

        s = tuple(float(x) for x in samples)
        mean = statistics.mean(s)
        median = statistics.median(s)
        minimum = min(s)
        maximum = max(s)
        stddev = statistics.stdev(s) if n > 1 else 0.0
        cv = (stddev / mean * 100.0) if mean != 0 else 0.0

        return MetricSummary(
            metric=metric,
            samples=s,
            count=n,
            mean=mean,
            median=median,
            minimum=minimum,
            maximum=maximum,
            stddev=stddev,
            cv_percent=cv,
        )

    def analyze_raw_samples(
        self,
        project_id: str,
        raw_data: dict,
    ) -> BenchmarkReport:
        """Analyze raw benchmark JSON data into a report.

        Expected format:
        {
            "baseline": {
                "go": [{"rps": 45000, "p99_ms": 8.4, ...}, ...],
                "rust": [...],
                "node": [...]
            },
            "stress": {...},
            ...
        }
        """
        report = BenchmarkReport(project_id=project_id)

        for scenario_name, languages in raw_data.items():
            for lang_name, samples_list in languages.items():
                if not isinstance(samples_list, list):
                    continue

                sr = ScenarioResult(scenario=scenario_name, language=lang_name)

                # Collect all metric keys from samples
                metric_keys: set[str] = set()
                for sample in samples_list:
                    if isinstance(sample, dict):
                        metric_keys.update(sample.keys())

                # Summarize each metric
                for key in metric_keys:
                    values = [
                        s[key]
                        for s in samples_list
                        if isinstance(s, dict) and key in s and isinstance(s[key], (int, float))
                    ]
                    if values:
                        sr.metrics[key] = self.summarize(values, key)

                report.add_result(sr)

        return report

    def validate_report(self, report: BenchmarkReport) -> list[str]:
        """Return list of validation errors (empty = valid)."""
        errors: list[str] = []

        for scenario in self.REQUIRED_SCENARIOS:
            if scenario not in report.scenarios:
                errors.append(f"missing scenario: {scenario}")
                continue

            for lang in self.REQUIRED_LANGUAGES:
                if lang not in report.scenarios[scenario]:
                    errors.append(f"missing language '{lang}' for scenario '{scenario}'")
                    continue

                sr = report.scenarios[scenario][lang]
                if not sr.passes_all_gates:
                    for name, m in sr.metrics.items():
                        if not m.passes_sample_count_gate:
                            errors.append(
                                f"{scenario}/{lang}/{name}: N={m.count} < {self.MIN_SAMPLES}"
                            )
                        if not m.passes_cv_gate:
                            errors.append(
                                f"{scenario}/{lang}/{name}: CV%={m.cv_percent:.1f} >= {self.CV_THRESHOLD}"
                            )

        return errors

    def export_json(self, report: BenchmarkReport, output_path: Path) -> None:
        """Export report as JSON file."""
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(
            json.dumps(report.to_dict(), indent=2, sort_keys=True),
            encoding="utf-8",
        )
