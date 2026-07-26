from __future__ import annotations

from datetime import datetime
from typing import Any

from learner.gate.evidence_schema import LITERACY_EVIDENCE_SCHEMA
from learner.gate.timestamps import parse_aware_timestamp

_LITERACY_PROPERTIES = LITERACY_EVIDENCE_SCHEMA["properties"]
LITERACY_EVIDENCE_SCHEMA_VERSION = _LITERACY_PROPERTIES["schemaVersion"]["const"]
LITERACY_EVIDENCE_SOURCE = _LITERACY_PROPERTIES["source"]["const"]
LITERACY_REQUIRED_KEYS = tuple(LITERACY_EVIDENCE_SCHEMA["required"])
LITERACY_ALLOWED_KEYS = frozenset(_LITERACY_PROPERTIES)

TEACHING_EVIDENCE_REQUIRED_FIELDS = ("unit_id", "project", "game", "ts", "pass")


def validate_teaching_evidence_structure(evidence: dict[str, Any]) -> list[str]:
    errors = [
        f"evidence missing required field {field_name!r}"
        for field_name in TEACHING_EVIDENCE_REQUIRED_FIELDS
        if field_name not in evidence
    ]
    if errors:
        return errors

    if not isinstance(evidence["pass"], bool):
        errors.append("evidence field 'pass' must be a boolean")

    metrics = evidence.get("metrics")
    if metrics is not None and not isinstance(metrics, dict):
        errors.append("evidence.metrics must be an object")
    elif isinstance(metrics, dict) and "kind" in metrics and not metrics.get("kind"):
        errors.append("evidence.metrics.kind must be a non-empty discriminator when set")

    try:
        parse_aware_timestamp(str(evidence["ts"]))
    except ValueError:
        errors.append(
            f"evidence ts {evidence['ts']!r} is not a valid timezone-aware ISO-8601 timestamp"
        )

    if "verifier" in evidence:
        errors.append(
            "embedded verifier is producer-controlled and cannot authorize mastery; "
            "provide a separate verifier receipt"
        )

    return errors


def validate_literacy_evidence_structure(evidence: dict[str, Any]) -> list[str]:
    errors = [
        f"unknown field {key!r}" for key in evidence if key not in LITERACY_ALLOWED_KEYS
    ]
    errors.extend(
        f"missing required field {key!r}"
        for key in LITERACY_REQUIRED_KEYS
        if key not in evidence
    )
    if errors:
        return errors

    if evidence["schemaVersion"] != LITERACY_EVIDENCE_SCHEMA_VERSION:
        errors.append(
            "schemaVersion must be "
            f"{LITERACY_EVIDENCE_SCHEMA_VERSION}, got {evidence['schemaVersion']!r}"
        )
    if evidence["source"] != LITERACY_EVIDENCE_SOURCE:
        errors.append(
            f"source must be {LITERACY_EVIDENCE_SOURCE!r}, got {evidence['source']!r}"
        )
    if evidence["verifierRequired"] is not _LITERACY_PROPERTIES["verifierRequired"]["const"]:
        errors.append("verifierRequired must be literal true")

    for string_field in ("attemptId", "lessonId", "activityId", "activityType"):
        value = evidence[string_field]
        field_schema = _LITERACY_PROPERTIES[string_field]
        if (
            not isinstance(value, str)
            or len(value) < field_schema["minLength"]
            or len(value) > field_schema["maxLength"]
            or not value.strip()
        ):
            errors.append(f"{string_field} must be a bounded non-empty string")

    if not isinstance(evidence["lessonVersion"], int) or isinstance(
        evidence["lessonVersion"], bool
    ):
        errors.append("lessonVersion must be an integer")
    elif evidence["lessonVersion"] < _LITERACY_PROPERTIES["lessonVersion"]["minimum"]:
        errors.append(
            "lessonVersion must be >= "
            f"{_LITERACY_PROPERTIES['lessonVersion']['minimum']}"
        )

    skill_ids = evidence["skillIds"]
    skill_schema = _LITERACY_PROPERTIES["skillIds"]["items"]
    if (
        not isinstance(skill_ids, list)
        or len(skill_ids) > _LITERACY_PROPERTIES["skillIds"]["maxItems"]
        or not all(
            isinstance(item, str)
            and skill_schema["minLength"] <= len(item) <= skill_schema["maxLength"]
            for item in skill_ids
        )
    ):
        errors.append("skillIds must be a bounded list of non-empty strings")

    checks = evidence["deterministicChecks"]
    if not isinstance(checks, dict):
        errors.append("deterministicChecks must be an object")
    else:
        if len(checks) > _LITERACY_PROPERTIES["deterministicChecks"]["maxProperties"]:
            errors.append("deterministicChecks has too many entries")
        for check_key, check_value in checks.items():
            if (
                not isinstance(check_key, str)
                or not 1 <= len(check_key) <= 120
            ):
                errors.append(
                    "deterministicChecks keys must be bounded non-empty strings"
                )
            if not isinstance(check_value, (bool, int, float, str)) or (
                isinstance(check_value, float)
                and (
                    check_value != check_value
                    or check_value in (float("inf"), float("-inf"))
                )
            ):
                errors.append(
                    f"deterministicChecks[{check_key!r}] must be bool|number|string"
                )
            max_length = _LITERACY_PROPERTIES["deterministicChecks"][
                "additionalProperties"
            ]["oneOf"][2]["maxLength"]
            if isinstance(check_value, str) and len(check_value) > max_length:
                errors.append(
                    f"deterministicChecks[{check_key!r}] string too long "
                    "(free text not allowed in evidence)"
                )

    answer = evidence.get("answer")
    if answer is not None:
        answer_errors = _validate_structured_answer(answer)
        errors.extend(f"answer {error}" for error in answer_errors)

    score = evidence["score"]
    if (
        not isinstance(score, (int, float))
        or isinstance(score, bool)
        or not (
            _LITERACY_PROPERTIES["score"]["minimum"]
            <= float(score)
            <= _LITERACY_PROPERTIES["score"]["maximum"]
        )
    ):
        errors.append("score must be a number in [0, 1]")

    if not isinstance(evidence["pass"], bool):
        errors.append("pass must be a boolean")

    timestamp = evidence["timestamp"]
    if not isinstance(timestamp, str) or len(timestamp) > _LITERACY_PROPERTIES[
        "timestamp"
    ]["maxLength"]:
        errors.append("timestamp must be a bounded ISO-8601 string")
    try:
        parse_aware_timestamp(str(timestamp))
    except (TypeError, ValueError):
        if not isinstance(timestamp, str) or not timestamp.strip():
            errors.append("timestamp must be a non-empty ISO-8601 string")
        else:
            try:
                datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
            except ValueError:
                errors.append(
                    f"timestamp {timestamp!r} is not a valid ISO-8601 string"
                )

    context = evidence.get("context")
    if (
        context is not None
        and context not in _LITERACY_PROPERTIES["context"]["enum"]
    ):
        errors.append("context must be 'initial', 'review', or omitted")

    return errors


def _validate_structured_answer(answer: Any) -> list[str]:
    if not isinstance(answer, dict):
        return ["must be an object"]
    variants = {
        "optionIds": "ids",
        "orderedIds": "ids",
        "contextIds": "ids",
        "criterionIds": "output",
        "labels": "labels",
        "verdicts": "verdicts",
    }
    present = [key for key in variants if key in answer]
    if len(present) != 1:
        return ["must have exactly one structured answer discriminator"]
    discriminator = present[0]
    allowed = {discriminator, "outputId"} if discriminator == "criterionIds" else {discriminator}
    if set(answer) - allowed:
        return ["contains unknown fields"]

    def valid_id(value: Any) -> bool:
        return isinstance(value, str) and 1 <= len(value) <= 120

    kind = variants[discriminator]
    value = answer[discriminator]
    if kind in {"ids", "output"}:
        if not isinstance(value, list) or len(value) > 50 or not all(
            valid_id(item) for item in value
        ):
            return [f"{discriminator} must be a bounded list of IDs"]
        output_id = answer.get("outputId")
        if output_id is not None and not valid_id(output_id):
            return ["outputId must be a bounded non-empty string"]
        return []
    if not isinstance(value, dict) or len(value) > 50 or not all(
        valid_id(key) for key in value
    ):
        return [f"{discriminator} must be a bounded object keyed by IDs"]
    allowed_values = (
        {"safe", "sensitive"} if kind == "labels" else {"met", "partial", "not_met"}
    )
    if not all(item in allowed_values for item in value.values()):
        return [f"{discriminator} contains an invalid value"]
    return []
