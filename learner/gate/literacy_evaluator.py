from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Any

import yaml

from .evaluator_primitives import round2 as _round2

ACTIVITY_PASS_THRESHOLD = 0.75


class LiteracyEvaluationError(ValueError):
    pass


@lru_cache(maxsize=4)
def _lesson_corpus(root: Path) -> dict[str, tuple[dict[str, Any], ...]]:
    """Parse the lesson corpus once per root: a verification round trip resolves
    one lesson id and the process may verify several submissions."""
    corpus: dict[str, list[dict[str, Any]]] = {}
    for path in (root / "curriculum" / "ai-literacy" / "modules").glob("*/*.yaml"):
        raw = yaml.safe_load(path.read_text(encoding="utf-8"))
        if isinstance(raw, dict) and isinstance(raw.get("id"), str):
            corpus.setdefault(raw["id"], []).append(raw)
    return {lesson_id: tuple(entries) for lesson_id, entries in corpus.items()}


def _canonical_lesson(root: Path, lesson_id: str) -> dict[str, Any]:
    matches = _lesson_corpus(root).get(lesson_id, ())
    if len(matches) != 1:
        raise LiteracyEvaluationError(
            f"unknown or ambiguous canonical lesson {lesson_id!r}"
        )
    return matches[0]


def _answer_object(answer: Any, required: str, optional: str | None = None) -> dict[str, Any]:
    if not isinstance(answer, dict) or required not in answer:
        raise LiteracyEvaluationError(f"answer must contain {required!r}")
    allowed = {required}
    if optional is not None:
        allowed.add(optional)
    if set(answer) != allowed and not (
        optional is not None and set(answer) == {required}
    ):
        raise LiteracyEvaluationError(
            "answer shape does not match canonical activity type"
        )
    return answer


def _evaluate(activity: dict[str, Any], answer: Any) -> dict[str, Any]:
    activity_type = activity["type"]
    data = activity["data"]
    evaluation = activity["evaluation"]
    checks: list[tuple[str, bool, bool | int]] = []

    if activity_type == "prompt_builder":
        raise LiteracyEvaluationError(
            "prompt_builder cannot be independently re-evaluated without free text"
        )
    if activity_type == "choice":
        selected = set(_answer_object(answer, "optionIds")["optionIds"])
        correct = set(evaluation["correctOptionIds"])
        checks = [
            (
                option["id"],
                (option["id"] in selected) == (option["id"] in correct),
                False,
            )
            for option in data["options"]
        ]
        checks = [(key, passed, passed) for key, passed, _ in checks]
    elif activity_type == "sort":
        ordered = _answer_object(answer, "orderedIds")["orderedIds"]
        checks = [
            (item_id, index < len(ordered) and ordered[index] == item_id, False)
            for index, item_id in enumerate(evaluation["expectedOrder"])
        ]
        checks = [(key, passed, passed) for key, passed, _ in checks]
    elif activity_type == "missing_context":
        selected = set(_answer_object(answer, "contextIds")["contextIds"])
        required = set(evaluation["requiredContextIds"])
        extra_count = len(selected - required)
        checks = [
            (item_id, item_id in selected, item_id in selected)
            for item_id in evaluation["requiredContextIds"]
        ]
        checks.append(("noExtraContext", extra_count == 0, extra_count))
    elif activity_type == "output_comparison":
        structured = _answer_object(answer, "criterionIds", "outputId")
        selected = set(structured["criterionIds"])
        required = set(evaluation["requiredCriterionIds"])
        extra_count = len(selected - required)
        chosen_better = structured.get("outputId") == evaluation["betterOutputId"]
        checks = [("betterOutputId", chosen_better, chosen_better)]
        checks.extend(
            (item_id, item_id in selected, item_id in selected)
            for item_id in evaluation["requiredCriterionIds"]
        )
        checks.append(("noExtraCriteria", extra_count == 0, extra_count))
        earned = sum(
            (2 if key == "betterOutputId" else 1)
            for key, passed, _ in checks
            if passed
        )
        total = sum(2 if key == "betterOutputId" else 1 for key, _, _ in checks)
        score = earned / total if total else 0
        passed = chosen_better and required.issubset(selected) and extra_count == 0
        return {
            "deterministicChecks": {key: value for key, _, value in checks},
            "score": _round2(score),
            "pass": passed,
        }
    elif activity_type == "safety_classification":
        labels = _answer_object(answer, "labels")["labels"]
        checks = [
            (
                item["id"],
                labels.get(item["id"]) == evaluation["classification"].get(item["id"]),
                labels.get(item["id"]) == evaluation["classification"].get(item["id"]),
            )
            for item in data["items"]
        ]
    elif activity_type == "rubric_review":
        verdicts = _answer_object(answer, "verdicts")["verdicts"]
        checks = [
            (
                item["id"],
                verdicts.get(item["id"])
                == evaluation["expectedVerdicts"].get(item["id"]),
                verdicts.get(item["id"])
                == evaluation["expectedVerdicts"].get(item["id"]),
            )
            for item in data["criteria"]
        ]
    else:
        raise LiteracyEvaluationError(
            f"activityType {activity_type!r} is not independently re-judgeable; fail closed"
        )

    score = sum(1 for _, passed, _ in checks if passed) / len(checks) if checks else 0
    return {
        "deterministicChecks": {key: value for key, _, value in checks},
        "score": _round2(score),
        "pass": score >= ACTIVITY_PASS_THRESHOLD,
    }


def recompute_literacy_evidence(
    evidence: dict[str, Any], root: Path
) -> tuple[dict[str, Any] | None, list[str]]:
    errors: list[str] = []
    try:
        lesson = _canonical_lesson(root, evidence["lessonId"])
        if evidence["lessonVersion"] != lesson["version"]:
            raise LiteracyEvaluationError(
                "lessonVersion does not match canonical lesson"
            )
        if evidence["skillIds"] != lesson["skillIds"]:
            raise LiteracyEvaluationError("skillIds do not match canonical lesson")
        activities = [
            activity
            for activity in lesson["activities"]
            if activity.get("id") == evidence["activityId"]
        ]
        if len(activities) != 1:
            raise LiteracyEvaluationError(
                "activityId does not resolve in canonical lesson"
            )
        activity = activities[0]
        if evidence["activityType"] != activity["type"]:
            raise LiteracyEvaluationError(
                "activityType does not match canonical activity"
            )
        recomputed = _evaluate(activity, evidence.get("answer"))
    except (
        KeyError,
        LiteracyEvaluationError,
        OSError,
        TypeError,
        yaml.YAMLError,
    ) as exc:
        return None, [str(exc)]

    for field in ("deterministicChecks", "score", "pass"):
        if evidence[field] != recomputed[field]:
            errors.append(f"producer {field} does not match independent recomputation")
    return recomputed, errors
