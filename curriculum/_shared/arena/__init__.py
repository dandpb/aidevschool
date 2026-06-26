"""Arena orchestration: drive the benchmark runner, gate on statistical trust,
and assemble a still-locked ``arena_report.md`` (see ADR-001, ADR-003).

``run_arena`` reuses ``curriculum._shared.benchmarks`` (runner + analyzer) and
fails closed: if the benchmark report does not pass the analyzer gate
(N>=3, CV<20% across every scenario x language), no revealable report is written.
The report it does write stays ``gate: locked`` — the narrative and prediction
are filled by later pipeline stages (arena-narrator, the prediction gate).
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from curriculum._shared.benchmarks import runner as R
from curriculum._shared.benchmarks.analyzer import BenchmarkReport

_TEMPLATE = Path(__file__).parent / "templates" / "arena_report.md"

# metric -> (sample key, "lower is better"?). These are the three PRD metrics.
SCOREBOARD_METRICS: dict[str, tuple[str, bool]] = {
    "latency": ("p99", True),
    "throughput": ("n_requests", False),
    "memory": ("mem_mb", True),
}

# The trust gate evaluates ONLY the metrics that declare winners (the scoreboard
# decision metrics), not every incidental counter k6 emits. Gating a comparison
# on e.g. duration_max (worst single request) or a post-run cpu snapshot — which
# no winner depends on — is over-strict and inherently high-variance. A winner is
# trustworthy iff the metric it is based on is stable (CV<20%, N>=3).
GATE_METRICS: tuple[str, ...] = ("p99", "n_requests", "mem_mb")


def metric_trust(report: BenchmarkReport, sample_key: str) -> bool:
    """True iff one metric passes CV<20% and N>=3 for every lang in every scenario.

    This is the per-metric trust test: a winner for this metric can be declared
    only if the metric is stable enough that the winner is real, not noise.
    """
    seen = False
    for lang_map in report.scenarios.values():
        for sr in lang_map.values():
            m = sr.metrics.get(sample_key)
            if m is None:
                return False
            seen = True
            if not (m.passes_cv_gate and m.passes_sample_count_gate):
                return False
    return seen


def decision_gate(report: BenchmarkReport) -> bool:
    """Strict gate: every decision metric (GATE_METRICS) is trustworthy."""
    if not report.scenarios:
        return False
    return all(metric_trust(report, key) for key in GATE_METRICS)


@dataclass(frozen=True)
class ArenaResult:
    """Outcome of an arena run."""

    report: BenchmarkReport
    gate_passed: bool
    report_path: Path | None  # path to the locked arena_report.md, or None if gate failed
    winners: dict[str, str]  # metric -> winning language (empty if gate failed)


def _median_by_lang(report: BenchmarkReport, sample_key: str) -> dict[str, float]:
    """Median of a metric per language, averaged across scenarios (median of medians)."""
    per_lang: dict[str, list[float]] = {}
    for lang_map in report.scenarios.values():
        for lang, sr in lang_map.items():
            m = sr.metrics.get(sample_key)
            if m is not None:
                per_lang.setdefault(lang, []).append(m.median)
    return {
        lang: round(sum(vals) / len(vals), 4)
        for lang, vals in per_lang.items()
        if vals
    }


def scoreboard(report: BenchmarkReport) -> tuple[str, dict[str, str], dict[str, bool]]:
    """Render the per-metric scoreboard and return (markdown, winners, trust).

    A winner is declared ONLY for metrics whose trust gate passes (CV<20%, N>=3);
    untrustworthy metrics show their worst CV and declare no winner — "no wrong
    lessons". ``winners`` contains only trustworthy metrics; ``trust`` maps every
    present metric to its trust boolean.
    """
    langs = sorted({lang for lm in report.scenarios.values() for lang in lm})
    header = "| Metric | " + " | ".join(langs) + " | Winner |"
    sep = "|" + "---|" * (len(langs) + 2)
    rows = [header, sep]
    winners: dict[str, str] = {}
    trust: dict[str, bool] = {}
    for metric, (key, lower_better) in SCOREBOARD_METRICS.items():
        by_lang = _median_by_lang(report, key)
        if not by_lang:
            continue
        trustworthy = metric_trust(report, key)
        trust[metric] = trustworthy
        cells = " | ".join(
            f"{by_lang.get(l, float('nan')):.2f}" if l in by_lang else "—" for l in langs
        )
        arrow = "↓" if lower_better else "↑"
        if trustworthy:
            winner = (min if lower_better else max)(by_lang, key=by_lang.get)
            winners[metric] = winner
            winner_cell = f"**{winner}**"
        else:
            worst_cv = _worst_cv(report, key)
            winner_cell = f"_untrustworthy (CV {worst_cv:.0f}%)_"
        rows.append(f"| {metric} ({key} {arrow}) | {cells} | {winner_cell} |")
    return "\n".join(rows), winners, trust


def _worst_cv(report: BenchmarkReport, sample_key: str) -> float:
    cvs = [
        sr.metrics[sample_key].cv_percent
        for lm in report.scenarios.values()
        for sr in lm.values()
        if sample_key in sr.metrics
    ]
    return max(cvs) if cvs else 0.0


def assemble_report(
    project_dir: Path,
    report: BenchmarkReport,
    project_id: str,
    run_id: str,
    *,
    gate: str = "locked",
) -> tuple[Path, dict[str, str]]:
    """Write a locked arena_report.md from the template; return (path, winners)."""
    board, winners, _trust = scoreboard(report)
    links = (
        "- [benchmark_results.md](./benchmark_results.md)\n"
        "- [code_review.md](./code_review.md)\n"
        "- [evolution_report.md](./evolution_report.md)"
    )
    text = _TEMPLATE.read_text(encoding="utf-8")
    for token, value in {
        "{{PROJECT}}": project_id,
        "{{RUN}}": run_id,
        "{{GATE}}": gate,
        "{{PREDICTION}}": "_pending — locked until the learner commits a per-metric prediction_",
        "{{SCOREBOARD}}": board,
        "{{NARRATIVE}}": "_pending — produced by the arena-narrator, then verifier-confirmed_",
        "{{CODE_STUDY}}": "_pending — produced by the reviewer (CRITICO) cross-language study_",
        "{{LINKS}}": links,
    }.items():
        text = text.replace(token, value)

    out = Path(project_dir) / "docs" / "arena_report.md"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(text, encoding="utf-8")
    return out, winners


def run_arena(
    project_dir: Path,
    project_id: str,
    run_id: str,
    n: int = 3,
    *,
    cfg: R.BenchmarkConfig | None = None,
    live: bool = False,
) -> ArenaResult:
    """Benchmark, gate, and assemble a locked report.

    When ``live`` is True, executes the benchmark runner (needs docker + k6);
    otherwise it aggregates from result files already on disk. Fails closed if
    the analyzer gate does not pass.
    """
    project_dir = Path(project_dir)
    cfg = cfg or R.load_benchmark_config(project_dir / "benchmark.yaml")

    if live:
        for lang in R.LANGS:
            for scenario in cfg.scenarios:
                for run_num in range(1, n + 1):
                    R.run_benchmark(project_dir, lang, scenario, run_num, cfg)

    report = R.aggregate(project_dir, cfg, project_id, n)
    if not decision_gate(report):
        return ArenaResult(report=report, gate_passed=False, report_path=None, winners={})

    path, winners = assemble_report(project_dir, report, project_id, run_id)
    return ArenaResult(report=report, gate_passed=True, report_path=path, winners=winners)
