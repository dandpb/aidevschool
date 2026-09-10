from __future__ import annotations

import re
import unittest

from ..compiler import PUBLIC_JOURNEY
from .content_contract_fixtures import (
    TRACK_DIR,
    TrackFixtureMixin,
    array_field,
    json_objects,
    required_object,
    string_field,
)

REPO_ROOT = TRACK_DIR.parent.parent

# Guarda anti-recaída da AID-1151 (drift 14→20 detectado 5 dias após as ondas
# mod-06/mod-07): o total público de missões IA Prática declarado nos docs
# operacionais precisa acompanhar a contagem canônica do catálogo. Contagem
# canônica: lições `ready` em módulos `journey: ia_pratica` de
# curriculum/ai-literacy/catalog.yaml (validador: tools/validate.py).
DOC_DECLARATIONS: tuple[tuple[str, re.Pattern[str]], ...] = (
    ("docs/handbook/README.md", re.compile(r"(\d+)\s*\*\*IA Prática\*\*")),
    ("docs/VISION.md", re.compile(r"LiteracyDojo \((\d+)\s+missões\)")),
    ("docs/serving/README.md", re.compile(r"(\d+)\s+missões IA Prática")),
    ("engines/literacyDojo/README.md", re.compile(r"projeta\s+(\d+)\s+missões de `ia_pratica`")),
)

# O guia do facilitador usa fórmula sem número (padrão do student guide,
# AID-1151): nenhum total hardcoded de lições avulsas pode reaparecer lá.
FACILITATOR_GUIDE = "docs/product-readiness/facilitator-guide.md"
HARDCODED_STANDALONE_LESSON_COUNT = re.compile(r"\b\d{1,3}\s+lições\s+(?:avulsas|extras)")


class TestOperationalDocsMissionTotal(TrackFixtureMixin):
    def _catalog_ia_pratica_total(self) -> int:
        errors, ready, catalog = self.validate_track(TRACK_DIR)
        self.assertEqual([], errors)
        journey_by_module = {
            string_field(module, "id"): string_field(module, "journey")
            for module in json_objects(array_field(required_object(catalog), "modules"))
        }
        return sum(
            1
            for lesson in ready
            if journey_by_module[string_field(lesson, "moduleId")] == PUBLIC_JOURNEY
        )

    def test_operational_docs_declare_catalog_ia_pratica_total(self):
        canonical_total = self._catalog_ia_pratica_total()
        for relpath, pattern in DOC_DECLARATIONS:
            with self.subTest(doc=relpath):
                text = (REPO_ROOT / relpath).read_text(encoding="utf-8")
                declared = [int(match.group(1)) for match in pattern.finditer(text)]
                self.assertTrue(
                    declared,
                    "%s não declara o total de missões IA Prática (padrão %r). "
                    "Declare o total canônico (%d) apontando para "
                    "curriculum/ai-literacy/catalog.yaml."
                    % (relpath, pattern.pattern, canonical_total),
                )
                for number in declared:
                    self.assertEqual(
                        canonical_total,
                        number,
                        "%s declara %d missões IA Prática, mas o catálogo canônico "
                        "(curriculum/ai-literacy/catalog.yaml) projeta %d. Atualize o doc "
                        "junto com a onda de conteúdo (guarda AID-1155/AID-1151)."
                        % (relpath, number, canonical_total),
                    )

    def test_facilitator_guide_has_no_hardcoded_standalone_lesson_totals(self):
        text = (REPO_ROOT / FACILITATOR_GUIDE).read_text(encoding="utf-8")
        matches = [match.group(0).replace("\n", " ") for match in HARDCODED_STANDALONE_LESSON_COUNT.finditer(text)]
        self.assertEqual(
            [],
            matches,
            "%s endurece total de lições avulsas (%s). Use a fórmula sem número "
            "(padrão do student guide, AID-1151); a contagem canônica vive em "
            "curriculum/ai-literacy/catalog.yaml." % (FACILITATOR_GUIDE, ", ".join(matches)),
        )
