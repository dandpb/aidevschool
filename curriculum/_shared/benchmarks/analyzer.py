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
import statistics
from collections.abc import Mapping, Sequence
from dataclasses import dataclass, field
from pathlib import Path
from types import MappingProxyType
from typing import Final, TypeAlias, TypeGuard, TypedDict

MetricMap: TypeAlias = Mapping[str, "MetricSummary"]
LanguageResults: TypeAlias = Mapping[str, "ScenarioResult"]
ScenarioResults: TypeAlias = Mapping[str, LanguageResults]
RawMetricValue: TypeAlias = int | float | str | bool | None
RawSample: TypeAlias = Mapping[str, RawMetricValue]
RawSampleEntry: TypeAlias = RawSample | RawMetricValue
RawLanguageSamples: TypeAlias = Sequence[RawSampleEntry] | RawMetricValue
RawBenchmarkData: TypeAlias = Mapping[str, Mapping[str, RawLanguageSamples]]


class MetricDocument(TypedDict):
    count: int
    mean: float
    median: float
    min: float
    max: float
    stddev: float
    cv_percent: float
    passes_cv: bool
    passes_n: bool


class ScenarioDocument(TypedDict):
    passes: bool
    metrics: dict[str, MetricDocument]


class BenchmarkReportDocument(TypedDict):
    project_id: str
    all_pass: bool
    scenarios: dict[str, dict[str, ScenarioDocument]]


@dataclass(frozen=True, slots=True)
class BenchmarkInputError(ValueError):
    """A benchmark metric cannot be summarized without samples."""

    metric: str

    def __str__(self) -> str:
        return f"no samples for metric '{self.metric}'"


def _freeze_metrics(metrics: Mapping[str, "MetricSummary"]) -> MetricMap:
    return MappingProxyType(dict(metrics))


def _freeze_scenarios(scenarios: Mapping[str, Mapping[str, "ScenarioResult"]]) -> ScenarioResults:
    return MappingProxyType({name: MappingProxyType(dict(results)) for name, results in scenarios.items()})


@dataclass(frozen=True, slots=True)
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


@dataclass(frozen=True, slots=True)
class ScenarioResult:
    """Results for one scenario (e.g., baseline) across one language."""

    scenario: str
    language: str
    metrics: MetricMap = field(default_factory=dict)

    def __post_init__(self) -> None:
        object.__setattr__(self, "metrics", _freeze_metrics(self.metrics))

    @property
    def passes_all_gates(self) -> bool:
        if not self.metrics:
            return False
        return all(
            m.passes_cv_gate and m.passes_sample_count_gate
            for m in self.metrics.values()
        )


@dataclass(frozen=True, slots=True)
class BenchmarkReport:
    """Full benchmark report for a project."""

    project_id: str
    scenarios: ScenarioResults = field(default_factory=dict)

    def __post_init__(self) -> None:
        object.__setattr__(self, "scenarios", _freeze_scenarios(self.scenarios))

    def add_result(self, result: ScenarioResult) -> None:
        scenarios = {name: dict(results) for name, results in self.scenarios.items()}
        scenarios.setdefault(result.scenario, {})[result.language] = result
        object.__setattr__(self, "scenarios", _freeze_scenarios(scenarios))

    @property
    def all_pass(self) -> bool:
        return all(
            sr.passes_all_gates
            for lang_map in self.scenarios.values()
            for sr in lang_map.values()
        )

    def to_dict(self) -> BenchmarkReportDocument:
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

    CV_THRESHOLD: Final = 20.0
    MIN_SAMPLES: Final = 3
    REQUIRED_SCENARIOS: Final = ("baseline", "stress", "spike", "endurance")
    REQUIRED_LANGUAGES: Final = ("go", "rust", "node")

    def summarize(self, samples: Sequence[float], metric: str) -> MetricSummary:
        """Compute statistical summary for a list of sample values."""
        n = len(samples)
        if n == 0:
            raise BenchmarkInputError(metric=metric)

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
        raw_data: RawBenchmarkData,
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
        # Accumulate first and freeze once: add_result rebuilds the whole map per
        # call, which is quadratic over a full scenario x language sweep.
        scenarios: dict[str, dict[str, ScenarioResult]] = {}

        for scenario_name, languages in raw_data.items():
            for lang_name, samples in languages.items():
                if not isinstance(samples, list):
                    continue
                mapping_samples = [sample for sample in samples if _is_raw_sample(sample)]
                metric_keys = {key for sample in mapping_samples for key in sample}
                metrics = {
                    key: self.summarize(values, key)
                    for key in metric_keys
                    if (values := _numeric_values(mapping_samples, key))
                }
                scenarios.setdefault(scenario_name, {})[lang_name] = ScenarioResult(
                    scenario=scenario_name, language=lang_name, metrics=metrics
                )

        return BenchmarkReport(project_id=project_id, scenarios=scenarios)

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
        _ = output_path.write_text(
            json.dumps(report.to_dict(), indent=2, sort_keys=True),
            encoding="utf-8",
        )


def _is_raw_sample(value: RawSampleEntry) -> TypeGuard[RawSample]:
    return isinstance(value, Mapping)


def _numeric_values(samples: Sequence[RawSample], metric: str) -> list[float]:
    return [
        float(value)
        for sample in samples
        if isinstance(value := sample.get(metric), (int, float))
    ]
