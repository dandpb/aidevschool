"""CLI --phase override stamps simulate provenance through the shared helper."""

from __future__ import annotations

from pathlib import Path

from engines.openclaw.__main__ import main
from engines.openclaw.runner.pipeline_status import load_status, yaml_path_for


def test_phase_override_stamps_simulate(tmp_path: Path) -> None:
    project = tmp_path / "curriculum" / "01_rate_limiter" / "docs"
    project.mkdir(parents=True)
    (project / "spec.md").write_text("# spec\n" + "x" * 200, encoding="utf-8")
    (tmp_path / "learning_state.yaml").write_text(
        "gate:\n  implementation_blocked: false\n", encoding="utf-8"
    )

    code = main(
        ["--phase", "spec-done", "--project", "curriculum/01_rate_limiter", "--max-events", "1"],
        root=tmp_path,
    )

    assert code in (0, 1)  # run may halt after the override; the write already happened
    yml = yaml_path_for(tmp_path / "learner" / "pipeline_status.md")
    assert yml.exists(), "override must write machine YAML through save_status"
    text = yml.read_text(encoding="utf-8")
    assert "grade: simulate" in text
    assert "advanced_by: openclaw-cli-override" in text
    loaded = load_status(tmp_path / "learner" / "pipeline_status.md")
    assert loaded.grade.value == "simulate"
