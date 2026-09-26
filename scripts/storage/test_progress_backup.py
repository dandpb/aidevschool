#!/usr/bin/env python3
"""Testes do caminho de erro e do roundtrip de scripts/storage/progress_backup.py.

Bug AID-2915 (QA AID-2905): schemaVersion fora de {1,2,3,4} imprimia
NameError em vez da mensagem `FAIL estrutura` (constante grafada com S
na f-string). Stdlib apenas; roda com `python3 scripts/storage/test_progress_backup.py`.
"""

from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).with_name("progress_backup.py")


def make_backup(tmp: Path, name: str, **overrides: object) -> Path:
    doc: dict[str, object] = {
        "schemaVersion": 4,
        "contentVersion": "2026-09-10.2",
        "xp": 55,
        "lessonStatus": {"l01": "completed", "l03": "in_progress"},
        "skills": {"atencionamento": {"xp": 10}},
        "streak": {"current": 1, "longest": 3, "lastActivityDate": "2026-09-26"},
        "onboarding": {"completed": True},
    }
    doc.update(overrides)
    path = tmp / name
    path.write_text(json.dumps(doc, ensure_ascii=False), encoding="utf-8")
    return path


def run(*args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, str(SCRIPT), *args],
        capture_output=True,
        text=True,
        check=False,
    )


class SchemaVersionInvalido(unittest.TestCase):
    def setUp(self) -> None:
        self._tmp = tempfile.TemporaryDirectory()
        self.tmp = Path(self._tmp.name)
        self.addCleanup(self._tmp.cleanup)

    def test_verify_imprime_fail_estrutura_sem_nameerror(self) -> None:
        path = make_backup(self.tmp, "bad-v9.json", schemaVersion=9)
        result = run("verify", str(path))
        self.assertEqual(result.returncode, 1)
        self.assertIn("FAIL estrutura", result.stderr)
        self.assertIn("esperado um de [1, 2, 3, 4]", result.stderr)
        self.assertNotIn("NameError", result.stderr)
        self.assertNotIn("Traceback", result.stderr)

    def test_seal_recusa_e_nao_grava_sidecar(self) -> None:
        path = make_backup(self.tmp, "bad-v9.json", schemaVersion=9)
        result = run("seal", str(path))
        self.assertEqual(result.returncode, 1)
        self.assertIn("erro: backup inválido", result.stderr)
        self.assertIn("esperado um de [1, 2, 3, 4]", result.stderr)
        self.assertFalse(path.with_name(path.name + ".sha256").exists())

    def test_info_imprime_erro_sem_nameerror(self) -> None:
        path = make_backup(self.tmp, "bad-v9.json", schemaVersion=9)
        result = run("info", str(path))
        self.assertEqual(result.returncode, 1)
        self.assertIn("esperado um de [1, 2, 3, 4]", result.stderr)
        self.assertNotIn("NameError", result.stderr)


class RoundtripValido(unittest.TestCase):
    def setUp(self) -> None:
        self._tmp = tempfile.TemporaryDirectory()
        self.tmp = Path(self._tmp.name)
        self.addCleanup(self._tmp.cleanup)

    def test_seal_verify_ok(self) -> None:
        path = make_backup(self.tmp, "backup-ok.json")
        sealed = run("seal", str(path))
        self.assertEqual(sealed.returncode, 0, sealed.stderr)
        self.assertTrue(path.with_name(path.name + ".sha256").exists())
        verified = run("verify", str(path))
        self.assertEqual(verified.returncode, 0, verified.stderr)
        self.assertIn("OK", verified.stdout)


if __name__ == "__main__":
    unittest.main()
