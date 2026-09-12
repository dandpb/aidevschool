from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from .. import catalog_rules, semantic
from .content_contract_fixtures import (
    _base_catalog,
    _base_lesson,
    _write_tree,
    array_field,
    json_value,
)


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


class TestCrossJourneyPrereqRule(unittest.TestCase):
    """AID-1523: lição ia_pratica não pode depender de lição dev.

    O app standalone filtra o read model por journey (content-contract.md);
    um pré-requisito dev nunca desbloquearia no percurso público. O caminho
    inverso (dev → ia_pratica) é permitido: missões hospedadas constroem
    sobre lições públicas.
    """

    def test_public_lesson_with_dev_prerequisite_fails(self):
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
