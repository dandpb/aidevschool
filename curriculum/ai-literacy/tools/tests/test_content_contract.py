from __future__ import annotations

import tempfile
import unittest

from .content_contract_fixtures import (
    TRACK_DIR,
    TrackFixtureMixin,
    _base_catalog,
    array_field,
    int_field,
    json_object,
    json_objects,
    json_value,
    required_object,
    string_field,
)


class TestValidContent(TrackFixtureMixin):
    def test_minimal_valid_tree_passes(self):
        with tempfile.TemporaryDirectory() as tmp:
            track = self.make_track(tmp)
            errors, ready, _catalog = self.validate_track(track)
            self.assertEqual([], errors)
            self.assertEqual(["l01"], [string_field(lesson, "id") for lesson in ready])

    def test_real_track_passes(self):
        errors, ready, catalog = self.validate_track(TRACK_DIR)
        self.assertEqual([], errors)
        # Toda lição `ready` do catálogo está validada, na ordem do catálogo.
        # Emenda T0 (AID-581, spec AID-528 rev 3 `dce5594f`, decisão CEO
        # AID-579/A) + onda O2 (AID-580) completa: l24 (T1), l25 (T2) e
        # l26 (T3) pousaram `ready` — nenhuma lição `planned` resta.
        entries = json_objects(array_field(required_object(catalog), "lessons"))
        self.assertEqual(
            [string_field(lesson, "id") for lesson in entries if string_field(lesson, "status") == "ready"],
            [string_field(lesson, "id") for lesson in ready],
        )
        for lesson_id in ("l18", "l19", "l20", "l21", "l22", "l23", "l24", "l25", "l26"):
            self.assertIn(lesson_id, [string_field(lesson, "id") for lesson in ready])
        self.assertEqual(
            [],
            [string_field(lesson, "id") for lesson in entries if string_field(lesson, "status") == "planned"],
        )

    def test_real_track_covers_all_seven_activity_types(self):
        errors, ready, _catalog = self.validate_track(TRACK_DIR)
        self.assertEqual([], errors)
        types = {string_field(json_object(activity), "type") for lesson in ready for activity in array_field(lesson, "activities")}
        self.assertEqual(
            {
                "choice",
                "sort",
                "missing_context",
                "safety_classification",
                "prompt_builder",
                "output_comparison",
                "rubric_review",
            },
            types,
        )

    def test_real_track_separates_public_and_dev_journeys(self):
        errors, _ready, catalog = self.validate_track(TRACK_DIR)
        self.assertEqual([], errors)
        modules = json_objects(array_field(required_object(catalog), "modules"))
        journeys = {
            string_field(module, "id"): string_field(module, "journey")
            for module in modules
        }
        self.assertEqual(
            {
                "mod-01": "ia_pratica",
                "mod-02": "ia_pratica",
                "mod-03": "ia_pratica",
                "mod-04": "ia_pratica",
                "mod-05": "dev",
                "mod-06": "ia_pratica",
                "mod-07": "ia_pratica",
            },
            journeys,
        )

    def test_first_release_ai_pratica_chapter_is_ready_and_keeps_entry_prerequisites(self):
        errors, ready, catalog = self.validate_track(TRACK_DIR)
        self.assertEqual([], errors)
        entries = {string_field(lesson, "id"): lesson for lesson in json_objects(array_field(required_object(catalog), "lessons"))}
        ready_by_id = {string_field(lesson, "id"): lesson for lesson in ready}

        self.assertEqual(
            {lesson_id: string_field(entries[lesson_id], "status") for lesson_id in ("l01", "l02", "l03")},
            {"l01": "ready", "l02": "ready", "l03": "ready"},
        )
        self.assertEqual(array_field(entries["l01"], "prerequisites"), [])
        self.assertEqual(array_field(entries["l02"], "prerequisites"), [])
        self.assertEqual(array_field(entries["l03"], "prerequisites"), ["l02"])
        self.assertEqual(
            set(ready_by_id),
            {
                string_field(lesson, "id")
                for lesson in json_objects(array_field(required_object(catalog), "lessons"))
                if string_field(lesson, "status") == "ready"
            },
        )
        for lesson_id in ("l01", "l02", "l03"):
            self.assertGreaterEqual(int_field(ready_by_id[lesson_id], "version"), 1)

    def test_planned_lessons_do_not_require_files(self):
        with tempfile.TemporaryDirectory() as tmp:
            catalog = _base_catalog()
            array_field(catalog, "lessons").append(
                json_object(json_value({
                    "id": "l03",
                    "moduleId": "mod-01",
                    "title": "Outra planejada",
                    "objective": "Sem arquivo ainda.",
                    "estimatedMinutes": 5,
                    "prerequisites": ["l02"],
                    "skillIds": ["avaliar"],
                    "status": "planned",
                }))
            )
            track = self.make_track(tmp, catalog=catalog)
            errors, _ready, _catalog = self.validate_track(track)
            self.assertEqual([], errors)

if __name__ == "__main__":
    unittest.main()
