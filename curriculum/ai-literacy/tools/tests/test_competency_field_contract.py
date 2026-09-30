from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from .content_contract_fixtures import (
    TrackFixtureMixin,
    _base_catalog,
    _base_lesson,
    json_object,
    object_field,
)

from tools.semantic import validate_track

TRACK_DIR = Path(__file__).resolve().parents[2]
SCHEMA_PATH = TRACK_DIR / "schemas" / "lesson.schema.json"

VALID_COMPETENCIES = ["F1", "F2", "F3", "F4", "D1", "D2", "D3", "D4", "D5", "D6", "D7"]
INVALID_COMPETENCIES = ["X9", "f2", "F-2", "FD", "2F", "F", "d7", "F 4"]
IDENTITY_FIELDS = ("id", "version", "moduleId", "title", "objective", "prerequisites", "skillIds")


class CompetencyFieldContractTest(TrackFixtureMixin):
    """AID-3457 (revisão do plano PR #610 @ 0481c8c0): fatia limitada autorizada.

    Emenda de schema (campo opcional `competency`, F/D ids) + defaults reais +
    scaffolding + testes de compatibilidade produtor/consumidor antigo e novo.
    Preservados: visibilidade, ordem, pré-requisitos, IDs e progresso — o campo
    não muda nenhum deles e o compilador NÃO o propaga (propagação é fatia
    futura retida). Atribuição de competência por lição (dados) continua
    retida à frente CCE/Content Designer.
    """

    def test_live_corpus_old_producer_still_validates(self):
        errors, ready, _catalog = validate_track(TRACK_DIR)
        self.assertEqual(errors, [])
        self.assertEqual(len(ready), 32)

    def test_competency_is_optional_with_registered_default(self):
        import json

        schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
        self.assertNotIn("competency", schema["required"])
        self.assertIn(
            "não mapeada", schema["properties"]["competency"]["description"]
        )

    def test_new_producer_valid_competency_passes(self):
        for competency in VALID_COMPETENCIES:
            with tempfile.TemporaryDirectory() as tmp:
                lesson = _base_lesson()
                lesson["competency"] = competency
                track = self.make_track(tmp, lessons={"l01": lesson})
                errors, _ready, _catalog = self.validate_track(track)
                self.assertEqual(
                    errors, [], "competency %r deveria ser válido" % competency
                )

    def test_invalid_competency_states_are_rejected(self):
        for competency in INVALID_COMPETENCIES:
            with tempfile.TemporaryDirectory() as tmp:
                lesson = _base_lesson()
                lesson["competency"] = competency
                track = self.make_track(tmp, lessons={"l01": lesson})
                errors, _ready, _catalog = self.validate_track(track)
                joined = "\n".join(errors)
                self.assertTrue(
                    errors, "competency %r deveria ser rejeitado" % competency
                )
                self.assertIn("competency", joined)

    def test_compiler_output_is_byte_identical_with_and_without_field(self):
        for label, competency in (("without", None), ("with", "F2")):
            with tempfile.TemporaryDirectory() as tmp:
                catalog = _base_catalog()
                track_block = json_object(object_field(catalog, "track"))
                track_block["audience"] = "publico de teste"
                track_block["promise"] = "promessa de teste"
                lesson = _base_lesson()
                if competency is not None:
                    lesson["competency"] = competency
                track = self.make_track(tmp, catalog=catalog, lessons={"l01": lesson})
                with tempfile.TemporaryDirectory() as out:
                    errors, output_path = self.compile_track(track, out)
                    self.assertEqual(errors, [])
                    generated = Path(output_path).read_text(encoding="utf-8")
                setattr(self, "compiled_%s" % label, generated)
        self.assertEqual(self.compiled_without, self.compiled_with)

    def test_lesson_identity_fields_unchanged_by_field(self):
        with tempfile.TemporaryDirectory() as tmp_a, tempfile.TemporaryDirectory() as tmp_b:
            plain = _base_lesson()
            tagged = _base_lesson()
            tagged["competency"] = "D3"
            track_a = self.make_track(tmp_a, lessons={"l01": plain})
            track_b = self.make_track(tmp_b, lessons={"l01": tagged})
            _errors_a, ready_a, _catalog_a = self.validate_track(track_a)
            _errors_b, ready_b, _catalog_b = self.validate_track(track_b)
            self.assertEqual(len(ready_a), len(ready_b), 1)
            for field in IDENTITY_FIELDS:
                self.assertEqual(
                    ready_a[0].get(field), ready_b[0].get(field), field
                )


if __name__ == "__main__":
    unittest.main()
