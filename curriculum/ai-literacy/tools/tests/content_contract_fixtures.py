from __future__ import annotations

import shutil
import unittest
from pathlib import Path
from typing import TypeAlias

import yaml

from .. import validate

JsonScalar: TypeAlias = str | int | float | bool | None
JsonObject: TypeAlias = dict[str, "JsonValue"]
JsonArray: TypeAlias = list["JsonValue"]
JsonValue: TypeAlias = JsonScalar | JsonObject | JsonArray
LessonFiles: TypeAlias = dict[str, JsonObject | None]

TOOLS_DIR = Path(__file__).resolve().parent.parent
TRACK_DIR = TOOLS_DIR.parent
FIVE_SKILLS = ["entender", "pedir", "avaliar", "proteger", "aplicar"]


def json_value(value) -> JsonValue:
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, list):
        return [json_value(item) for item in value]
    if isinstance(value, dict):
        return {json_string(key): json_value(item) for key, item in value.items()}
    raise AssertionError("fixture value must be JSON-compatible")


def json_string(value: JsonValue) -> str:
    assert isinstance(value, str)
    return value


def json_object(value: JsonValue) -> JsonObject:
    assert isinstance(value, dict)
    return value


def json_array(value: JsonValue) -> JsonArray:
    assert isinstance(value, list)
    return value


def json_strings(value) -> list[str]:
    return [json_string(item) for item in json_array(json_value(value))]


def json_objects(value) -> list[JsonObject]:
    return [json_object(item) for item in json_array(json_value(value))]


def required_object(value: JsonObject | None) -> JsonObject:
    assert value is not None
    return value


def object_field(value: JsonObject, key: str) -> JsonObject:
    assert key in value
    return json_object(value[key])


def array_field(value: JsonObject, key: str) -> JsonArray:
    assert key in value
    return json_array(value[key])


def string_field(value: JsonObject, key: str) -> str:
    assert key in value
    return json_string(value[key])


def int_field(value: JsonObject, key: str) -> int:
    assert key in value
    checked = value[key]
    assert isinstance(checked, int) and not isinstance(checked, bool)
    return checked


def _base_catalog() -> JsonObject:
    return json_object(
        json_value({
            "schemaVersion": 1,
            "contentVersion": "test-1",
            "track": {"id": "ai-literacy", "title": "Trilha de teste", "language": "pt-BR"},
            "skills": [{"id": skill, "title": skill, "description": skill} for skill in FIVE_SKILLS],
            "modules": [{"id": "mod-01", "slug": "01-ai-sem-misterio", "title": "M1", "order": 1, "skillIds": ["entender"]}],
            "lessons": [
                {"id": "l01", "moduleId": "mod-01", "title": "Lição base", "objective": "Objetivo observável da lição base.", "estimatedMinutes": 3, "prerequisites": [], "skillIds": ["entender"], "status": "ready"},
                {"id": "l02", "moduleId": "mod-01", "title": "Lição planejada", "objective": "Objetivo da lição planejada.", "estimatedMinutes": 4, "prerequisites": ["l01"], "skillIds": ["entender"], "status": "planned"},
            ],
        })
    )


def _base_lesson() -> JsonObject:
    return json_object(
        json_value({
            "id": "l01", "version": 1, "moduleId": "mod-01", "title": "Lição base", "objective": "Objetivo observável da lição base.", "estimatedMinutes": 3, "skillIds": ["entender"], "prerequisites": [],
            "activities": [{"id": "l01-a1", "type": "choice", "skillId": "entender", "instruction": "Escolha a melhor opção.", "data": {"options": [{"id": "opt-a", "text": "Opção A."}, {"id": "opt-b", "text": "Opção B."}]}, "evaluation": {"strategy": "deterministic", "correctOptionIds": ["opt-a"]}, "feedback": {"onFailure": "Ainda falta revisar o conceito central."}, "storage": {"policy": "structured_only"}}],
            "rubric": {"id": "l01-rubric", "criteria": [{"id": "r-base", "text": "Critério observável.", "weight": 1}]},
            "evidence": {"verifierRequired": True, "completionClaim": "lesson_completed", "includesFreeText": False},
            "review": {"intervalsDays": [1, 7, 21]}, "completion": {"minimumScore": 0.75, "requiredActivityIds": ["l01-a1"]},
        })
    )


def _write_tree(root: str | Path, catalog: JsonObject, lessons: LessonFiles) -> None:
    root_path = Path(root)
    shutil.copytree(TRACK_DIR / "schemas", root_path / "schemas")
    (root_path / "catalog.yaml").write_text(yaml.safe_dump(catalog, allow_unicode=True), encoding="utf-8")
    for lesson_id, lesson in lessons.items():
        if lesson is None:
            continue
        module_dir = root_path / "modules" / "01-ai-sem-misterio"
        module_dir.mkdir(parents=True, exist_ok=True)
        (module_dir / ("%s-licao.yaml" % lesson_id)).write_text(yaml.safe_dump(lesson, allow_unicode=True), encoding="utf-8")


class TrackFixtureMixin(unittest.TestCase):
    def make_track(self, tmp: str, catalog: JsonObject | None = None, lessons: LessonFiles | None = None) -> Path:
        selected_catalog = catalog if catalog is not None else _base_catalog()
        selected_lessons: LessonFiles = lessons if lessons is not None else {"l01": _base_lesson()}
        _write_tree(tmp, selected_catalog, selected_lessons)
        return Path(tmp)

    def validate_track(self, track: Path) -> tuple[list[str], list[JsonObject], JsonObject | None]:
        errors, ready, catalog = validate.validate_track(track)
        normalized_catalog = None if catalog is None else json_object(json_value(catalog))
        return json_strings(errors), json_objects(ready), normalized_catalog

    def compile_track(self, track: Path, output: str | Path) -> tuple[list[str], Path | None]:
        errors, output_path = validate.compile_track(track, output)
        assert output_path is None or isinstance(output_path, Path)
        return json_strings(errors), output_path

    def assert_error_containing(self, errors: list[str], fragment: str) -> None:
        joined = "\n".join(errors)
        self.assertIn(fragment, joined, "esperava erro contendo %r; erros:\n%s" % (fragment, joined))
