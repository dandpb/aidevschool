from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml

ROOT = Path(__file__).resolve().parent.parent.parent
PREDICTIONS = ROOT / "learner" / "predictions.yaml"
PREDICTION_METRICS = ("latency", "memory", "throughput")
VALID_WINNERS = ("go", "rust", "node")


def summarize_predictions(path: Path = PREDICTIONS) -> dict[str, Any]:
    by_metric = {m: {"correct": 0, "total": 0} for m in PREDICTION_METRICS}
    count = 0
    if path.exists():
        data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
        for rec in data.get("predictions") or []:
            metric = rec.get("metric")
            if metric in by_metric and rec.get("actual") in VALID_WINNERS:
                by_metric[metric]["total"] += 1
                if rec.get("correct"):
                    by_metric[metric]["correct"] += 1
                count += 1
    return {"count": count, "byMetric": by_metric}
