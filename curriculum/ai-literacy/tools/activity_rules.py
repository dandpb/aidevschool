from __future__ import annotations

from collections.abc import Callable
from typing import TypeAlias

JsonScalar: TypeAlias = str | int | float | bool | None
JsonObject: TypeAlias = dict[str, "JsonValue"]
JsonArray: TypeAlias = list["JsonValue"]
JsonValue: TypeAlias = JsonScalar | JsonObject | JsonArray
ActivityCheck: TypeAlias = Callable[[JsonObject, JsonObject, str], list[str]]


def _ids_of(data, key):
    return {entry.get("id") for entry in data.get(key) or [] if isinstance(entry, dict)}


def _check_choice(data, evaluation, prefix):
    errors = []
    known = _ids_of(data, "options")
    for ref in evaluation.get("correctOptionIds") or []:
        if ref not in known:
            errors.append(
                "%s referencia opção inexistente em correctOptionIds: %s"
                % (prefix, ref)
            )
    return errors


def _check_sort(data, evaluation, prefix):
    if set(evaluation.get("expectedOrder") or []) != _ids_of(data, "items"):
        return [
            "%s: expectedOrder deve ser uma permutação dos ids de data.items" % prefix
        ]
    return []


def _check_missing_context(data, evaluation, prefix):
    errors = []
    known = _ids_of(data, "contextOptions")
    for key in ("requiredContextIds", "optionalContextIds"):
        for ref in evaluation.get(key) or []:
            if ref not in known:
                errors.append(
                    "%s referencia contexto inexistente em %s: %s" % (prefix, key, ref)
                )
    return errors


def _check_classification(data, evaluation, prefix):
    if set((evaluation.get("classification") or {}).keys()) != _ids_of(data, "items"):
        return [
            "%s: classification deve classificar exatamente os ids de data.items"
            % prefix
        ]
    return []


def _check_prompt_builder(data, evaluation, prefix):
    known = _ids_of(data, "fields")
    return [
        "%s avalia campo inexistente em data.fields: %s" % (prefix, ref)
        for ref in (evaluation.get("fields") or {})
        if ref not in known
    ]


def _check_output_comparison(data, evaluation, prefix):
    errors = []
    if evaluation.get("betterOutputId") not in _ids_of(data, "outputs"):
        errors.append(
            "%s: betterOutputId inexistente: %s"
            % (prefix, evaluation.get("betterOutputId"))
        )
    known = _ids_of(data, "criteria")
    for ref in evaluation.get("requiredCriterionIds") or []:
        if ref not in known:
            errors.append("%s referencia critério inexistente: %s" % (prefix, ref))
    return errors


def _check_rubric_review(data, evaluation, prefix):
    known = _ids_of(data, "criteria")
    return [
        "%s avalia critério inexistente em data.criteria: %s" % (prefix, ref)
        for ref in (evaluation.get("expectedVerdicts") or {})
        if ref not in known
    ]


ACTIVITY_CHECKS: dict[str, ActivityCheck] = {
    "choice": _check_choice,
    "sort": _check_sort,
    "missing_context": _check_missing_context,
    "safety_classification": _check_classification,
    "prompt_builder": _check_prompt_builder,
    "output_comparison": _check_output_comparison,
    "rubric_review": _check_rubric_review,
}


def _check_activity_evaluation_references(lesson, lesson_file, errors):
    lesson_prefix = "%s (%s)" % (lesson_file, lesson.get("id", "?"))
    for activity in lesson.get("activities") or []:
        data = activity.get("data") or {}
        evaluation = activity.get("evaluation") or {}
        if not isinstance(data, dict) or not isinstance(evaluation, dict):
            continue
        checker = ACTIVITY_CHECKS.get(activity.get("type", "?"))
        if checker:
            prefix = "%s: atividade %s" % (lesson_prefix, activity.get("id", "?"))
            errors.extend(checker(data, evaluation, prefix))
