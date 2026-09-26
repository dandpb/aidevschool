from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from .. import catalog_rules
from .content_contract_fixtures import TrackFixtureMixin, _base_catalog, _base_lesson


class TestModuleShape(TrackFixtureMixin):
    def test_module_without_slug_fails_validation_instead_of_crashing_compiler(self):
        """Repro do defeito: validador passava e compile_track quebrava em KeyError."""
        catalog = _base_catalog()
        del catalog["modules"][0]["slug"]
        with tempfile.TemporaryDirectory() as tmp:
            track = self.make_track(tmp, catalog, {"l01": _base_lesson()})
            errors, _ready, _catalog = self.validate_track(track)
            self.assert_error_containing(
                errors, "catalog.yaml: módulo mod-01 sem campo obrigatório: slug"
            )

    def test_module_slug_must_be_unique_kebab_case_and_titled(self):
        catalog = _base_catalog()
        catalog["modules"].append(
            {
                "id": "mod-02",
                "slug": "01-ai-sem-misterio",
                "title": "M2",
                "order": 2,
                "journey": "ia_pratica",
                "skillIds": ["entender"],
            }
        )
        catalog["modules"][0]["title"] = ""
        with tempfile.TemporaryDirectory() as tmp:
            track = self.make_track(tmp, catalog, {"l01": _base_lesson()})
            errors, _ready, _catalog = self.validate_track(track)
            self.assert_error_containing(
                errors, "catalog.yaml: módulo mod-01 sem campo obrigatório: title"
            )
            self.assert_error_containing(
                errors,
                "catalog.yaml: slug de módulo duplicado: 01-ai-sem-misterio "
                "(módulos mod-01 e mod-02)",
            )

    def test_module_slug_format_and_order_type(self):
        catalog = _base_catalog()
        catalog["modules"][0]["slug"] = "Módulo 01"
        catalog["modules"][0]["order"] = "1"
        with tempfile.TemporaryDirectory() as tmp:
            track = self.make_track(tmp, catalog, {"l01": _base_lesson()})
            errors, _ready, _catalog = self.validate_track(track)
            self.assert_error_containing(
                errors, "catalog.yaml: módulo mod-01 com slug inválido: 'Módulo 01'"
            )
            self.assert_error_containing(
                errors, "catalog.yaml: módulo mod-01 com order inválido: '1'"
            )

    def test_rule_unit_covers_missing_title_and_boolean_order(self):
        errors: list[str] = []
        catalog_rules._check_module_shape(
            {"mod-x": {"slug": "ok-slug", "title": "T", "order": True}}, errors
        )
        catalog_rules._check_module_shape(
            {"mod-y": {"slug": "ok-slug-2", "title": "", "order": 2}}, errors
        )
        self.assertEqual(
            [
                "catalog.yaml: módulo mod-x com order inválido: True (esperado: inteiro)",
                "catalog.yaml: módulo mod-y sem campo obrigatório: title",
            ],
            errors,
        )


if __name__ == "__main__":
    unittest.main()
