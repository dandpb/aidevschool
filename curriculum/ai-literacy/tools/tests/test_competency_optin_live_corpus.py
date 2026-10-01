from __future__ import annotations

import unittest
from pathlib import Path

from .test_ratified_competency_metadata import RATIFIED

from tools import validate as validate_module
from tools.semantic import validate_track

TRACK_DIR = Path(__file__).resolve().parents[2]

# AID-3569 (Fase 1, §6.6 do contrato AID-3514) — r1: caso opt-in do corpus
# REAL movido para este arquivo NOVO a pedido da revisão LAE (changes_requested
# 07759b7d): o guardrail protect-tests veda editar
# test_ratified_competency_metadata.py neste PR, que muda o código que a
# suíte checa; aquele arquivo permanece no estado exato da base b6e0b8fe.
# `RATIFIED` continua importado da suíte legada (fonte única — não duplicar
# valores sem nova ratificação).


class CompetencyOptInLiveCorpusTest(unittest.TestCase):
    def test_live_corpus_opt_in_propagates_ratified_competency(self):
        """AID-3569 (§6.6 do contrato): no corpus REAL com a flag
        `--with-competency`, os 32 blocos ratificados aparecem exatos no
        payload (posição do YAML preservada) e no join do catálogo (9ª chave
        após skillIds); contentVersion, versions, ordem e identidade seguem
        idênticos ao default; o default continua sem competency."""
        import json
        import tempfile

        errors, ready, _catalog = validate_track(TRACK_DIR)
        self.assertEqual(errors, [])
        self.assertEqual(len(ready), 32)

        with tempfile.TemporaryDirectory() as tmp:
            default_dir = Path(tmp) / "default"
            optin_dir = Path(tmp) / "optin"
            for out_dir, include in ((default_dir, False), (optin_dir, True)):
                errors, out_path = validate_module.compile_track(
                    TRACK_DIR, out_dir, include_competency=include
                )
                self.assertEqual(errors, [])
                self.assertIsNotNone(out_path)

            default_text = (default_dir / "lessons.ts").read_text(encoding="utf-8")
            optin_text = (optin_dir / "lessons.ts").read_text(encoding="utf-8")
            self.assertNotIn("competency", default_text)

            def lessons_of(text):
                return json.loads(
                    text.split(
                        "export const lessons: LessonDefinition[] = ", 1
                    )[1].split("\n\nexport const", 1)[0]
                )

            def entries_of(text):
                modules = json.loads(
                    text.split(
                        "export const modules: ModuleDefinition[] = ", 1
                    )[1].split("\n\nexport const", 1)[0]
                )
                return {
                    entry["id"]: entry
                    for module in modules
                    for entry in module["lessons"]
                }

            default_lessons, optin_lessons = (
                lessons_of(default_text),
                lessons_of(optin_text),
            )
            # 32/32 payloads com o bloco ratificado exato, na posição do YAML
            self.assertEqual(len(optin_lessons), 32)
            for lesson in optin_lessons:
                expected = RATIFIED[lesson["id"]]
                self.assertEqual(lesson["competency"], expected, lesson["id"])
                keys = list(lesson.keys())
                self.assertEqual(
                    keys[keys.index("prerequisites") + 1],
                    "competency",
                    (lesson["id"], keys),
                )
                self.assertEqual(
                    keys[keys.index("competency") + 1], "activities", lesson["id"]
                )
                self.assertNotIn("competency", next(
                    item for item in default_lessons if item["id"] == lesson["id"]
                ))
            # join do catálogo: 9ª chave após skillIds nas 32 hasContent mapeadas
            default_entries, optin_entries = (
                entries_of(default_text),
                entries_of(optin_text),
            )
            for lesson_id, entry in optin_entries.items():
                keys = list(entry.keys())
                self.assertEqual(len(keys), 9, (lesson_id, keys))
                self.assertEqual(
                    keys[keys.index("skillIds") + 1], "competency", lesson_id
                )
                self.assertEqual(entry["competency"], RATIFIED[lesson_id], lesson_id)
                self.assertTrue(entry["hasContent"], lesson_id)
                legacy = default_entries[lesson_id]
                for field in ("status", "hasContent", "skillIds", "prerequisites"):
                    self.assertEqual(entry[field], legacy[field], (lesson_id, field))
            # invariantes de versão: contentVersion e versions idênticos ao default
            self.assertEqual(
                default_text.split(
                    "export const contentVersion: string = ", 1
                )[1].split("\n", 1)[0],
                optin_text.split(
                    "export const contentVersion: string = ", 1
                )[1].split("\n", 1)[0],
            )
            self.assertEqual(
                [l["version"] for l in default_lessons],
                [l["version"] for l in optin_lessons],
            )
            self.assertEqual(
                [l["id"] for l in default_lessons],
                [l["id"] for l in optin_lessons],
            )


if __name__ == "__main__":
    unittest.main()
