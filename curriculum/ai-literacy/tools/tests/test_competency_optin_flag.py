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

from tools import validate as validate_module
from tools.compiler import compile_verifier_corpus
from tools.semantic import validate_track

TRACK_DIR = Path(__file__).resolve().parents[2]

# AID-3569 — Fase 1 do contrato AID-3514 (§6.1/§6.2/§6.6/§7): flag
# `--with-competency` no compilador, default OFF.
#
# Regras fixadas aqui (fixtures sintéticas isoladas em tmp, padrão
# TrackFixtureMixin — não toca o corpus canônico, não duplica as suites de
# PR #612/#617/#623, cujos fatos de default permanecem válidos e intocados):
#
#   1. Default (sem flag): nenhum `competency` é emitido em lugar nenhum —
#      tipos, payload e catálogo legados; a inércia byte-idêntica do corpus
#      real continua testemunhada por
#      test_competency_field_contract.py (byte-idêntico) e
#      test_ratified_competency_metadata.py (corpus real), não repetida aqui.
#   2. Opt-in: tipos CompetencyId/LessonCompetency + `competency?` em
#      LessonDefinition e CatalogLessonEntry; payload propaga a chave
#      preservando a ordem documental do YAML (entre `prerequisites` e
#      `activities`); catálogo ganha o join (9ª chave após `skillIds`)
#      apenas em entradas hasContent mapeadas — planned e não mapeada
#      permanecem com exatamente as 8 chaves legadas, na mesma ordem.
#   3. Invariantes 1–2 do gate de review (AID-3569): sem bump de
#      `contentVersion` nem de `version` de lição; ordem, pré-requisitos,
#      skillIds, status/hasContent inalterados entre default e opt-in.
#   4. Fronteira AID-449: o corpus do verificador NUNCA recebe
#      `competency` — nem com a flag (a projeção não tem parâmetro de
#      propagação e é byte-idêntica com ou sem flag).
#   5. CLI (validate.py): `--with-competency` parseia com default False;
#      a flag não bypassa a validação (competency inválida continua erro).


def _payload_after(text: str, marker: str) -> str:
    return text.split(marker, 1)[1].split("\n\nexport const", 1)[0]


class CompetencyOptInFlagTest(TrackFixtureMixin):
    """AID-3569: flag --with-competency default OFF — opt-in exato do §6.1."""

    MAPPED = {"primary": "F2", "supporting": ["F4"]}

    def _make_mapped_track(self, tmp: str, competency=None, lessons=None):
        catalog = _base_catalog()
        track_block = json_object(object_field(catalog, "track"))
        track_block["audience"] = "publico de teste"
        track_block["promise"] = "promessa de teste"
        if lessons is None:
            lesson = _base_lesson()
            if competency is not None:
                lesson["competency"] = competency
            lessons = {"l01": lesson}
        return self.make_track(tmp, catalog=catalog, lessons=lessons)

    def _compile(self, tmp: str, include_competency: bool, competency=None) -> str:
        track = self._make_mapped_track(tmp, competency=competency)
        with tempfile.TemporaryDirectory() as out:
            errors, output_path = validate_module.compile_track(
                track, out, include_competency=include_competency
            )
            self.assertEqual(errors, [])
            return Path(output_path).read_text(encoding="utf-8")

    # 1. Default — nenhum competency em lugar nenhum (smoke de contenção;
    #    a prova byte-idêntica completa segue nas suites legadas).

    def test_default_emits_no_competency_anywhere(self):
        generated = self._compile(
            tempfile.mkdtemp(), include_competency=False, competency=self.MAPPED
        )
        self.assertNotIn("competency", generated)
        self.assertIn("export type LessonDefinition", generated)

    # 2. Opt-in — tipos, payload e join do catálogo.

    def test_flag_declares_optional_competency_types(self):
        generated = self._compile(
            tempfile.mkdtemp(), include_competency=True, competency=self.MAPPED
        )
        self.assertIn(
            'export type CompetencyId =\n  | "F1" | "F2" | "F3" | "F4"\n'
            '  | "D1" | "D2" | "D3" | "D4" | "D5" | "D6" | "D7"',
            generated,
        )
        self.assertIn(
            "export type LessonCompetency = {\n"
            "  primary: CompetencyId\n"
            "  supporting: CompetencyId[]\n"
            "}",
            generated,
        )
        # campo opcional em LessonDefinition, após skillIds (§6.1)
        self.assertIn(
            "  skillIds: SkillId[]\n"
            '  /** Opcional — ausência = "não mapeada" (default; AID-3514). */\n'
            "  competency?: LessonCompetency\n"
            "  prerequisites: string[]",
            generated,
        )
        # campo opcional em CatalogLessonEntry, após skillIds (§6.1)
        self.assertIn(
            "  skillIds: SkillId[]\n  competency?: LessonCompetency\n  status:",
            generated,
        )

    def test_flag_payload_preserves_yaml_documentary_order(self):
        import json

        import yaml

        # lição escrita na posição documental do YAML canônico
        # (competency entre prerequisites e activities, como no corpus real
        # incorporado pelo PR #617) — o dump preserva a ordem declarada
        tmp = tempfile.mkdtemp()
        track = self._make_mapped_track(tmp, competency=None, lessons={})
        lesson = _base_lesson()
        ordered = {}
        for key, value in lesson.items():
            ordered[key] = value
            if key == "prerequisites":
                ordered["competency"] = self.MAPPED
        lesson_dir = track / "modules" / "01-ai-sem-misterio"
        lesson_dir.mkdir(parents=True, exist_ok=True)
        (lesson_dir / "l01-licao.yaml").write_text(
            yaml.safe_dump(ordered, allow_unicode=True, sort_keys=False),
            encoding="utf-8",
        )
        _errors, ready, _catalog = validate_track(track)
        self.assertEqual(_errors, [])
        with tempfile.TemporaryDirectory() as out:
            errors, output_path = validate_module.compile_track(
                track, out, include_competency=True
            )
            self.assertEqual(errors, [])
            generated = Path(output_path).read_text(encoding="utf-8")
        lessons = json.loads(
            _payload_after(
                generated, "export const lessons: LessonDefinition[] = "
            )
        )
        # o compilador não reordena: as chaves do payload são exatamente as
        # chaves da lição validada (YAML canônico), na mesma ordem
        self.assertEqual(list(lessons[0].keys()), list(ready[0].keys()))
        keys = list(lessons[0].keys())
        self.assertEqual(keys[keys.index("prerequisites") + 1], "competency", keys)
        self.assertEqual(keys[keys.index("competency") + 1], "activities", keys)
        self.assertEqual(lessons[0]["competency"], self.MAPPED)

    def test_flag_keeps_unmapped_lesson_absent_even_on_opt_in(self):
        import json

        generated = self._compile(tempfile.mkdtemp(), include_competency=True)
        lessons = json.loads(
            _payload_after(
                generated, "export const lessons: LessonDefinition[] = "
            )
        )
        self.assertNotIn("competency", lessons[0])
        modules = json.loads(
            _payload_after(generated, "export const modules: ModuleDefinition[] = ")
        )
        entry = modules[0]["lessons"][0]
        self.assertEqual(
            list(entry.keys()),
            [
                "id",
                "moduleId",
                "title",
                "estimatedMinutes",
                "prerequisites",
                "skillIds",
                "status",
                "hasContent",
            ],
        )

    def test_flag_catalog_join_only_for_mapped_ready_entries(self):
        import json

        generated = self._compile(
            tempfile.mkdtemp(), include_competency=True, competency=self.MAPPED
        )
        modules = json.loads(
            _payload_after(generated, "export const modules: ModuleDefinition[] = ")
        )
        by_id = {entry["id"]: entry for entry in modules[0]["lessons"]}
        # l01: ready + mapeada → 9 chaves, competency imediatamente após skillIds
        ready_entry = by_id["l01"]
        keys = list(ready_entry.keys())
        self.assertEqual(len(keys), 9, keys)
        self.assertEqual(keys.index("skillIds") + 1, keys.index("competency"))
        self.assertEqual(ready_entry["competency"], self.MAPPED)
        # l02: planned → jamais ganha o campo; 8 chaves legadas em ordem
        planned_entry = by_id["l02"]
        self.assertEqual(
            list(planned_entry.keys()),
            [
                "id",
                "moduleId",
                "title",
                "estimatedMinutes",
                "prerequisites",
                "skillIds",
                "status",
                "hasContent",
            ],
        )
        self.assertFalse(planned_entry["hasContent"])
        self.assertNotIn("competency", planned_entry)

    # 3. Invariantes 1–2 do gate: identidade e versões intactas entre default e opt-in.

    def test_flag_preserves_versions_order_and_identity_fields(self):
        import json

        tmp = tempfile.mkdtemp()
        track = self._make_mapped_track(tmp, competency=self.MAPPED)
        lessons_by_mode = {}
        modules_by_mode = {}
        versions_by_mode = {}
        for label, include in (("default", False), ("optin", True)):
            with tempfile.TemporaryDirectory() as out:
                errors, output_path = validate_module.compile_track(
                    track, out, include_competency=include
                )
                self.assertEqual(errors, [])
                text = Path(output_path).read_text(encoding="utf-8")
            lessons_by_mode[label] = json.loads(
                _payload_after(text, "export const lessons: LessonDefinition[] = ")
            )
            modules_by_mode[label] = json.loads(
                _payload_after(text, "export const modules: ModuleDefinition[] = ")
            )
            versions_by_mode[label] = text.split(
                "export const contentVersion: string = ", 1
            )[1].split("\n", 1)[0]
        # invariante 1: sem bump de contentVersion nem de version de lição
        self.assertEqual(versions_by_mode["default"], versions_by_mode["optin"])
        self.assertEqual(
            [l["version"] for l in lessons_by_mode["default"]],
            [l["version"] for l in lessons_by_mode["optin"]],
        )
        # invariante 2: ordem, pré-requisitos, skillIds, status/hasContent intactos
        self.assertEqual(
            [l["id"] for l in lessons_by_mode["default"]],
            [l["id"] for l in lessons_by_mode["optin"]],
        )
        for default_lesson, optin_lesson in zip(
            lessons_by_mode["default"], lessons_by_mode["optin"]
        ):
            for field in (
                "id",
                "version",
                "moduleId",
                "title",
                "skillIds",
                "prerequisites",
                "activities",
                "completion",
            ):
                self.assertEqual(default_lesson[field], optin_lesson[field], field)
        default_entries = [
            e for m in modules_by_mode["default"] for e in m["lessons"]
        ]
        optin_entries = [
            e for m in modules_by_mode["optin"] for e in m["lessons"]
        ]
        for default_entry, optin_entry in zip(default_entries, optin_entries):
            for field in ("id", "moduleId", "status", "hasContent", "skillIds"):
                self.assertEqual(default_entry[field], optin_entry[field], field)

    # 4. Fronteira AID-449: corpus do verificador nunca recebe competency.

    def test_flag_never_reaches_verifier_corpus(self):
        tmp = tempfile.mkdtemp()
        track = self._make_mapped_track(tmp, competency=self.MAPPED)
        errors, ready, catalog = validate_track(track)
        self.assertEqual(errors, [])
        corpus_texts = []
        for _ in range(2):  # a projeção não tem parâmetro de propagação
            with tempfile.TemporaryDirectory() as out:
                errors, corpus_path = compile_verifier_corpus(
                    track, out, validated=(errors, ready, catalog)
                )
                self.assertEqual(errors, [])
                corpus_texts.append(
                    Path(corpus_path).read_text(encoding="utf-8")
                )
        self.assertEqual(corpus_texts[0], corpus_texts[1])
        self.assertNotIn("competency", corpus_texts[0])

    # 5. CLI: flag parseada, default OFF, sem bypass de validação.

    def test_cli_flag_defaults_off_and_parses(self):
        args = validate_module._parse_arguments([])
        self.assertFalse(args.with_competency)
        args = validate_module._parse_arguments(["--with-competency"])
        self.assertTrue(args.with_competency)

    def test_flag_does_not_bypass_validation_of_invalid_competency(self):
        with tempfile.TemporaryDirectory() as tmp:
            track = self._make_mapped_track(
                tmp, competency={"primary": "F9", "supporting": []}
            )
            with tempfile.TemporaryDirectory() as out:
                errors, output_path = validate_module.compile_track(
                    track, out, include_competency=True
                )
                self.assertTrue(errors)
                self.assertIsNone(output_path)
                self.assert_error_containing(errors, "competency")


if __name__ == "__main__":
    unittest.main()
