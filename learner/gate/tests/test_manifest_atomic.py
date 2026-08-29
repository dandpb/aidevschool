from __future__ import annotations

import json
import os
from pathlib import Path
from unittest import mock

from learner.gate.core import MANIFEST_NAME, manifest_hash, write_manifest


def _make_skill_dir(tmp_path: Path) -> Path:
    skill = tmp_path / "skill"
    (skill / "keys").mkdir(parents=True)
    (skill / "rubrics").mkdir()
    (skill / "keys" / "k1.json").write_text(json.dumps({"a": 1}), encoding="utf-8")
    (skill / "rubrics" / "r1.json").write_text(json.dumps({"b": 2}), encoding="utf-8")
    return skill


def test_write_manifest_commits_via_os_replace(tmp_path):
    """Crash-safety contract: the manifest must reach its final path through a
    temp-file-then-os.replace commit, never a direct write_text to the target."""
    skill = _make_skill_dir(tmp_path)
    with mock.patch("learner.gate.core.os.replace", wraps=os.replace) as replace_spy:
        write_manifest(skill)
    assert replace_spy.called, "write_manifest must commit via os.replace"


def test_write_manifest_content_matches_and_leaves_no_tmp(tmp_path):
    skill = _make_skill_dir(tmp_path)
    out = write_manifest(skill)
    assert out.name == MANIFEST_NAME
    assert out.read_text(encoding="utf-8") == manifest_hash(skill)
    leftovers = list(out.parent.glob("*.tmp"))
    assert leftovers == [], f"temp files left behind: {leftovers}"
