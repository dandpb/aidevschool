from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from .content_contract_fixtures import TrackFixtureMixin, _base_catalog, _base_lesson
from .test_ratified_competency_metadata import RATIFIED

from tools.competency_projection import (
    COMPETENCY_MAP_FILENAME,
    COMPETENCY_MAP_VERSION,
    GLOSSARY,
    compile_competency_map,
)
from tools.semantic import validate_track

TRACK_DIR = Path(__file__).resolve().parents[2]
SCHEMA_PATH = TRACK_DIR / "schemas" / "lesson.schema.json"

SCHEMA_GLOSSARY_IDS = ["F1", "F2", "F3", "F4", "D1", "D2", "D3", "D4", "D5", "D6", "D7"]


def _extract_const(text: str, name: str):
    """Extrai o valor JSON de `export const <name>: ... = <json>` do artefato."""
    marker = "export const %s" % name
    start = text.index(marker)
    begin = text.index("= ", start) + 2
    end = text.index("\n\n", begin)
    return json.loads(text[begin:end])


def _compile_live(tmp: str) -> str:
    _errors, ready, catalog = validate_track(TRACK_DIR)
    assert _errors == []
    _errs, out_path = compile_competency_map(
        TRACK_DIR, tmp, validated=(_errors, ready, catalog)
    )
    assert _errs == [] and out_path is not None
    return out_path.read_text(encoding="utf-8")


class CompetencyReadModelContractTest(TrackFixtureMixin):
    """AID-3514 (fatia S5 da fila AID-3525 r2) — read model OPCIONAL de
    competências: um consumidor existente pode ler o mapeamento
    primary/supporting SEM alterar progresso e SEM sincronia entre engines.

    Invariantes testados: lessons.ts intocado (zero acoplamento, consumidor
    antigo não quebra); default explícito mapping=null ("não mapeada");
    glossário completo/único espelhando o enum do schema (drift falha
    fechado); ordem/pré-requisitos/visibilidade preservados (filtro de
    jornada continua no adaptador); contrato sem atainment
    (completed/pass/simulação/mastered permanecem dos domínios de
    progresso); determinismo; fail closed em entrada inválida."""

    def test_live_corpus_maps_all_ready_lessons_with_ratified_values(self):
        with tempfile.TemporaryDirectory() as tmp:
            text = _compile_live(tmp)
            entries = _extract_const(text, "competencyLessons")
            self.assertEqual(len(entries), 32)
            by_id = {entry["lessonId"]: entry for entry in entries}
            self.assertEqual(set(by_id), set(RATIFIED))
            for lesson_id, ratified in RATIFIED.items():
                self.assertEqual(
                    by_id[lesson_id]["mapping"],
                    {
                        "primary": ratified["primary"],
                        "supporting": list(ratified["supporting"]),
                    },
                    "mapeamento de %s diverge da testemunha ratificada" % lesson_id,
                )

    def test_lessons_read_model_is_byte_identical_alongside_competency_map(self):
        with tempfile.TemporaryDirectory() as tmp:
            catalog = _base_catalog()
            catalog["track"]["audience"] = "Público de teste"
            catalog["track"]["promise"] = "Promessa de teste"
            track = self.make_track(
                tmp, catalog=catalog, lessons={"l01": _base_lesson()}
            )
            base = Path(tmp) / "base"
            both = Path(tmp) / "both"
            self.compile_track(track, base)
            errors, _out = compile_competency_map(track, both)
            self.assertEqual(errors, [])
            self.compile_track(track, both)
            self.assertEqual(
                (base / "lessons.ts").read_text(encoding="utf-8"),
                (both / "lessons.ts").read_text(encoding="utf-8"),
                "gerar o competency map não pode perturbar lessons.ts",
            )
            self.assertTrue((both / COMPETENCY_MAP_FILENAME).exists())

    def test_unmapped_lesson_resolves_to_explicit_null_default(self):
        with tempfile.TemporaryDirectory() as tmp:
            track = self.make_track(tmp, lessons={"l01": _base_lesson()})
            errors, out_path = compile_competency_map(track, tmp)
            self.assertEqual(errors, [])
            entries = _extract_const(
                out_path.read_text(encoding="utf-8"), "competencyLessons"
            )
            self.assertEqual(entries[0]["lessonId"], "l01")
            self.assertIsNone(
                entries[0]["mapping"],
                "ausência de atribuição deve resolver para null ('não mapeada'), não erro",
            )

    def test_glossary_is_complete_unique_and_matches_schema_enum(self):
        schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
        enum_ids = schema["properties"]["competency"]["properties"]["primary"]["enum"]
        projection_ids = [entry["id"] for entry in GLOSSARY]
        self.assertEqual(sorted(projection_ids), sorted(SCHEMA_GLOSSARY_IDS))
        self.assertEqual(len(projection_ids), len(set(projection_ids)))
        self.assertEqual(sorted(enum_ids), sorted(SCHEMA_GLOSSARY_IDS))
        for entry in GLOSSARY:
            self.assertIn(entry["domain"], ("fundamentos", "dev"))
            self.assertIn(entry["audience"], ("cotidiano", "dev", "ambos"))
            self.assertTrue(entry["title"])
            self.assertEqual(entry["aliases"], [])
        with tempfile.TemporaryDirectory() as tmp:
            text = _compile_live(tmp)
            artifact_glossary = _extract_const(text, "competencyGlossary")
            self.assertEqual(
                artifact_glossary,
                GLOSSARY,
                "glossário do artefato deve ser o canônico da projeção",
            )

    def test_order_prerequisites_and_journey_visibility_preserved(self):
        catalog = _base_catalog()
        catalog["track"]["audience"] = "Público de teste"
        catalog["track"]["promise"] = "Promessa de teste"
        catalog["modules"] = [
            {"id": "mod-01", "slug": "01-a", "title": "M1", "order": 2, "journey": "ia_pratica", "skillIds": ["entender"]},
            {"id": "mod-02", "slug": "02-b", "title": "M2", "order": 1, "journey": "dev", "skillIds": ["codificar"]},
        ]
        catalog["skills"].append({"id": "codificar", "title": "Codificar", "description": "Codificar."})
        second = _base_lesson()
        second["id"] = "l09"
        second["moduleId"] = "mod-02"
        second["title"] = "Segunda"
        second["prerequisites"] = ["l01"]
        second["skillIds"] = ["codificar"]
        second["competency"] = {"primary": "D3", "supporting": ["D4"]}
        second["activities"][0]["id"] = "l09-a1"
        second["rubric"]["id"] = "l09-rubric"
        second["completion"]["requiredActivityIds"] = ["l09-a1"]
        catalog["lessons"].append(
            {
                "id": "l09",
                "moduleId": "mod-02",
                "title": "Segunda",
                "objective": "Objetivo observável da segunda lição.",
                "estimatedMinutes": 3,
                "prerequisites": ["l01"],
                "skillIds": ["codificar"],
                "status": "ready",
            }
        )
        with tempfile.TemporaryDirectory() as tmp:
            track = self.make_track(tmp, catalog=catalog, lessons={"l01": _base_lesson(), "l09": second})
            errors, out_path = compile_competency_map(track, tmp)
            self.assertEqual(errors, [])
            entries = _extract_const(
                out_path.read_text(encoding="utf-8"), "competencyLessons"
            )
            self.assertEqual(
                [entry["lessonId"] for entry in entries],
                ["l09", "l01"],
                "ordem documental: módulos por order crescente, lições na ordem do catálogo",
            )
            by_id = {entry["lessonId"]: entry for entry in entries}
            self.assertEqual(by_id["l09"]["order"], 1)
            self.assertEqual(by_id["l09"]["journey"], "dev")
            self.assertEqual(by_id["l01"]["order"], 2)
            self.assertEqual(by_id["l01"]["journey"], "ia_pratica")
            self.assertEqual(by_id["l09"]["prerequisites"], ["l01"])
            self.assertEqual(by_id["l09"]["mapping"], {"primary": "D3", "supporting": ["D4"]})

    def test_artifact_carries_no_attainment_contract_constants(self):
        with tempfile.TemporaryDirectory() as tmp:
            text = _compile_live(tmp)
            self.assertIn("export const carriesAttainment = false as const", text)
            self.assertIn("export const producerWritesMastered = false as const", text)
            self.assertNotIn('"mastered"', text)
            self.assertNotIn('"completed"', text)
            self.assertNotIn('"pass"', text)

    def test_fail_closed_on_out_of_glossary_competency(self):
        with tempfile.TemporaryDirectory() as tmp:
            lesson = _base_lesson()
            lesson["competency"] = {"primary": "X9"}
            track = self.make_track(tmp, lessons={"l01": lesson})
            errors, _ready, _catalog = validate_track(track)
            self.assertTrue(errors)
            compile_errors, out = compile_competency_map(track, tmp, validated=(errors, [], None))
            self.assertEqual(compile_errors, errors)
            self.assertIsNone(out)
            self.assertFalse((Path(tmp) / COMPETENCY_MAP_FILENAME).exists())

    def test_deterministic_output(self):
        with tempfile.TemporaryDirectory() as tmp_a, tempfile.TemporaryDirectory() as tmp_b:
            self.assertEqual(_compile_live(tmp_a), _compile_live(tmp_b))

    def test_content_version_and_map_version_are_pinned(self):
        with tempfile.TemporaryDirectory() as tmp:
            text = _compile_live(tmp)
            _errors, _ready, catalog = validate_track(TRACK_DIR)
            marker = "export const competencyMapContentVersion: string = "
            begin = text.index(marker) + len(marker)
            pinned = json.loads(text[begin : text.index("\n", begin)])
            self.assertEqual(pinned, str(catalog["contentVersion"]))
            self.assertIn(
                "export const competencyMapVersion: number = %d" % COMPETENCY_MAP_VERSION,
                text,
            )


if __name__ == "__main__":
    unittest.main()
