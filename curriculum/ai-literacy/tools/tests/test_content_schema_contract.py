from __future__ import annotations

import tempfile

from .content_contract_fixtures import (
    TrackFixtureMixin,
    _base_catalog,
    _base_lesson,
    array_field,
    json_object,
    object_field,
)


class TestInvalidContent(TrackFixtureMixin):
    def test_duplicate_lesson_id(self):
        with tempfile.TemporaryDirectory() as tmp:
            dup = _base_lesson()
            catalog = _base_catalog()
            track = self.make_track(tmp, catalog=catalog, lessons={"l01": _base_lesson(), "l02": dup})
            errors, _ready, _c = self.validate_track(track)
            self.assert_error_containing(errors, "id de lição duplicado: l01")

    def test_unknown_module_reference(self):
        with tempfile.TemporaryDirectory() as tmp:
            catalog = _base_catalog()
            json_object(array_field(catalog, "lessons")[0])["moduleId"] = "mod-99"
            lesson = _base_lesson()
            lesson["moduleId"] = "mod-99"
            track = self.make_track(tmp, catalog=catalog, lessons={"l01": lesson})
            errors, _r, _c = self.validate_track(track)
            self.assert_error_containing(errors, "módulo inexistente: mod-99")

    def test_invalid_module_journey_fails(self):
        with tempfile.TemporaryDirectory() as tmp:
            catalog = _base_catalog()
            json_object(array_field(catalog, "modules")[0])["journey"] = "mixed"
            track = self.make_track(tmp, catalog=catalog)
            errors, _ready, _catalog = self.validate_track(track)
            self.assert_error_containing(errors, "journey inválida: 'mixed'")

    def test_unknown_skill_reference(self):
        with tempfile.TemporaryDirectory() as tmp:
            lesson = _base_lesson()
            lesson["skillIds"] = ["voar"]
            catalog = _base_catalog()
            json_object(array_field(catalog, "lessons")[0])["skillIds"] = ["voar"]
            track = self.make_track(tmp, catalog=catalog, lessons={"l01": lesson})
            errors, _r, _c = self.validate_track(track)
            self.assert_error_containing(errors, "skill inexistente: voar")

    def test_unknown_prerequisite_reference(self):
        with tempfile.TemporaryDirectory() as tmp:
            catalog = _base_catalog()
            json_object(array_field(catalog, "lessons")[1])["prerequisites"] = ["l99"]
            track = self.make_track(tmp, catalog=catalog)
            errors, _r, _c = self.validate_track(track)
            self.assert_error_containing(errors, "pré-requisito inexistente: l99")

    def test_lesson_without_rubric_fails(self):
        with tempfile.TemporaryDirectory() as tmp:
            lesson = _base_lesson()
            del lesson["rubric"]
            track = self.make_track(tmp, lessons={"l01": lesson})
            errors, _r, _c = self.validate_track(track)
            self.assert_error_containing(errors, "rubric")

    def test_invalid_version_fails(self):
        with tempfile.TemporaryDirectory() as tmp:
            lesson = _base_lesson()
            lesson["version"] = 0
            track = self.make_track(tmp, lessons={"l01": lesson})
            errors, _r, _c = self.validate_track(track)
            self.assert_error_containing(errors, "$.version")

    def test_prerequisite_cycle_detected(self):
        with tempfile.TemporaryDirectory() as tmp:
            catalog = _base_catalog()
            json_object(array_field(catalog, "lessons")[0])["prerequisites"] = ["l02"]
            json_object(array_field(catalog, "lessons")[1])["prerequisites"] = ["l01"]
            lesson = _base_lesson()
            lesson["prerequisites"] = ["l02"]
            track = self.make_track(tmp, catalog=catalog, lessons={"l01": lesson})
            errors, _r, _c = self.validate_track(track)
            self.assert_error_containing(errors, "ciclo de pré-requisitos")

    def test_activity_without_evaluation_strategy_fails(self):
        with tempfile.TemporaryDirectory() as tmp:
            lesson = _base_lesson()
            del json_object(array_field(lesson, "activities")[0])["evaluation"]
            track = self.make_track(tmp, lessons={"l01": lesson})
            errors, _r, _c = self.validate_track(track)
            self.assert_error_containing(errors, "evaluation")

    def test_activity_without_failure_feedback_fails(self):
        with tempfile.TemporaryDirectory() as tmp:
            lesson = _base_lesson()
            json_object(array_field(lesson, "activities")[0])["feedback"] = {"onSuccess": "Só sucesso não basta."}
            track = self.make_track(tmp, lessons={"l01": lesson})
            errors, _r, _c = self.validate_track(track)
            self.assert_error_containing(errors, "onFailure")

    def test_unknown_required_activity_id(self):
        with tempfile.TemporaryDirectory() as tmp:
            lesson = _base_lesson()
            object_field(lesson, "completion")["requiredActivityIds"] = ["l01-a99"]
            track = self.make_track(tmp, lessons={"l01": lesson})
            errors, _r, _c = self.validate_track(track)
            self.assert_error_containing(errors, "requiredActivityIds")

    def test_invalid_duration_fails(self):
        with tempfile.TemporaryDirectory() as tmp:
            lesson = _base_lesson()
            lesson["estimatedMinutes"] = 7
            catalog = _base_catalog()
            json_object(array_field(catalog, "lessons")[0])["estimatedMinutes"] = 7
            track = self.make_track(tmp, catalog=catalog, lessons={"l01": lesson})
            errors, _r, _c = self.validate_track(track)
            self.assert_error_containing(errors, "estimatedMinutes")
            self.assert_error_containing(errors, "duração fora de {3,4,5}")

    def test_ready_lesson_without_file_fails(self):
        with tempfile.TemporaryDirectory() as tmp:
            catalog = _base_catalog()
            json_object(array_field(catalog, "lessons")[1])["status"] = "ready"
            track = self.make_track(tmp, catalog=catalog)
            errors, _r, _c = self.validate_track(track)
            self.assert_error_containing(errors, "ready mas sem arquivo")

    def test_evaluation_reference_to_unknown_option_fails(self):
        with tempfile.TemporaryDirectory() as tmp:
            lesson = _base_lesson()
            object_field(json_object(array_field(lesson, "activities")[0]), "evaluation")["correctOptionIds"] = ["opt-zzz"]
            track = self.make_track(tmp, lessons={"l01": lesson})
            errors, _r, _c = self.validate_track(track)
            self.assert_error_containing(errors, "correctOptionIds")
