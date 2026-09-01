from __future__ import annotations

import tempfile
from pathlib import Path

from .content_contract_fixtures import TRACK_DIR, TrackFixtureMixin, _base_lesson


class TestCompiler(TrackFixtureMixin):
    def test_compile_real_track_generates_read_model_content(self):
        with tempfile.TemporaryDirectory() as tmp:
            errors, out_path = self.compile_track(TRACK_DIR, tmp)
            self.assertEqual([], errors)
            self.assertIsNotNone(out_path)
            assert out_path is not None
            content = out_path.read_text(encoding="utf-8")
            for n in range(1, 18):
                self.assertIn('"id": "l%02d"' % n, content)
            for act_type in (
                "choice",
                "sort",
                "missing_context",
                "safety_classification",
                "prompt_builder",
                "output_comparison",
                "rubric_review",
            ):
                self.assertIn('"type": "%s"' % act_type, content)

    def test_compile_real_track_includes_dev_journey_with_module_metadata(self):
        with tempfile.TemporaryDirectory() as tmp:
            errors, out_path = self.compile_track(TRACK_DIR, tmp)
            self.assertEqual([], errors)
            self.assertIsNotNone(out_path)
            assert out_path is not None
            content = out_path.read_text(encoding="utf-8")
            # As lições dev (mod-05) são missões hospedadas publicadas pelo OS
            # (bindings da trilha dev) e por isso entram no read model, com a
            # journey declarada por módulo para o app filtrar o percurso público.
            for lesson_id in ("l15", "l16", "l17"):
                self.assertIn('"id": "%s"' % lesson_id, content)
            self.assertIn('"id": "mod-05"', content)
            self.assertIn('"journey": "dev"', content)
            self.assertIn('"journey": "ia_pratica"', content)

    def test_compile_refuses_invalid_content(self):
        with tempfile.TemporaryDirectory() as tmp:
            lesson = _base_lesson()
            del lesson["rubric"]
            track = self.make_track(str(Path(tmp) / "track"), lessons={"l01": lesson})
            errors, out_path = self.compile_track(track, Path(tmp) / "out")
            self.assertNotEqual([], errors)
            self.assertIsNone(out_path)
            self.assertFalse((Path(tmp) / "out" / "lessons.ts").exists())
