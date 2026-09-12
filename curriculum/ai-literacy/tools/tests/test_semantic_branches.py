from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

import yaml

from .. import activity_rules, catalog_rules, semantic
from .content_contract_fixtures import _base_catalog, _base_lesson, array_field, json_value


def _journey_variant(lesson_id, module_id, title, prereqs):
    data = json_value(_base_lesson())
    data["id"] = lesson_id
    data["moduleId"] = module_id
    data["title"] = title
    data["prerequisites"] = prereqs
    data["activities"][0]["id"] = "%s-a1" % lesson_id
    data["rubric"]["id"] = "%s-rubric" % lesson_id
    data["completion"]["requiredActivityIds"] = ["%s-a1" % lesson_id]
    return data


def _catalog_with_dev_module():
    catalog = _base_catalog()
    array_field(catalog, "modules").append(
        {"id": "mod-99", "slug": "99-dev", "title": "Dev", "order": 2, "journey": "dev", "skillIds": ["entender"]}
    )
    return catalog


class TestSemanticBranches(unittest.TestCase):
    def test_yaml_catalog_and_index_failures(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "catalog.yaml").write_text("[unterminated", encoding="utf-8")
            errors, ready, catalog = semantic.validate_track(root)
            self.assertEqual([], ready)
            self.assertIsNone(catalog)
            self.assertIn("YAML inválido", errors[0])
            self.assertEqual("catalog.yaml: catálogo deve ser um objeto YAML", errors[1])
        errors = []
        self.assertIsNone(catalog_rules._check_catalog_shape({}, errors))
        self.assertEqual(6, len(errors))
        errors = []
        index = catalog_rules._index_by_id([{}, "bad", {"id": "same"}, {"id": "same"}], "item", errors)
        self.assertEqual({"same": {"id": "same"}}, index)
        self.assertEqual(
            [
                "catalog.yaml: item sem id",
                "catalog.yaml: item sem id",
                "catalog.yaml: id de item duplicado: same",
            ],
            errors,
        )

    def test_activity_error_order_covers_all_reference_diagnostics(self):
        lesson = {
            "id": "l01",
            "activities": [
                {"id": "skip", "type": "choice", "data": [1], "evaluation": {"correctOptionIds": []}},
                {"id": "unknown", "type": "unknown", "data": {}, "evaluation": {}},
                {"id": "choice", "type": "choice", "data": {"options": [{"id": "ok"}, "bad"]}, "evaluation": {"correctOptionIds": ["missing"]}},
                {"id": "sort", "type": "sort", "data": {"items": [{"id": "a"}]}, "evaluation": {"expectedOrder": ["b"]}},
                {"id": "context", "type": "missing_context", "data": {"contextOptions": [{"id": "a"}]}, "evaluation": {"requiredContextIds": ["b"], "optionalContextIds": ["c"]}},
                {"id": "classify", "type": "safety_classification", "data": {"items": [{"id": "a"}]}, "evaluation": {"classification": {"b": "safe"}}},
                {"id": "prompt", "type": "prompt_builder", "data": {"fields": [{"id": "a"}]}, "evaluation": {"fields": {"b": {}}}},
                {"id": "output", "type": "output_comparison", "data": {"outputs": [{"id": "a"}], "criteria": [{"id": "c"}]}, "evaluation": {"betterOutputId": "b", "requiredCriterionIds": ["d"]}},
                {"id": "rubric", "type": "rubric_review", "data": {"criteria": [{"id": "a"}]}, "evaluation": {"expectedVerdicts": {"b": "met"}}},
            ],
        }
        errors = []
        activity_rules._check_activity_evaluation_references(lesson, Path("lesson.yaml"), errors)
        self.assertEqual(
            [
                "lesson.yaml (l01): atividade choice referencia opção inexistente em correctOptionIds: missing",
                "lesson.yaml (l01): atividade sort: expectedOrder deve ser uma permutação dos ids de data.items",
                "lesson.yaml (l01): atividade context referencia contexto inexistente em requiredContextIds: b",
                "lesson.yaml (l01): atividade context referencia contexto inexistente em optionalContextIds: c",
                "lesson.yaml (l01): atividade classify: classification deve classificar exatamente os ids de data.items",
                "lesson.yaml (l01): atividade prompt avalia campo inexistente em data.fields: b",
                "lesson.yaml (l01): atividade output: betterOutputId inexistente: b",
                "lesson.yaml (l01): atividade output referencia critério inexistente: d",
                "lesson.yaml (l01): atividade rubric avalia critério inexistente em data.criteria: b",
            ],
            errors,
        )

    def test_catalog_and_lesson_error_order(self):
        validator = semantic._TrackValidator("track")
        validator.skill_index = {"known": {}}
        validator.module_index = {"known": {"journey": "ia_pratica"}}
        validator.lesson_index = {"known": {}}
        entry = {"skillIds": ["missing"], "prerequisites": ["missing"], "estimatedMinutes": 9, "status": "bad"}
        validator._check_catalog_refs("lesson", entry)
        lesson = {
            "id": "lesson",
            "moduleId": "missing",
            "skillIds": ["missing"],
            "prerequisites": ["missing"],
            "activities": [{"id": "a", "skillId": "missing"}],
            "completion": {"requiredActivityIds": ["missing"]},
        }
        validator._check_lesson_refs(lesson, Path("lesson.yaml"))
        self.assertEqual(
            [
                "catalog.yaml: lição lesson referencia skill inexistente: missing",
                "catalog.yaml: lição lesson referencia pré-requisito inexistente: missing",
                "catalog.yaml: lição lesson com duração fora de {3,4,5}: 9",
                "catalog.yaml: lição lesson com status inválido: 'bad' (válidos: planned, ready)",
                "lesson.yaml: lição lesson referencia skill inexistente: missing",
                "lesson.yaml: atividade a referencia skill inexistente: missing",
                "lesson.yaml: lição lesson referencia módulo inexistente: missing",
                "lesson.yaml: lição lesson referencia pré-requisito inexistente: missing",
                "lesson.yaml: lição lesson exige atividade inexistente em completion.requiredActivityIds: missing",
            ],
            validator.errors,
        )
        validator.errors = []
        validator.lesson_index = {"lesson": {}}
        validator.check_catalog()
        self.assertEqual(9, len(validator.errors))

    def test_catalog_comparison_and_cycle_edges(self):
        errors = []
        catalog_rules._detect_prereq_cycles(
            {"a": {"prerequisites": ["missing"]}, "b": {"prerequisites": ["a"]}},
            errors,
        )
        self.assertEqual([], errors)
        validator = semantic._TrackValidator("track")
        validator.lesson_index = {
            "ready": {"status": "ready"},
            "planned": {"status": "planned"},
            "different": {"status": "ready", "moduleId": "catalog"},
        }
        validator.parsed_lessons = {
            "planned": (Path("planned.yaml"), {}),
            "different": (Path("different.yaml"), {"moduleId": "file"}),
            "unlisted": (Path("unlisted.yaml"), {}),
        }
        validator.compare_catalog()
        self.assertEqual(
            [
                "catalog.yaml: lição ready marcada como ready mas sem arquivo em modules/",
                "catalog.yaml: lição planned tem arquivo mas está marcada como planned — promova para ready",
                "catalog.yaml: lição different diverge do arquivo different.yaml no campo moduleId ('catalog' != 'file')",
                "unlisted.yaml: lição unlisted não está listada no catalog.yaml",
            ],
            validator.errors,
        )

    def test_missing_modules_and_invalid_lesson_yaml(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            catalog = _base_catalog()
            array_field(catalog, "lessons").clear()
            (root / "catalog.yaml").write_text(yaml.safe_dump(catalog, allow_unicode=True), encoding="utf-8")
            errors, ready, loaded = semantic.validate_track(root)
            self.assertEqual(([], []), (errors, ready))
            self.assertIsNotNone(loaded)

            modules = root / "modules/m"
            modules.mkdir(parents=True)
            (modules / "bad.yaml").write_text("[unterminated", encoding="utf-8")
            errors, _ready, _loaded = semantic.validate_track(root)
            self.assertIn("YAML inválido", errors[0])

            (modules / "bad.yaml").write_text("null\n", encoding="utf-8")
            errors, _ready, _loaded = semantic.validate_track(root)
            self.assertEqual([], errors)

    def test_public_lesson_with_dev_prerequisite_fails(self):
        from .content_contract_fixtures import _write_tree

        catalog = _catalog_with_dev_module()
        array_field(catalog, "lessons").append(
            {"id": "l77", "moduleId": "mod-99", "title": "Dev lesson", "objective": "Objetivo observável dev.", "estimatedMinutes": 3, "prerequisites": [], "skillIds": ["entender"], "status": "ready"}
        )
        array_field(catalog, "lessons").append(
            {"id": "l03", "moduleId": "mod-01", "title": "Public depends on dev", "objective": "Objetivo observável.", "estimatedMinutes": 3, "prerequisites": ["l77"], "skillIds": ["entender"], "status": "ready"}
        )
        with tempfile.TemporaryDirectory() as tmp:
            _write_tree(
                tmp,
                catalog,
                {
                    "l01": _base_lesson(),
                    "l77": _journey_variant("l77", "mod-99", "Dev lesson", []),
                    "l03": _journey_variant("l03", "mod-01", "Public depends on dev", ["l77"]),
                },
            )
            errors, _ready, _loaded = semantic.validate_track(Path(tmp))
            self.assertEqual(
                1,
                len(errors),
                "esperava exatamente o erro de pré-requisito de jornada cruzada; erros:\n%s"
                % "\n".join(errors),
            )
            self.assertIn(
                "catalog.yaml: lição l03 (jornada ia_pratica) referencia pré-requisito da jornada dev: l77",
                errors[0],
            )

    def test_dev_lesson_with_public_prerequisite_passes(self):
        from .content_contract_fixtures import _write_tree

        catalog = _catalog_with_dev_module()
        array_field(catalog, "lessons").append(
            {"id": "l77", "moduleId": "mod-99", "title": "Dev builds on public", "objective": "Objetivo observável dev.", "estimatedMinutes": 3, "prerequisites": ["l01"], "skillIds": ["entender"], "status": "ready"}
        )
        with tempfile.TemporaryDirectory() as tmp:
            _write_tree(
                tmp,
                catalog,
                {
                    "l01": _base_lesson(),
                    "l77": _journey_variant("l77", "mod-99", "Dev builds on public", ["l01"]),
                },
            )
            errors, ready, _loaded = semantic.validate_track(Path(tmp))
            self.assertEqual([], errors)
            self.assertEqual(["l01", "l77"], [lesson["id"] for lesson in ready])

    def test_prereq_journey_rule_unit_edges(self):
        errors = []
        catalog_rules._check_prereq_journeys(
            {
                "l01": {"moduleId": "mod-01", "prerequisites": []},
                "l03": {"moduleId": "mod-01", "prerequisites": ["l77", "l01"]},
                "l77": {"moduleId": "mod-99", "prerequisites": ["l01"]},
                "l88": {"moduleId": "missing", "prerequisites": ["l77"]},
            },
            {
                "mod-01": {"journey": "ia_pratica"},
                "mod-99": {"journey": "dev"},
            },
            errors,
        )
        self.assertEqual(
            [
                "catalog.yaml: lição l03 (jornada ia_pratica) referencia pré-requisito "
                "da jornada dev: l77 — o percurso público não projeta lições dev "
                "e esta lição ficaria bloqueada no app standalone",
            ],
            errors,
        )
