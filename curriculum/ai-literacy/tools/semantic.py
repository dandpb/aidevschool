from __future__ import annotations

from pathlib import Path

import yaml

from .activity_rules import _check_activity_evaluation_references
from .catalog_rules import (
    VALID_DURATIONS,
    VALID_JOURNEYS,
    VALID_STATUSES,
    _check_catalog_shape,
    _detect_prereq_cycles,
    _index_by_id,
)
from .schema import SchemaResolver, validate_against_schema

def _load_yaml(path, errors):
    try:
        return yaml.safe_load(path.read_text(encoding="utf-8"))
    except yaml.YAMLError as exc:
        errors.append("%s: YAML inválido: %s" % (path, exc))
        return None


class _TrackValidator:
    """Intentionally mutable accumulator for validation errors and content indexes."""

    def __init__(self, track_dir):
        self.track_dir = Path(track_dir)
        self.errors = []
        self.catalog = None
        self.skill_index = {}
        self.module_index = {}
        self.lesson_index = {}
        self.parsed_lessons = {}
        self.activity_ids = {}

    def load_catalog(self):
        catalog_path = self.track_dir / "catalog.yaml"
        if not catalog_path.is_file():
            self.errors.append("catalog.yaml não encontrado em %s" % self.track_dir)
            return False
        self.catalog = _check_catalog_shape(
            _load_yaml(catalog_path, self.errors), self.errors
        )
        if self.catalog is None:
            return False
        self.skill_index = _index_by_id(
            self.catalog.get("skills"), "skill", self.errors
        )
        self.module_index = _index_by_id(
            self.catalog.get("modules"), "módulo", self.errors
        )
        self.lesson_index = _index_by_id(
            self.catalog.get("lessons"), "lição", self.errors
        )
        return True

    def check_catalog(self):
        for module_id, module in self.module_index.items():
            if module.get("journey") not in VALID_JOURNEYS:
                self.errors.append(
                    "catalog.yaml: módulo %s com journey inválida: %r (válidas: %s)"
                    % (module_id, module.get("journey"), ", ".join(VALID_JOURNEYS))
                )
        for lesson_id, entry in self.lesson_index.items():
            for key in ("moduleId", "title", "objective", "estimatedMinutes", "prerequisites", "skillIds", "status"):
                if key not in entry:
                    self.errors.append(
                        "catalog.yaml: lição %s sem campo obrigatório: %s"
                        % (lesson_id, key)
                    )
            module_id = entry.get("moduleId")
            if module_id and module_id not in self.module_index:
                self.errors.append(
                    "catalog.yaml: lição %s referencia módulo inexistente: %s"
                    % (lesson_id, module_id)
                )
            self._check_catalog_refs(lesson_id, entry)
        _detect_prereq_cycles(self.lesson_index, self.errors)

    def _check_catalog_refs(self, lesson_id, entry):
        for skill_id in entry.get("skillIds") or []:
            if skill_id not in self.skill_index:
                self.errors.append(
                    "catalog.yaml: lição %s referencia skill inexistente: %s"
                    % (lesson_id, skill_id)
                )
        for prereq in entry.get("prerequisites") or []:
            if prereq not in self.lesson_index:
                self.errors.append(
                    "catalog.yaml: lição %s referencia pré-requisito inexistente: %s"
                    % (lesson_id, prereq)
                )
        self._check_catalog_values(lesson_id, entry)

    def _check_catalog_values(self, lesson_id, entry):
        if entry.get("estimatedMinutes") not in VALID_DURATIONS:
            self.errors.append(
                "catalog.yaml: lição %s com duração fora de {3,4,5}: %r"
                % (lesson_id, entry.get("estimatedMinutes"))
            )
        if entry.get("status") not in VALID_STATUSES:
            self.errors.append(
                "catalog.yaml: lição %s com status inválido: %r (válidos: %s)"
                % (lesson_id, entry.get("status"), ", ".join(VALID_STATUSES))
            )

    def load_lessons(self):
        modules_dir = self.track_dir / "modules"
        paths = sorted(modules_dir.glob("*/*.yaml")) if modules_dir.is_dir() else []
        resolver = SchemaResolver(self.track_dir / "schemas")
        for path in paths:
            self._load_lesson(path, resolver)

    def _load_lesson(self, path, resolver):
        rel = path.relative_to(self.track_dir)
        data = _load_yaml(path, self.errors)
        if data is None:
            return
        schema_errors = validate_against_schema(data, "lesson.schema.json", resolver)
        self.errors.extend("%s: %s" % (rel, error) for error in schema_errors)
        if schema_errors:
            return
        lesson_id = data["id"]
        if lesson_id in self.parsed_lessons:
            self.errors.append(
                "%s: id de lição duplicado: %s (também em %s)"
                % (rel, lesson_id, self.parsed_lessons[lesson_id][0])
            )
        self.parsed_lessons[lesson_id] = (rel, data)
        self._check_activities(data, rel)
        self._check_lesson_refs(data, rel)

    def _check_activities(self, data, rel):
        for activity in data.get("activities") or []:
            act_id = activity.get("id")
            if act_id in self.activity_ids:
                self.errors.append(
                    "%s: id de atividade duplicado: %s (também em %s)"
                    % (rel, act_id, self.activity_ids[act_id])
                )
            self.activity_ids[act_id] = rel
        _check_activity_evaluation_references(data, rel, self.errors)

    def _check_lesson_refs(self, data, rel):
        lesson_id = data["id"]
        for skill_id in data.get("skillIds") or []:
            if skill_id not in self.skill_index:
                self.errors.append(
                    "%s: lição %s referencia skill inexistente: %s"
                    % (rel, lesson_id, skill_id)
                )
        self._check_activity_skills(data, rel)
        if data.get("moduleId") not in self.module_index:
            self.errors.append(
                "%s: lição %s referencia módulo inexistente: %s"
                % (rel, lesson_id, data.get("moduleId"))
            )
        self._check_lesson_prereqs(data, rel)

    def _check_activity_skills(self, data, rel):
        for activity in data.get("activities") or []:
            skill_id = activity.get("skillId")
            if skill_id and skill_id not in self.skill_index:
                self.errors.append(
                    "%s: atividade %s referencia skill inexistente: %s"
                    % (rel, activity.get("id"), skill_id)
                )

    def _check_lesson_prereqs(self, data, rel):
        lesson_id = data["id"]
        for prereq in data.get("prerequisites") or []:
            if prereq not in self.lesson_index:
                self.errors.append(
                    "%s: lição %s referencia pré-requisito inexistente: %s"
                    % (rel, lesson_id, prereq)
                )
        self._check_required_activities(data, rel)

    def _check_required_activities(self, data, rel):
        lesson_id = data["id"]
        own_ids = {activity.get("id") for activity in data.get("activities") or []}
        for required in (data.get("completion") or {}).get("requiredActivityIds") or []:
            if required not in own_ids:
                self.errors.append(
                    "%s: lição %s exige atividade inexistente em completion.requiredActivityIds: %s"
                    % (rel, lesson_id, required)
                )

    def compare_catalog(self):
        file_ids = set(self.parsed_lessons)
        for lesson_id, entry in self.lesson_index.items():
            self._check_content_status(lesson_id, entry, file_ids)
            if lesson_id in file_ids:
                self._compare_lesson(lesson_id, entry)
        for lesson_id, (rel, _data) in self.parsed_lessons.items():
            if lesson_id not in self.lesson_index:
                self.errors.append(
                    "%s: lição %s não está listada no catalog.yaml" % (rel, lesson_id)
                )

    def _check_content_status(self, lesson_id, entry, file_ids):
        status = entry.get("status")
        if status == "ready" and lesson_id not in file_ids:
            self.errors.append(
                "catalog.yaml: lição %s marcada como ready mas sem arquivo em modules/"
                % lesson_id
            )
        if status == "planned" and lesson_id in file_ids:
            self.errors.append(
                "catalog.yaml: lição %s tem arquivo mas está marcada como planned — promova para ready"
                % lesson_id
            )

    def _compare_lesson(self, lesson_id, entry):
        rel, data = self.parsed_lessons[lesson_id]
        for field in ("moduleId", "title", "estimatedMinutes", "prerequisites", "skillIds"):
            if entry.get(field) != data.get(field):
                self.errors.append(
                    "catalog.yaml: lição %s diverge do arquivo %s no campo %s (%r != %r)"
                    % (lesson_id, rel, field, entry.get(field), data.get(field))
                )

    def ready_lessons(self):
        return [
            data
            for lesson_id, (_rel, data) in sorted(self.parsed_lessons.items())
            if self.lesson_index.get(lesson_id, {}).get("status") == "ready"
        ]


def validate_track(track_dir):
    """Valida a trilha inteira e retorna erros, lições prontas e catálogo."""
    validator = _TrackValidator(track_dir)
    if not validator.load_catalog():
        return validator.errors, [], None
    validator.check_catalog()
    validator.load_lessons()
    validator.compare_catalog()
    return validator.errors, validator.ready_lessons(), validator.catalog
