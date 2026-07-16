from __future__ import annotations

from collections.abc import Mapping
from pathlib import Path
from typing import Final, TypeAlias, TypeGuard

import yaml

from learner.substrate.fsio import atomic_write_text


ROOT: Final = Path(__file__).resolve().parent.parent.parent
PREDICTIONS_PATH: Final = ROOT / "learner" / "predictions.yaml"
_VALID_METRICS: Final = frozenset({"latency", "memory", "throughput"})
_VALID_WINNERS: Final = frozenset({"go", "rust", "node"})
YamlValue: TypeAlias = (
    str | int | float | bool | None | list["YamlValue"] | dict[str, "YamlValue"]
)


class PredictionRecordError(ValueError):
    def __init__(self, field: str, value: str | bool | None) -> None:
        self.field = field
        self.value = value
        super().__init__(f"invalid prediction {field}: {value!r}")


def _is_record_mapping(value: YamlValue) -> TypeGuard[Mapping[str, str | bool]]:
    return isinstance(value, Mapping) and all(
        isinstance(key, str) and isinstance(item, (str, bool))
        for key, item in value.items()
    )


def _normalized_record(
    record: Mapping[str, str | bool],
    field_prefix: str = "",
    verify_correct: bool = False,
) -> dict[str, str | bool]:
    def field_name(field: str) -> str:
        return f"{field_prefix}.{field}" if field_prefix else field

    project = record.get("project")
    run = record.get("run")
    metric = record.get("metric")
    predicted = record.get("predicted")
    actual = record.get("actual")
    if not isinstance(project, str) or not project.strip():
        raise PredictionRecordError(field_name("project"), project)
    if not isinstance(run, str) or not run.strip():
        raise PredictionRecordError(field_name("run"), run)
    if metric not in _VALID_METRICS:
        raise PredictionRecordError(field_name("metric"), metric)
    if predicted not in _VALID_WINNERS:
        raise PredictionRecordError(field_name("predicted"), predicted)
    if actual not in _VALID_WINNERS:
        raise PredictionRecordError(field_name("actual"), actual)

    correct = predicted == actual
    if verify_correct and record.get("correct") is not correct:
        raise PredictionRecordError(field_name("correct"), record.get("correct"))

    normalized = dict(record)
    normalized.update(
        {
            "project": project.strip(),
            "run": run.strip(),
            "metric": metric,
            "predicted": predicted,
            "actual": actual,
            "correct": correct,
        }
    )
    return normalized


def _load_existing_predictions(target: Path) -> list[dict[str, str | bool]]:
    if not target.exists():
        return []

    try:
        loaded: YamlValue = yaml.safe_load(target.read_text(encoding="utf-8"))
    except yaml.YAMLError as error:
        raise PredictionRecordError("yaml", str(error)) from error
    if not isinstance(loaded, Mapping):
        raise PredictionRecordError("root", type(loaded).__name__)

    raw_predictions = loaded.get("predictions")
    if not isinstance(raw_predictions, list):
        raise PredictionRecordError("predictions", type(raw_predictions).__name__)

    predictions: list[dict[str, str | bool]] = []
    for index, item in enumerate(raw_predictions):
        if not _is_record_mapping(item):
            raise PredictionRecordError(f"predictions[{index}]", type(item).__name__)
        predictions.append(
            _normalized_record(item, f"predictions[{index}]", verify_correct=True)
        )
    return predictions


def record_prediction(
    record: Mapping[str, str | bool],
    path: Path | None = None,
) -> Path:
    target = path or PREDICTIONS_PATH
    predictions = _load_existing_predictions(target)
    predictions.append(_normalized_record(record))
    content = yaml.safe_dump(
        {"predictions": predictions},
        sort_keys=False,
        allow_unicode=True,
        width=100,
    )
    atomic_write_text(target, content)
    return target
