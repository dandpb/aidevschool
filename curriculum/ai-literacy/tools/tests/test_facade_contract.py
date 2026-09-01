from __future__ import annotations

import contextlib
import io
import runpy
import subprocess
import sys
import tempfile
from pathlib import Path
from unittest import mock

from .. import validate
from .content_contract_fixtures import TRACK_DIR, TrackFixtureMixin


class TestFacade(TrackFixtureMixin):
    def test_public_functions_are_direct_reexports(self):
        package = validate.__package__
        self.assertEqual(f"{package}.schema", validate.SchemaResolver.__module__)
        self.assertEqual(f"{package}.schema", validate.validate_against_schema.__module__)
        self.assertEqual(f"{package}.semantic", validate.validate_track.__module__)
        self.assertEqual(f"{package}.compiler", validate.compile_track.__module__)

    def test_direct_script_success_and_compile_output(self):
        with tempfile.TemporaryDirectory() as tmp:
            result = subprocess.run(
                [sys.executable, str(Path(validate.__file__)), "--compile", tmp],
                check=False,
                capture_output=True,
                text=True,
            )
            self.assertEqual(0, result.returncode)
            self.assertEqual("", result.stderr)
            self.assertEqual(
                "OK: 23 lição(ões) ready validadas: 17 IA na Prática, 6 Dev; "
                "0 planned (sem arquivo exigido).\n"
                f"Read model gerado: {tmp}/lessons.ts\n",
                result.stdout,
            )
            self.assertTrue((Path(tmp) / "lessons.ts").is_file())

    def test_direct_script_invalid_track_writes_only_stderr(self):
        with tempfile.TemporaryDirectory() as tmp:
            track = Path(tmp) / "missing"
            result = subprocess.run(
                [sys.executable, str(Path(validate.__file__)), "--track", str(track)],
                check=False,
                capture_output=True,
                text=True,
            )
            self.assertEqual(1, result.returncode)
            self.assertEqual("", result.stdout)
            self.assertEqual(
                "VALIDAÇÃO FALHOU — 1 erro(s):\n"
                f"  - catalog.yaml não encontrado em {track}\n",
                result.stderr,
            )

    def test_main_covers_success_compile_and_failure(self):
        with tempfile.TemporaryDirectory() as tmp:
            stdout = io.StringIO()
            with contextlib.redirect_stdout(stdout):
                self.assertEqual(0, validate.main(["--compile", tmp]))
            self.assertIn("Read model gerado:", stdout.getvalue())
            stderr = io.StringIO()
            with contextlib.redirect_stderr(stderr):
                self.assertEqual(1, validate.main(["--track", str(Path(tmp) / "missing")]))
            self.assertIn("catalog.yaml não encontrado", stderr.getvalue())

    def test_direct_script_bootstrap_and_entrypoint(self):
        with mock.patch.object(sys, "argv", [str(validate.__file__), "--track", str(TRACK_DIR)]):
            stdout = io.StringIO()
            with contextlib.redirect_stdout(stdout), self.assertRaises(SystemExit) as raised:
                runpy.run_path(str(validate.__file__), run_name="__main__")
        self.assertEqual(0, raised.exception.code)
        self.assertTrue(stdout.getvalue().startswith("OK: 23 lição(ões) ready validadas"))
