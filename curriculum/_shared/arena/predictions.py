"""Append-only writer for the arena prediction log (``learner/predictions.yaml``).

Each arena run records the learner's per-metric prediction and the measured
outcome (see ADR-004). Appends are genuinely append-only — a single flow-style
list item is written, so existing records are never rewritten — which keeps the
log a clean audit trail and avoids reformatting churn.
"""

from __future__ import annotations

from pathlib import Path

import yaml

# curriculum/_shared/arena/predictions.py -> parents[3] is the repo root.
PREDICTIONS_PATH = Path(__file__).resolve().parents[3] / "learner" / "predictions.yaml"

_VALID_METRICS = ("latency", "memory", "throughput")
_VALID_WINNERS = ("go", "rust", "node")


def append_prediction(record: dict, path: Path | None = None) -> Path:
    """Append one prediction record under the ``predictions:`` key.

    Required keys: project, run, metric (latency|memory|throughput), predicted,
    actual, correct. Optional: reason. The ``run`` timestamp is caller-supplied
    (no clock is read here), per the repo determinism rules.
    """
    path = Path(path) if path else PREDICTIONS_PATH
    if record.get("metric") not in _VALID_METRICS:
        raise ValueError(f"metric must be one of {_VALID_METRICS}, got {record.get('metric')!r}")
    if record.get("actual") not in _VALID_WINNERS:
        raise ValueError(f"actual must be one of {_VALID_WINNERS}, got {record.get('actual')!r}")

    if not path.exists() or not path.read_text(encoding="utf-8").strip():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text("predictions:\n", encoding="utf-8")

    item = yaml.safe_dump(record, default_flow_style=True, sort_keys=False).strip()
    with path.open("a", encoding="utf-8") as f:
        f.write(f"  - {item}\n")
    return path
