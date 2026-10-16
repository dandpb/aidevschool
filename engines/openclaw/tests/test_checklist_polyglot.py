from __future__ import annotations

from pathlib import Path

from engines.openclaw.runner.checklist import evaluate
from engines.openclaw.runner.pipeline_status import Phase


def test_evaluate_impl_node_only_project_passes_without_go_or_rust(tmp_path: Path) -> None:
    project = "curriculum/02_key_value_store"
    node_dir = tmp_path / project / "node-impl"
    node_dir.mkdir(parents=True)
    (node_dir / "index.ts").write_text("export {};\n", encoding="utf-8")
    ok, reason, nxt = evaluate(tmp_path, project, Phase.SPEC_DONE)
    assert ok
    assert nxt == Phase.IMPL_DONE
    assert "impl PASS" in reason


def test_evaluate_impl_polyglot_project_01_still_requires_go_and_rust(tmp_path: Path) -> None:
    project = "curriculum/01_rate_limiter"
    node_dir = tmp_path / project / "node-impl"
    node_dir.mkdir(parents=True)
    (node_dir / "index.ts").write_text("export {};\n", encoding="utf-8")
    ok, reason, nxt = evaluate(tmp_path, project, Phase.SPEC_DONE)
    assert not ok
    assert nxt is None
    assert "go-impl" in reason
