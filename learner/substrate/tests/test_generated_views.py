from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from learner.substrate.generated_views import check_views, write_views


class TestGeneratedViews(unittest.TestCase):
    def test_check_reports_drift_without_writing(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            target = Path(tmp) / "view.txt"
            target.write_text("stale\n", encoding="utf-8")
            before = target.read_bytes()

            drift = check_views({target: "fresh\n"})

            self.assertEqual(drift, [target])
            self.assertEqual(target.read_bytes(), before)

    def test_write_views_makes_check_green(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            target = Path(tmp) / "view.txt"

            write_views({target: "fresh\n"})

            self.assertEqual(check_views({target: "fresh\n"}), [])


if __name__ == "__main__":
    unittest.main()
