from __future__ import annotations

from pathlib import Path
from typing import Mapping

from learner.substrate.prediction_store import record_prediction


def append_prediction(record: Mapping[str, str | bool], path: Path | None = None) -> Path:
    return record_prediction(record, path)
