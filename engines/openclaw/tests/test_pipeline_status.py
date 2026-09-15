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


def test_load_ignores_markdown_when_no_yaml(tmp_path: Path) -> None:
    md = tmp_path / "pipeline_status.md"
    md.write_text(
        "- **phase**: review-done\n- **cycle_id**: cold\n- **complexity_level**: 3\n",
        encoding="utf-8",
    )
    loaded = load_status(md)
    assert loaded == PipelineStatus()


def test_load_legacy_file_defaults_grade(tmp_path: Path) -> None:
    """Legacy YAML without grade/advanced_by loads with explicit defaults."""
    import yaml as _yaml

    yml = tmp_path / "pipeline_status.yaml"
    yml.write_text(
        _yaml.safe_dump(
            {"cycle_id": "c1", "phase": "impl-done", "awaiting": "reviewer", "blockers": []},
            sort_keys=False,
        ),
        encoding="utf-8",
    )
    loaded = load_status(tmp_path / "pipeline_status.md")
    assert loaded.grade.value == "unspecified"
    assert loaded.advanced_by == ""


def test_load_rejects_unknown_grade(tmp_path: Path) -> None:
    """grade is a closed set: an unknown value fails loud naming the valid ones."""
    import yaml as _yaml
    from shared.errors import StateCorruptionError

    yml = tmp_path / "pipeline_status.yaml"
    yml.write_text(
        _yaml.safe_dump({"phase": "spec", "grade": "probably-fine"}, sort_keys=False),
        encoding="utf-8",
    )
    try:
        load_status(tmp_path / "pipeline_status.md")
    except StateCorruptionError as exc:
        assert "probably-fine" in str(exc) or "grade" in str(exc)
        assert "simulate" in str(exc) and "verified" in str(exc)
    else:
        raise AssertionError("unknown grade must raise StateCorruptionError")


def test_last_writer_identifiable(tmp_path: Path) -> None:
    """Two sequential saves: the file identifies the last writer (no lock, by design)."""
    md = tmp_path / "pipeline_status.md"
    from engines.openclaw.runner.pipeline_status import Grade

    save_status(
        PipelineStatus(phase=Phase.IMPL_DONE, grade=Grade.SIMULATE, advanced_by="openclaw-checklist"),
        md,
    )
    save_status(
        PipelineStatus(phase=Phase.REVIEW_DONE, grade=Grade.VERIFIED, advanced_by="mme-supervisor"),
        md,
    )
    loaded = load_status(md)
    assert loaded.phase == Phase.REVIEW_DONE
    assert loaded.grade is Grade.VERIFIED
    assert loaded.advanced_by == "mme-supervisor"
