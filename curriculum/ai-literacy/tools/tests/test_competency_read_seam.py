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

# AID-3514 — contrato de leitura do currículo compartilhado (seam do consumidor).
#
# Estes testes fixam FATOS do seam atual no head da stack de competência
# (base f36f8b94 = PR #617 sobre d853e4f7 = PR #612), como referência
# executável do contrato especificado em
# `docs/curriculum/competency-read-contract.md`. Eles NÃO duplicam a suíte
# de contrato do campo (test_competency_field_contract.py) nem a suíte de
# metadados ratificados (test_ratified_competency_metadata.py): cobrem o
# lado do CONSUMIDOR do read model — o que o gerado hoje expõe e o que
# nunca expõe — para que qualquer propagação futura seja uma mudança de
# contrato deliberada, revisada pelo Learner App Engineer.
#
# Regras fixadas aqui (todas com fixtures sintéticas isoladas em tmp):
#   1. O read model gerado NÃO declara `competency` nos tipos TS nem no
#      payload (default ausente; consumidor antigo intacto).
#   2. `CatalogLessonEntry` expõe exatamente as 8 chaves atuais — adicionar
#      `competency?` é mudança de contrato explícita, não acidental.
#   3. O corpus do verificador hospedado (literacy-corpus.mjs) NUNCA ganha
#      `competency` (fronteira de confiança: campos producer-facing
#      proibidos na projeção do verificador).
#
# A inércia byte-idêntica com/sem metadados já é testemunhada por
# `test_competency_field_contract.py::test_compiler_output_is_byte_identical_with_and_without_field`
# e não é repetida aqui (sem suíte duplicada).


class CompetencyReadSeamTest(TrackFixtureMixin):
    """AID-3514: fatos do seam de consumo do read model no head atual."""

    def _compile_fixture(self, tmp: str, competency=None) -> str:
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
            return Path(output_path).read_text(encoding="utf-8")

    def test_generated_types_do_not_declare_competency(self):
        """:LessonDefinition/:CatalogLessonEntry hoje não têm o campo —
        adicioná-lo é mudança de contrato deliberada (revisão LAE)."""
        generated = self._compile_fixture(tempfile.mkdtemp())
        self.assertNotIn("competency", generated)
        self.assertIn("export type LessonDefinition", generated)
        self.assertIn("export type CatalogLessonEntry", generated)

    def test_read_model_payload_has_no_competency_key_even_when_mapped(self):
        """YAML mapeado NÃO vira chave no payload gerado (strip do compilador
        no head atual): o default ausente vale também para lições mapeadas."""
        generated = self._compile_fixture(
            tempfile.mkdtemp(), competency={"primary": "F1", "supporting": ["F4"]}
        )
        self.assertNotIn("competency", generated)

    def test_catalog_entries_expose_exactly_the_current_eight_keys(self):
        """Pina o formato de :CatalogLessonEntry (base do diff proposto §6.2
        do contrato): 8 chaves, nesta ordem, sem `competency`."""
        import json

        generated = self._compile_fixture(
            tempfile.mkdtemp(), competency={"primary": "D3"}
        )
        marker = "export const modules: ModuleDefinition[] = "
        payload = generated.split(marker, 1)[1].split("\n\nexport const", 1)[0]
        modules = json.loads(payload)
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

    def test_verifier_corpus_excludes_competency_forever(self):
        """A projeção do verificador hospedado (AID-449) não pode ganhar
        campos producer-facing: `competency` fica fora do corpus mesmo
        quando o YAML canônico está mapeado."""
        import yaml  # noqa: F401  (garante que o ambiente de fixtures está íntegro)

        from tools.compiler import compile_verifier_corpus

        lesson = _base_lesson()
        lesson["competency"] = {"primary": "F2", "supporting": ["F4"]}
        with tempfile.TemporaryDirectory() as tmp, tempfile.TemporaryDirectory() as out:
            track = self.make_track(tmp, lessons={"l01": lesson})
            errors, ready, catalog = validate_track(track)
            self.assertEqual(errors, [])
            errors, corpus_path = compile_verifier_corpus(
                track, out, validated=(errors, ready, catalog)
            )
            self.assertEqual(errors, [])
            corpus = Path(corpus_path).read_text(encoding="utf-8")
        self.assertNotIn("competency", corpus)
        # o corpus permanece a projeção mínima de sempre
        self.assertIn('"version": 1', corpus)
        self.assertIn('"skillIds"', corpus)


if __name__ == "__main__":
    unittest.main()
