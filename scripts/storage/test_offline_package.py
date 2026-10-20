#!/usr/bin/env python3
"""Testes de scripts/storage/offline_package.py (AID-2928, produção local-first).

Cobre o contrato do pacote offline determinístico: dedup por conteúdo,
verify fail-closed, restore byte-idêntico, determinismo do zip e a
rejeição de rebuild sobre pacote existente (append-only).
Stdlib apenas; roda com `python3 scripts/storage/test_offline_package.py`.
"""

from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).with_name("offline_package.py")


def run(*args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, str(SCRIPT), *args],
        capture_output=True,
        text=True,
        check=False,
    )


class OfflinePackage(unittest.TestCase):
    def setUp(self) -> None:
        self._tmp = tempfile.TemporaryDirectory()
        self.tmp = Path(self._tmp.name)
        self.addCleanup(self._tmp.cleanup)
        media = self.tmp / "media"
        media.mkdir()
        (media / "a.png").write_bytes(b"\x89PNG-conteudo-a")
        (media / "b.png").write_bytes(b"\x89PNG-conteudo-b-maior" * 8)
        (media / "c.png").write_bytes(b"\x89PNG-conteudo-a")  # duplicado de a
        self.media = media

    def build(self, out: str, *extra: str) -> subprocess.CompletedProcess[str]:
        return run(
            "build",
            "--file", str(self.media / "a.png") + "::aula/a.png",
            "--file", str(self.media / "b.png") + "::aula/b.png",
            "--file", str(self.media / "c.png") + "::aula/copia-a.png",
            "--name", "t",
            "--version", "1.0.0",
            "--out", out,
            "--zip",
            *extra,
        )

    def test_build_dedup_e_manifesto(self) -> None:
        proc = self.build(str(self.tmp / "out"))
        self.assertEqual(proc.returncode, 0, proc.stderr)
        receipt = json.loads(proc.stdout)
        self.assertEqual(receipt["status"], "ok")
        self.assertEqual(receipt["files"], 3)
        self.assertEqual(receipt["blobs"], 2, "conteúdo duplicado deve compartilhar blob")
        manifest = json.loads((self.tmp / "out" / "t-1.0.0" / "manifest.json").read_text())
        self.assertEqual([e["path"] for e in manifest["entries"]],
                         ["aula/a.png", "aula/b.png", "aula/copia-a.png"])
        self.assertEqual(manifest["entries"][0]["sha256"], manifest["entries"][2]["sha256"])

    def test_zip_deterministico(self) -> None:
        self.build(str(self.tmp / "out1"))
        self.build(str(self.tmp / "out2"))
        sha1 = sha256_of_(self.tmp / "out1" / "t-1.0.0.zip")
        sha2 = sha256_of_(self.tmp / "out2" / "t-1.0.0.zip")
        self.assertEqual(sha1, sha2, "builds dos mesmos bytes devem produzir zip idêntico")
        sidecar = (self.tmp / "out1" / "t-1.0.0.zip.sha256").read_text().split()[0]
        self.assertEqual(sidecar, sha1)

    def test_verify_ok_e_zip_sidecar(self) -> None:
        self.build(str(self.tmp / "out"))
        v = run("verify", "--package", str(self.tmp / "out" / "t-1.0.0"))
        self.assertEqual(v.returncode, 0, v.stdout)
        self.assertEqual(json.loads(v.stdout)["status"], "ok")
        z = run("verify", "--zip", str(self.tmp / "out" / "t-1.0.0.zip"))
        self.assertEqual(z.returncode, 0, z.stdout)

    def test_tamper_detectado_e_restore_fail_closed(self) -> None:
        self.build(str(self.tmp / "out"))
        pkg = self.tmp / "out" / "t-1.0.0"
        manifest = json.loads((pkg / "manifest.json").read_text())
        victim = pkg / next(e["blob"] for e in manifest["entries"] if e["path"] == "aula/b.png")
        victim.write_bytes(b"corrompido")
        v = run("verify", "--package", str(pkg))
        self.assertEqual(v.returncode, 1)
        self.assertEqual(json.loads(v.stdout)["status"], "failed")

        r = run("restore", "--package", str(pkg), "--into", str(self.tmp / "rest"))
        self.assertEqual(r.returncode, 1)
        receipt = json.loads(r.stdout)
        self.assertEqual(receipt["restored"], 2, "blob corrompido não pode ser gravado")
        self.assertTrue(receipt["problems"], "problemas devem constar no recibo")

    def test_restore_byte_identico(self) -> None:
        self.build(str(self.tmp / "out"))
        r = run("restore", "--package", str(self.tmp / "out" / "t-1.0.0"), "--into", str(self.tmp / "rest"))
        self.assertEqual(r.returncode, 0, r.stdout)
        for logical, src in (("aula/a.png", "a.png"), ("aula/b.png", "b.png"), ("aula/copia-a.png", "c.png")):
            self.assertEqual((self.tmp / "rest" / logical).read_bytes(),
                             (self.media / src).read_bytes(), logical)

    def test_build_append_only_rejeita_versao_existente(self) -> None:
        self.build(str(self.tmp / "out"))
        again = self.build(str(self.tmp / "out"))
        self.assertNotEqual(again.returncode, 0, "rebuild sobre pacote existente deve falhar")

    def test_schema_version_rejeitado(self) -> None:
        self.build(str(self.tmp / "out"))
        manifest_path = self.tmp / "out" / "t-1.0.0" / "manifest.json"
        doc = json.loads(manifest_path.read_text())
        doc["schemaVersion"] = 99
        manifest_path.write_text(json.dumps(doc))
        v = run("verify", "--package", str(self.tmp / "out" / "t-1.0.0"))
        self.assertEqual(v.returncode, 1)
        self.assertTrue(any("schemaVersion" in p for p in json.loads(v.stdout)["problems"]))

    def test_provider_default_file(self) -> None:
        self.build(str(self.tmp / "out"))
        manifest = json.loads((self.tmp / "out" / "t-1.0.0" / "manifest.json").read_text())
        self.assertEqual(manifest["provider"], "file")
        for entry in manifest["entries"]:
            self.assertEqual(entry["provider"], "file")
            self.assertNotIn("url", entry)

    def test_provider_release_registra_url_e_exige_base(self) -> None:
        base = "https://github.com/dandpb/aidevschool/releases/download/media-v1"
        proc = self.build(str(self.tmp / "out"), "--provider", "release", "--release-base", base)
        self.assertEqual(proc.returncode, 0, proc.stderr)
        self.assertEqual(json.loads(proc.stdout)["provider"], "release")
        manifest = json.loads((self.tmp / "out" / "t-1.0.0" / "manifest.json").read_text())
        self.assertEqual(manifest["provider"], "release")
        self.assertEqual(manifest["releaseBase"], base)
        for entry in manifest["entries"]:
            self.assertEqual(entry["provider"], "release")
            self.assertEqual(entry["url"], f"{base}/{entry['blob']}")
        v = run("verify", "--package", str(self.tmp / "out" / "t-1.0.0"))
        self.assertEqual(v.returncode, 0, v.stdout)

        # release sem --release-base deve falhar (fail-closed)
        bad = self.build(str(self.tmp / "out2"), "--provider", "release")
        self.assertNotEqual(bad.returncode, 0)


def sha256_of_(path: Path) -> str:
    import hashlib

    digest = hashlib.sha256()
    digest.update(path.read_bytes())
    return digest.hexdigest()


if __name__ == "__main__":
    unittest.main(verbosity=2)
