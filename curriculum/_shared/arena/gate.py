"""Hard prediction gate + reveal for the Polyglot Arena (ADR-002).

The ``arena_report.md`` stays ``gate: locked`` until the learner commits a
per-metric prediction (latency / memory / throughput). ``commit_predictions``
refuses to reveal unless all three are present, appends the records to the
append-only prediction log (ADR-004), and flips the report to ``gate: revealed``
with a guess-vs-actual table. The ``run`` timestamp is caller-supplied (no clock
is read here), per the repo determinism rules.
"""

from __future__ import annotations

from pathlib import Path

from curriculum._shared.arena.predictions import append_prediction

METRICS = ("latency", "memory", "throughput")
LANGS = ("go", "rust", "node")
_LOCKED_PLACEHOLDER = "_pending — locked until the learner commits a per-metric prediction_"


def _prediction_table(records: list[dict]) -> str:
    rows = ["| Metric | Your guess | Actual | Hit? |", "|---|---|---|---|"]
    for r in records:
        hit = "✅" if r["correct"] else "❌"
        rows.append(f"| {r['metric']} | {r['predicted']} | {r['actual']} | {hit} |")
    return "\n".join(rows)


def commit_predictions(
    report_path: Path,
    project: str,
    run_id: str,
    predicted: dict[str, str],
    winners: dict[str, str],
    *,
    predictions_path: Path | None = None,
) -> list[dict]:
    """Hard gate: require all three per-metric predictions, then reveal.

    Raises ValueError (leaving the report locked) if any metric prediction is
    missing. On success: appends one record per metric to the prediction log and
    flips the report to ``gate: revealed`` with a guess-vs-actual table.
    """
    report_path = Path(report_path)
    missing = [m for m in METRICS if not predicted.get(m)]
    if missing:
        raise ValueError(f"hard gate: predictions required for all metrics; missing {missing}")
    invalid_winners = [m for m in METRICS if winners.get(m) not in LANGS]
    if invalid_winners:
        raise ValueError(f"hard gate: language winners required for all metrics; invalid {invalid_winners}")

    text = report_path.read_text(encoding="utf-8")
    if "gate: locked" not in text:
        raise ValueError("report is not locked; refusing to re-reveal")

    records: list[dict] = []
    for metric in METRICS:
        actual = winners[metric]
        rec = {
            "project": project, "run": run_id, "metric": metric,
            "predicted": predicted[metric], "actual": actual,
            "correct": predicted[metric] == actual,
        }
        append_prediction(rec, predictions_path)
        records.append(rec)

    text = text.replace("gate: locked", "gate: revealed")
    text = text.replace(_LOCKED_PLACEHOLDER, _prediction_table(records))
    report_path.write_text(text, encoding="utf-8")
    return records
