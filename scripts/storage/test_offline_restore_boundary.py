"""Untrusted offline manifests must not redirect restore writes/reads."""

import hashlib
import json
from pathlib import Path
import subprocess
import sys

import pytest

SCRIPT = Path(__file__).with_name("offline_package.py")


def run(*args):
    return subprocess.run([sys.executable, str(SCRIPT), *map(str, args)], text=True, capture_output=True)


@pytest.fixture
def package(tmp_path):
    source = tmp_path / "source.png"
    source.write_bytes(b"synthetic offline asset")
    result = run("build", "--file", f"{source}::nested/asset.png", "--name", "boundary", "--version", "1", "--out", tmp_path / "out")
    assert result.returncode == 0, result.stderr
    return tmp_path / "out/boundary-1"


def mutate(package, callback):
    path = package / "manifest.json"
    manifest = json.loads(path.read_text())
    callback(manifest)
    path.write_text(json.dumps(manifest))


@pytest.mark.parametrize("logical", ["../escaped.txt", "/tmp/unused-boundary-absolute.txt"])
def test_restore_rejects_traversing_and_absolute_logical_paths(tmp_path, package, logical):
    # Keep the absolute-path probe inside this test's own temporary tree.
    logical = str(tmp_path / "absolute.txt") if logical.startswith("/") else logical
    mutate(package, lambda doc: doc["entries"][0].update(path=logical))
    result = run("restore", "--package", package, "--into", tmp_path / "restore")
    assert result.returncode == 1, result.stdout
    assert json.loads(result.stdout)["restored"] == 0
    assert not (tmp_path / "escaped.txt").exists()
    assert not (tmp_path / "absolute.txt").exists()


@pytest.mark.parametrize("version", [999, True])
def test_restore_rejects_unsupported_schema_before_writing(tmp_path, package, version):
    mutate(package, lambda doc: doc.update(schemaVersion=version))
    result = run("restore", "--package", package, "--into", tmp_path / "restore")
    assert result.returncode == 1, result.stdout
    assert not (tmp_path / "restore/nested/asset.png").exists()


@pytest.mark.parametrize("absolute", [False, True])
def test_restore_and_verify_reject_external_blob_paths(tmp_path, package, absolute):
    external = package.parent / "external.png"
    external.write_bytes(b"outside package")
    blob = str(external) if absolute else "../external.png"
    mutate(package, lambda doc: doc["entries"][0].update(blob=blob, sha256=hashlib.sha256(external.read_bytes()).hexdigest(), size=external.stat().st_size))
    for command in ("restore", "verify"):
        args = [command, "--package", package]
        if command == "restore":
            args += ["--into", tmp_path / "restore"]
        result = run(*args)
        assert result.returncode == 1, result.stdout
    assert not (tmp_path / "restore/nested/asset.png").exists()


def test_restore_rejects_destination_symlink_escape(tmp_path, package):
    destination = tmp_path / "restore"
    outside = tmp_path / "outside"
    destination.mkdir()
    outside.mkdir()
    (destination / "nested").symlink_to(outside, target_is_directory=True)
    result = run("restore", "--package", package, "--into", destination)
    assert result.returncode == 1, result.stdout
    assert not (outside / "asset.png").exists()


def test_restore_does_not_follow_a_predictable_temporary_symlink(tmp_path, package):
    destination = tmp_path / "restore/nested"
    destination.mkdir(parents=True)
    outside = tmp_path / "outside.txt"
    outside.write_bytes(b"must remain unchanged")
    (destination / "asset.png.tmp").symlink_to(outside)
    result = run("restore", "--package", package, "--into", tmp_path / "restore")
    assert result.returncode == 0, result.stdout
    assert outside.read_bytes() == b"must remain unchanged"
    assert (destination / "asset.png").read_bytes() == b"synthetic offline asset"


@pytest.mark.parametrize("raw", ["[]", "{bad", '{"schemaVersion": 1, "entries": [null]}'])
def test_malformed_manifest_returns_failed_receipt(tmp_path, package, raw):
    (package / "manifest.json").write_text(raw)
    result = run("restore", "--package", package, "--into", tmp_path / "restore")
    assert result.returncode == 1
    assert json.loads(result.stdout)["status"] == "failed"
