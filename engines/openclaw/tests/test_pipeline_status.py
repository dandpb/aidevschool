"""Structured pipeline_status seam tests."""

from __future__ import annotations

from pathlib import Path

from engines.openclaw.runner.pipeline_status import (
    Phase,
    PipelineStatus,
    load_status,
    save_status,
    yaml_path_for,
)


def test_save_creates_yaml_and_preserves_agent_notes(tmp_path: Path) -> None:
    md = tmp_path / "pipeline_status.md"
    md.write_text(
        """# Pipeline Status

- **cycle_id**: old
- **current_project**: `curriculum/01_rate_limiter`
- **complexity_level**: 1
- **phase**: spec
- **awaiting**: `curator`
- **agents**:
  - `dev-node`: important human note that must survive
- **blockers**: []
""",
        encoding="utf-8",
    )
    status = PipelineStatus(
        cycle_id="new-cycle",
        current_project="curriculum/02_key_value_store",
        complexity_level=2,
        phase=Phase.IMPL_DONE,
        awaiting="reviewer",
        blockers=["waiting-on-tests"],
    )
    save_status(status, md)

    ypath = yaml_path_for(md)
    assert ypath.exists()
    loaded = load_status(md)
    assert loaded.cycle_id == "new-cycle"
    assert loaded.phase == Phase.IMPL_DONE
    assert loaded.blockers == ["waiting-on-tests"]

    text = md.read_text(encoding="utf-8")
    assert "important human note that must survive" in text
    assert "new-cycle" in text
    assert "impl-done" in text


def test_load_prefers_yaml_over_stale_markdown(tmp_path: Path) -> None:
    md = tmp_path / "pipeline_status.md"
    md.write_text(
        "- **phase**: spec\n- **cycle_id**: from-md\n",
        encoding="utf-8",
    )
    status = PipelineStatus(cycle_id="from-yaml", phase=Phase.CYCLE_COMPLETE)
    save_status(status, md)
    # Corrupt markdown phase; YAML remains source of truth.
    md.write_text("- **phase**: spec\n- **cycle_id**: from-md\n", encoding="utf-8")
    # Re-write yaml only
    ypath = yaml_path_for(md)
    ypath.write_text(
        "cycle_id: from-yaml\ncurrent_project: ''\ncomplexity_level: 1\n"
        "phase: cycle-complete\nawaiting: ''\nblockers: []\n",
        encoding="utf-8",
    )
    loaded = load_status(md)
    assert loaded.cycle_id == "from-yaml"
    assert loaded.phase == Phase.CYCLE_COMPLETE
