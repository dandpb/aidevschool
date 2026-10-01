from __future__ import annotations

import shutil
import tempfile
import unittest
from pathlib import Path

import yaml

from .content_contract_fixtures import TrackFixtureMixin, _base_lesson

from tools.semantic import validate_track

TRACK_DIR = Path(__file__).resolve().parents[2]

# AID-3505 — atribuições ratificadas de competência (primary + supporting[]),
# incorporadas A FATIA ADITIVA E INERTE sobre o contrato opcional do PR #612
# (d853e4f77ce2a32444c730df4798c5779b03ff3f, AID-3457).
#
# Proveniência (fonte única — não editar valores aqui sem nova ratificação):
#   - Matriz `matriz-competencias-32` r3, revisão 1fee56a2-a980-4199-97ad-50cfe066c001
#     (AID-3497): 32 linhas [D] · 0 [P].
#   - Pareceres: Content Designer ed2ea2f5-a913-42bf-af3c-1ed0ea50832c
#     (approve r3) e Curriculum Platform Engineer f1cf2acd-3ebe-4a18-a555-861c17c03cf2
#     (validação de consistência). Decisões por linha [P]: comentário CD 65db9a9a.
#   - Glossário e objetivos dos quais as linhas derivam: @H
#     579ce995baa7aa28084127b15a9886103ad68a44 (`intent/AID-3453-unify-school/spec.md:7–21`
#     e `curriculum/ai-literacy/modules/**`); objetivos byte-idênticos na base
#     d853e4f7 desta branch (verificado por diff nesta fatia).
#
# `supporting` registra a ordem documental da matriz r3; lista vazia = `—`.
RATIFIED: dict[str, dict[str, object]] = {
    "l01": {"primary": "F1", "supporting": []},
    "l02": {"primary": "F1", "supporting": ["F4"]},
    "l03": {"primary": "F1", "supporting": []},
    "l04": {"primary": "F3", "supporting": []},
    "l05": {"primary": "F3", "supporting": []},
    "l06": {"primary": "F3", "supporting": []},
    "l07": {"primary": "F3", "supporting": []},
    "l08": {"primary": "F4", "supporting": []},
    "l09": {"primary": "F4", "supporting": []},
    "l10": {"primary": "F4", "supporting": []},
    "l11": {"primary": "F4", "supporting": []},
    "l12": {"primary": "F2", "supporting": []},
    "l13": {"primary": "F2", "supporting": ["F4", "F3"]},
    "l14": {"primary": "F4", "supporting": ["F3", "F2"]},
    "l15": {"primary": "D1", "supporting": []},
    "l16": {"primary": "D3", "supporting": ["D4"]},
    "l17": {"primary": "D5", "supporting": ["D3"]},
    "l18": {"primary": "F3", "supporting": []},
    "l19": {"primary": "F3", "supporting": []},
    "l20": {"primary": "F4", "supporting": []},
    "l21": {"primary": "D4", "supporting": ["D3"]},
    "l22": {"primary": "D4", "supporting": []},
    "l23": {"primary": "D4", "supporting": []},
    "l24": {"primary": "F3", "supporting": []},
    "l25": {"primary": "F2", "supporting": []},
    "l26": {"primary": "F4", "supporting": []},
    "l27": {"primary": "D4", "supporting": ["D3"]},
    "l28": {"primary": "D4", "supporting": ["D3"]},
    "l29": {"primary": "D3", "supporting": ["D4"]},
    "l30": {"primary": "F3", "supporting": ["F2"]},
    "l31": {"primary": "F3", "supporting": ["F2"]},
    "l32": {"primary": "F4", "supporting": ["F3"]},
}

GLOSSARY_IDS = ["F1", "F2", "F3", "F4", "D1", "D2", "D3", "D4", "D5", "D6", "D7"]


def _live_lessons(track_dir: Path) -> dict[str, dict]:
    lessons: dict[str, dict] = {}
    for path in sorted((track_dir / "modules").rglob("*.yaml")):
        data = yaml.safe_load(path.read_text(encoding="utf-8"))
        if isinstance(data, dict) and "id" in data:
            lessons[data["id"]] = data
    return lessons


def _fidelity_mismatches(track_dir: Path) -> list[str]:
    """Confere o corpus contra a matriz ratificada; retorna achados por lição."""
    findings: list[str] = []
    lessons = _live_lessons(track_dir)
    for lesson_id in sorted(RATIFIED):
        expected = RATIFIED[lesson_id]
        lesson = lessons.get(lesson_id)
        if lesson is None:
            findings.append("%s: lição ausente do corpus" % lesson_id)
            continue
        found = lesson.get("competency")
        if found is None:
            findings.append("%s: sem competency (ratificado: %r)" % (lesson_id, expected))
        elif found != expected:
            findings.append(
                "%s: competency %r diverge do ratificado %r" % (lesson_id, found, expected)
            )
    extra = sorted(set(lessons) - set(RATIFIED))
    for lesson_id in extra:
        findings.append("%s: lição fora da matriz ratificada" % lesson_id)
    return findings


class RatifiedCompetencyMetadataTest(TrackFixtureMixin):
    """AID-3505 — incorporação das 32 atribuições ratificadas (matriz r3, AID-3497).

    Fatia aditiva e inerte: valores idênticos aos ratificados, IDs do glossário
    vigente, sem propagação para read models, sem bump de versão/contentVersion,
    sem ligação com runtime. Casos negativos: ID inválido, duplicata de apoio,
    primária ausente e apoio inconsistente com a ratificação.
    """

    def test_live_corpus_matches_ratified_matrix_exactly(self):
        self.assertEqual(_fidelity_mismatches(TRACK_DIR), [])

    def test_corpus_has_32_unique_ids_l01_to_l32(self):
        lessons = _live_lessons(TRACK_DIR)
        self.assertEqual(sorted(lessons), ["l%02d" % n for n in range(1, 33)])
        self.assertEqual(len(RATIFIED), 32)

    def test_assignments_use_glossary_ids_and_never_support_the_primary(self):
        for lesson_id, competency in RATIFIED.items():
            self.assertIn(competency["primary"], GLOSSARY_IDS, lesson_id)
            for supporting in competency["supporting"]:
                self.assertIn(supporting, GLOSSARY_IDS, lesson_id)
                self.assertNotEqual(supporting, competency["primary"], lesson_id)

    def test_negative_invalid_id_rejected(self):
        for competency in ({"primary": "F9"}, {"primary": "F2", "supporting": ["X9"]}):
            with tempfile.TemporaryDirectory() as tmp:
                lesson = _base_lesson()
                lesson["competency"] = competency
                track = self.make_track(tmp, lessons={"l01": lesson})
                errors, _ready, _catalog = self.validate_track(track)
                self.assertTrue(errors, "competency %r deveria ser rejeitado" % (competency,))
                self.assert_error_containing(errors, "competency")

    def test_negative_duplicate_supporting_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            lesson = _base_lesson()
            lesson["competency"] = {"primary": "F2", "supporting": ["F4", "F4"]}
            track = self.make_track(tmp, lessons={"l01": lesson})
            errors, _ready, _catalog = self.validate_track(track)
            self.assertTrue(errors, "apoio duplicado deveria ser rejeitado")
            self.assert_error_containing(errors, "não deve conter itens duplicados")

    def test_negative_missing_primary_rejected(self):
        for competency in ({}, {"supporting": ["F4"]}):
            with tempfile.TemporaryDirectory() as tmp:
                lesson = _base_lesson()
                lesson["competency"] = competency
                track = self.make_track(tmp, lessons={"l01": lesson})
                errors, _ready, _catalog = self.validate_track(track)
                self.assertTrue(errors, "competency %r deveria ser rejeitado" % (competency,))
                self.assert_error_containing(errors, "primary")

    def test_negative_inconsistent_support_flagged_by_fidelity_check(self):
        with tempfile.TemporaryDirectory() as tmp:
            twin = Path(tmp) / "track"
            shutil.copytree(TRACK_DIR, twin, ignore=shutil.ignore_patterns("tools", "tests"))
            target = twin / "modules" / "04-seguranca-e-aplicacao" / "l12-proteja-suas-informacoes.yaml"
            data = yaml.safe_load(target.read_text(encoding="utf-8"))
            data["competency"] = {"primary": "F2", "supporting": ["F4"]}
            target.write_text(yaml.safe_dump(data, allow_unicode=True, sort_keys=False), encoding="utf-8")
            findings = _fidelity_mismatches(twin)
            self.assertEqual(len(findings), 1, findings)
            self.assertIn("l12", findings[0])
            self.assertIn("diverge do ratificado", findings[0])

    def test_negative_unmapped_live_lesson_flagged_by_fidelity_check(self):
        with tempfile.TemporaryDirectory() as tmp:
            twin = Path(tmp) / "track"
            shutil.copytree(TRACK_DIR, twin, ignore=shutil.ignore_patterns("tools", "tests"))
            target = twin / "modules" / "01-ai-sem-misterio" / "l01-sua-primeira-conversa-com-uma-ia.yaml"
            data = yaml.safe_load(target.read_text(encoding="utf-8"))
            del data["competency"]
            target.write_text(yaml.safe_dump(data, allow_unicode=True, sort_keys=False), encoding="utf-8")
            findings = _fidelity_mismatches(twin)
            self.assertEqual(len(findings), 1, findings)
            self.assertIn("l01", findings[0])
            self.assertIn("sem competency", findings[0])

    def test_live_corpus_still_validates_and_read_model_is_byte_identical(self):
        from tools import validate as validate_module

        errors, ready, _catalog = validate_track(TRACK_DIR)
        self.assertEqual(errors, [])
        self.assertEqual(len(ready), 32)

        with tempfile.TemporaryDirectory() as tmp:
            with_meta = Path(tmp) / "out-with-meta"
            errors_a, out_a = validate_module.compile_track(TRACK_DIR, with_meta)
            self.assertEqual(errors_a, [])

            twin = Path(tmp) / "track-without-meta"
            shutil.copytree(TRACK_DIR, twin, ignore=shutil.ignore_patterns("tools", "tests"))
            for path in sorted((twin / "modules").rglob("*.yaml")):
                data = yaml.safe_load(path.read_text(encoding="utf-8"))
                if isinstance(data, dict) and "competency" in data:
                    del data["competency"]
                    path.write_text(
                        yaml.safe_dump(data, allow_unicode=True, sort_keys=False),
                        encoding="utf-8",
                    )
            errors_b, _ready_b, _catalog_b = validate_track(twin)
            self.assertEqual(errors_b, [])
            without_meta = Path(tmp) / "out-without-meta"
            errors_c, out_c = validate_module.compile_track(twin, without_meta)
            self.assertEqual(errors_c, [])

            self.assertTrue(out_a is not None and out_c is not None)
            self.assertEqual(
                out_a.read_text(encoding="utf-8"),
                out_c.read_text(encoding="utf-8"),
                "read model deve ser byte-idêntico com ou sem os metadados ratificados",
            )
            for compiled in (out_a, out_c):
                text = compiled.read_text(encoding="utf-8")
                self.assertNotIn("competency", text)


if __name__ == "__main__":
    unittest.main()
