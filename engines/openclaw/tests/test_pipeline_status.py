"""YAML-first pipeline_status seam tests."""

from __future__ import annotations

from pathlib import Path

from engines.openclaw.runner.pipeline_status import (
    Phase,
    PipelineStatus,
    load_status,
    save_status,
    yaml_path_for,
)


def test_save_writes_yaml_only_and_leaves_markdown_notes(tmp_path: Path) -> None:
    md = tmp_path / "pipeline_status.md"
    note = "important human note that must survive"
    md.write_text(
        f"""# Pipeline Status

- **cycle_id**: old
- **agents**:
  - `dev-node`: {note}
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

    assert yaml_path_for(md).exists()
    loaded = load_status(md)
    assert loaded.cycle_id == "new-cycle"
    assert loaded.phase == Phase.IMPL_DONE
    assert loaded.blockers == ["waiting-on-tests"]
    # Machine write must not clobber human narrative.
    assert note in md.read_text(encoding="utf-8")


def test_load_prefers_yaml_over_stale_markdown(tmp_path: Path) -> None:
    md = tmp_path / "pipeline_status.md"
    md.write_text("- **phase**: spec\n- **cycle_id**: from-md\n", encoding="utf-8")
    save_status(PipelineStatus(cycle_id="from-yaml", phase=Phase.CYCLE_COMPLETE), md)
    md.write_text("- **phase**: spec\n- **cycle_id**: from-md\n", encoding="utf-8")
    loaded = load_status(md)
    assert loaded.cycle_id == "from-yaml"
    assert loaded.phase == Phase.CYCLE_COMPLETE


def test_load_markdown_fallback_when_no_yaml(tmp_path: Path) -> None:
    md = tmp_path / "pipeline_status.md"
    md.write_text(
        "- **phase**: review-done\n- **cycle_id**: cold\n- **complexity_level**: 3\n",
        encoding="utf-8",
    )
    loaded = load_status(md)
    assert loaded.phase == Phase.REVIEW_DONE
    assert loaded.cycle_id == "cold"
    assert loaded.complexity_level == 3
