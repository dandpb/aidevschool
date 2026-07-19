"""Testes de contrato do validador/compilador da trilha ai-literacy.

Padrão do repositório: ``unittest`` com ``tempfile.TemporaryDirectory``
(cf. curriculum/_shared/tests/test_evidence.py). Os mesmos testes rodam sob
``python3 -m unittest`` e são descobertos pelo pytest de ``make test``.

Rodar:
    python3 -m unittest discover -s curriculum/ai-literacy/tools/tests
"""

from __future__ import annotations

import shutil
import sys
import tempfile
import unittest
from pathlib import Path

import yaml

TOOLS_DIR = Path(__file__).resolve().parent.parent
TRACK_DIR = TOOLS_DIR.parent
sys.path.insert(0, str(TOOLS_DIR))

import validate  # noqa: E402


FIVE_SKILLS = ["entender", "pedir", "avaliar", "proteger", "aplicar"]


def _base_catalog():
    return {
        "schemaVersion": 1,
        "contentVersion": "test-1",
        "track": {"id": "ai-literacy", "title": "Trilha de teste", "language": "pt-BR"},
        "skills": [{"id": s, "title": s, "description": s} for s in FIVE_SKILLS],
        "modules": [
            {"id": "mod-01", "slug": "01-ai-sem-misterio", "title": "M1", "order": 1, "skillIds": ["entender"]},
        ],
        "lessons": [
            {
                "id": "l01",
                "moduleId": "mod-01",
                "title": "Lição base",
                "objective": "Objetivo observável da lição base.",
                "estimatedMinutes": 3,
                "prerequisites": [],
                "skillIds": ["entender"],
                "status": "ready",
            },
            {
                "id": "l02",
                "moduleId": "mod-01",
                "title": "Lição planejada",
                "objective": "Objetivo da lição planejada.",
                "estimatedMinutes": 4,
                "prerequisites": ["l01"],
                "skillIds": ["entender"],
                "status": "planned",
            },
        ],
    }


def _base_lesson():
    return {
        "id": "l01",
        "version": 1,
        "moduleId": "mod-01",
        "title": "Lição base",
        "objective": "Objetivo observável da lição base.",
        "estimatedMinutes": 3,
        "skillIds": ["entender"],
        "prerequisites": [],
        "activities": [
            {
                "id": "l01-a1",
                "type": "choice",
                "skillId": "entender",
                "instruction": "Escolha a melhor opção.",
                "data": {
                    "options": [
                        {"id": "opt-a", "text": "Opção A."},
                        {"id": "opt-b", "text": "Opção B."},
                    ]
                },
                "evaluation": {"strategy": "deterministic", "correctOptionIds": ["opt-a"]},
                "feedback": {"onFailure": "Ainda falta revisar o conceito central."},
                "storage": {"policy": "structured_only"},
            }
        ],
        "rubric": {
            "id": "l01-rubric",
            "criteria": [{"id": "r-base", "text": "Critério observável.", "weight": 1}],
        },
        "evidence": {
            "verifierRequired": True,
            "completionClaim": "lesson_completed",
            "includesFreeText": False,
        },
        "review": {"intervalsDays": [1, 7, 21]},
        "completion": {"minimumScore": 0.75, "requiredActivityIds": ["l01-a1"]},
    }


def _write_tree(root, catalog, lessons):
    """Escreve uma árvore mínima de trilha em ``root``.

    ``lessons``: mapeamento lesson_id -> dict da lição (ou None para não criar arquivo).
    """
    root = Path(root)
    shutil.copytree(TRACK_DIR / "schemas", root / "schemas")
    (root / "catalog.yaml").write_text(yaml.safe_dump(catalog, allow_unicode=True), encoding="utf-8")
    for lesson_id, lesson in lessons.items():
        if lesson is None:
            continue
        module_dir = root / "modules" / "01-ai-sem-misterio"
        module_dir.mkdir(parents=True, exist_ok=True)
        (module_dir / ("%s-licao.yaml" % lesson_id)).write_text(
            yaml.safe_dump(lesson, allow_unicode=True), encoding="utf-8"
        )


class TrackFixtureMixin:
    def make_track(self, tmp, catalog=None, lessons=None):
        catalog = catalog if catalog is not None else _base_catalog()
        lessons = lessons if lessons is not None else {"l01": _base_lesson()}
        _write_tree(tmp, catalog, lessons)
        return Path(tmp)

    def assert_error_containing(self, errors, fragment):
        joined = "\n".join(errors)
        self.assertIn(fragment, joined, "esperava erro contendo %r; erros:\n%s" % (fragment, joined))


class TestValidContent(TrackFixtureMixin, unittest.TestCase):
    def test_minimal_valid_tree_passes(self):
        with tempfile.TemporaryDirectory() as tmp:
            track = self.make_track(tmp)
            errors, ready, _catalog = validate.validate_track(track)
            self.assertEqual([], errors)
            self.assertEqual(["l01"], [lesson["id"] for lesson in ready])

    def test_real_track_passes(self):
        errors, ready, catalog = validate.validate_track(TRACK_DIR)
        self.assertEqual([], errors)
        self.assertEqual(["l02", "l05", "l12"], [lesson["id"] for lesson in ready])
        self.assertEqual(14, len(catalog["lessons"]))

    def test_planned_lessons_do_not_require_files(self):
        with tempfile.TemporaryDirectory() as tmp:
            catalog = _base_catalog()
            catalog["lessons"].append(
                {
                    "id": "l03",
                    "moduleId": "mod-01",
                    "title": "Outra planejada",
                    "objective": "Sem arquivo ainda.",
                    "estimatedMinutes": 5,
                    "prerequisites": ["l02"],
                    "skillIds": ["avaliar"],
                    "status": "planned",
                }
            )
            track = self.make_track(tmp, catalog=catalog)
            errors, _ready, _catalog = validate.validate_track(track)
            self.assertEqual([], errors)


class TestInvalidContent(TrackFixtureMixin, unittest.TestCase):
    def test_duplicate_lesson_id(self):
        with tempfile.TemporaryDirectory() as tmp:
            dup = _base_lesson()
            catalog = _base_catalog()
            track = self.make_track(tmp, catalog=catalog, lessons={"l01": _base_lesson(), "l02": dup})
            # l02 no catálogo está planned; o arquivo duplicado usa id l01.
            errors, _ready, _c = validate.validate_track(track)
            self.assert_error_containing(errors, "id de lição duplicado: l01")

    def test_unknown_module_reference(self):
        with tempfile.TemporaryDirectory() as tmp:
            catalog = _base_catalog()
            catalog["lessons"][0]["moduleId"] = "mod-99"
            lesson = _base_lesson()
            lesson["moduleId"] = "mod-99"
            track = self.make_track(tmp, catalog=catalog, lessons={"l01": lesson})
            errors, _r, _c = validate.validate_track(track)
            self.assert_error_containing(errors, "módulo inexistente: mod-99")

    def test_unknown_skill_reference(self):
        with tempfile.TemporaryDirectory() as tmp:
            lesson = _base_lesson()
            lesson["skillIds"] = ["voar"]
            catalog = _base_catalog()
            catalog["lessons"][0]["skillIds"] = ["voar"]
            track = self.make_track(tmp, catalog=catalog, lessons={"l01": lesson})
            errors, _r, _c = validate.validate_track(track)
            self.assert_error_containing(errors, "skill inexistente: voar")

    def test_unknown_prerequisite_reference(self):
        with tempfile.TemporaryDirectory() as tmp:
            catalog = _base_catalog()
            catalog["lessons"][1]["prerequisites"] = ["l99"]
            track = self.make_track(tmp, catalog=catalog)
            errors, _r, _c = validate.validate_track(track)
            self.assert_error_containing(errors, "pré-requisito inexistente: l99")

    def test_lesson_without_rubric_fails(self):
        with tempfile.TemporaryDirectory() as tmp:
            lesson = _base_lesson()
            del lesson["rubric"]
            track = self.make_track(tmp, lessons={"l01": lesson})
            errors, _r, _c = validate.validate_track(track)
            self.assert_error_containing(errors, "rubric")

    def test_invalid_version_fails(self):
        with tempfile.TemporaryDirectory() as tmp:
            lesson = _base_lesson()
            lesson["version"] = 0
            track = self.make_track(tmp, lessons={"l01": lesson})
            errors, _r, _c = validate.validate_track(track)
            self.assert_error_containing(errors, "$.version")

    def test_prerequisite_cycle_detected(self):
        with tempfile.TemporaryDirectory() as tmp:
            catalog = _base_catalog()
            catalog["lessons"][0]["prerequisites"] = ["l02"]
            catalog["lessons"][1]["prerequisites"] = ["l01"]
            lesson = _base_lesson()
            lesson["prerequisites"] = ["l02"]
            track = self.make_track(tmp, catalog=catalog, lessons={"l01": lesson})
            errors, _r, _c = validate.validate_track(track)
            self.assert_error_containing(errors, "ciclo de pré-requisitos")

    def test_activity_without_evaluation_strategy_fails(self):
        with tempfile.TemporaryDirectory() as tmp:
            lesson = _base_lesson()
            del lesson["activities"][0]["evaluation"]
            track = self.make_track(tmp, lessons={"l01": lesson})
            errors, _r, _c = validate.validate_track(track)
            self.assert_error_containing(errors, "evaluation")

    def test_activity_without_failure_feedback_fails(self):
        with tempfile.TemporaryDirectory() as tmp:
            lesson = _base_lesson()
            lesson["activities"][0]["feedback"] = {"onSuccess": "Só sucesso não basta."}
            track = self.make_track(tmp, lessons={"l01": lesson})
            errors, _r, _c = validate.validate_track(track)
            self.assert_error_containing(errors, "onFailure")

    def test_unknown_required_activity_id(self):
        with tempfile.TemporaryDirectory() as tmp:
            lesson = _base_lesson()
            lesson["completion"]["requiredActivityIds"] = ["l01-a99"]
            track = self.make_track(tmp, lessons={"l01": lesson})
            errors, _r, _c = validate.validate_track(track)
            self.assert_error_containing(errors, "requiredActivityIds")

    def test_invalid_duration_fails(self):
        with tempfile.TemporaryDirectory() as tmp:
            lesson = _base_lesson()
            lesson["estimatedMinutes"] = 7
            catalog = _base_catalog()
            catalog["lessons"][0]["estimatedMinutes"] = 7
            track = self.make_track(tmp, catalog=catalog, lessons={"l01": lesson})
            errors, _r, _c = validate.validate_track(track)
            self.assert_error_containing(errors, "estimatedMinutes")
            self.assert_error_containing(errors, "duração fora de {3,4,5}")

    def test_ready_lesson_without_file_fails(self):
        with tempfile.TemporaryDirectory() as tmp:
            catalog = _base_catalog()
            catalog["lessons"][1]["status"] = "ready"
            track = self.make_track(tmp, catalog=catalog)
            errors, _r, _c = validate.validate_track(track)
            self.assert_error_containing(errors, "ready mas sem arquivo")

    def test_evaluation_reference_to_unknown_option_fails(self):
        with tempfile.TemporaryDirectory() as tmp:
            lesson = _base_lesson()
            lesson["activities"][0]["evaluation"]["correctOptionIds"] = ["opt-zzz"]
            track = self.make_track(tmp, lessons={"l01": lesson})
            errors, _r, _c = validate.validate_track(track)
            self.assert_error_containing(errors, "correctOptionIds")


class TestCompiler(TrackFixtureMixin, unittest.TestCase):
    def test_compile_real_track_generates_typed_read_model(self):
        with tempfile.TemporaryDirectory() as tmp:
            errors, out_path = validate.compile_track(TRACK_DIR, tmp)
            self.assertEqual([], errors)
            content = Path(out_path).read_text(encoding="utf-8")
            self.assertIn("DO NOT EDIT BY HAND", content)
            self.assertIn("LessonDefinition", content)
            # Full lesson bodies live only in `export const lessons` (ready + hasContent).
            # `lessons` is the last export in the generated file.
            start = content.index("export const lessons: LessonDefinition[] = ")
            lessons_block = content[start:]
            for lesson_id in ('"l02"', '"l05"', '"l12"'):
                self.assertIn('"id": %s' % lesson_id, lessons_block)
            # As três lições piloto usam tipos de atividade diferentes entre si.
            for act_type in ("output_comparison", "prompt_builder", "safety_classification"):
                self.assertIn('"type": "%s"' % act_type, lessons_block)
            # Planned rows may appear in modules catalog; they must not be full lesson bodies.
            self.assertNotIn('"id": "l01"', lessons_block)

    def test_compile_refuses_invalid_content(self):
        with tempfile.TemporaryDirectory() as tmp:
            lesson = _base_lesson()
            del lesson["rubric"]
            track = self.make_track(str(Path(tmp) / "track"), lessons={"l01": lesson})
            errors, out_path = validate.compile_track(track, Path(tmp) / "out")
            self.assertNotEqual([], errors)
            self.assertIsNone(out_path)
            self.assertFalse((Path(tmp) / "out" / "lessons.ts").exists())


if __name__ == "__main__":
    unittest.main()
