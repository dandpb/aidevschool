"""Unit tests for the path checklist."""

from __future__ import annotations

from pathlib import Path

from engines.openclaw.runner.checklist import evaluate
from engines.openclaw.runner.pipeline_status import Phase


def test_evaluate_spec_pass(tmp_path: Path) -> None:
    project = "curriculum/p"
    p = tmp_path / project / "docs"
    p.mkdir(parents=True)
    (p / "spec.md").write_text("x" * 120, encoding="utf-8")
    ok, reason, nxt = evaluate(tmp_path, project, Phase.SPEC)
    assert ok
    assert nxt == Phase.SPEC_DONE
    assert "PASS" in reason


def test_evaluate_spec_missing(tmp_path: Path) -> None:
    ok, reason, nxt = evaluate(tmp_path, "curriculum/p", Phase.SPEC)
    assert not ok
    assert nxt is None
    assert "missing" in reason
