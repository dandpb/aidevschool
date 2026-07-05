"""Recovery tests: corrupted state, malformed status files, missing directories.

Each failure mode must either recover safely (where designed) or fail with a
clean, actionable OpenclawError naming the offending file — never a bare
traceback from json/yaml/os internals.
"""

from __future__ import annotations

import shutil
from pathlib import Path

import pytest

from engines.openclaw.errors import (
    EventNotFoundError,
    OpenclawError,
    StateCorruptionError,
)
from engines.openclaw.hermes.bus import Event, HermesBus
from engines.openclaw.hermes.topics import Topic
from engines.openclaw.runner.scheduler import (
    Phase,
    PipelineStatus,
    Scheduler,
    _load_learning_state,
    _parse_status,
    _write_status,
)


def make_scheduler(tmp_path: Path, adapters: dict | None = None) -> Scheduler:
    status_path = tmp_path / "pipeline_status.md"
    state_path = tmp_path / "learning_state.yaml"
    _write_status(
        PipelineStatus(
            cycle_id="c1",
            current_project="curriculum/01_rate_limiter",
            phase=Phase.SPEC,
        ),
        status_path,
    )
    state_path.write_text("gate:\n  implementation_blocked: false\n", encoding="utf-8")
    return Scheduler(
        bus=HermesBus(root=tmp_path / "hermes"),
        adapters=adapters or {},
        status_path=status_path,
        state_path=state_path,
        scheduler_state_path=tmp_path / "hermes" / "scheduler_state.json",
    )


# --- scheduler_state.json ---------------------------------------------------


def test_corrupted_scheduler_state_raises_actionable_error(tmp_path: Path) -> None:
    scheduler = make_scheduler(tmp_path)
    scheduler.scheduler_state_path.write_text("{ this is not json", encoding="utf-8")
    with pytest.raises(StateCorruptionError) as exc_info:
        scheduler.step()
    message = str(exc_info.value)
    assert "scheduler state" in message
    assert str(scheduler.scheduler_state_path) in message
    assert "delete" in message.lower()


def test_scheduler_state_must_be_json_object(tmp_path: Path) -> None:
    scheduler = make_scheduler(tmp_path)
    scheduler.scheduler_state_path.write_text("[1, 2, 3]", encoding="utf-8")
    with pytest.raises(StateCorruptionError, match="JSON object"):
        scheduler.step()


def test_missing_scheduler_state_recovers_to_empty(tmp_path: Path) -> None:
    scheduler = make_scheduler(tmp_path)
    assert not scheduler.scheduler_state_path.exists()
    assert scheduler._read_scheduler_state() == {}


# --- pipeline_status.md -----------------------------------------------------


def test_malformed_phase_in_pipeline_status(tmp_path: Path) -> None:
    status_path = tmp_path / "pipeline_status.md"
    status_path.write_text("- **phase**: not-a-real-phase\n", encoding="utf-8")
    with pytest.raises(StateCorruptionError) as exc_info:
        _parse_status(status_path)
    message = str(exc_info.value)
    assert str(status_path) in message
    assert "spec" in message  # lists valid phases


def test_malformed_complexity_level_in_pipeline_status(tmp_path: Path) -> None:
    status_path = tmp_path / "pipeline_status.md"
    status_path.write_text(
        "- **phase**: spec\n- **complexity_level**: banana\n", encoding="utf-8"
    )
    with pytest.raises(StateCorruptionError):
        _parse_status(status_path)


def test_missing_pipeline_status_recovers_to_defaults(tmp_path: Path) -> None:
    status = _parse_status(tmp_path / "does_not_exist.md")
    assert status.phase == Phase.SPEC
    assert status.blockers == []


def test_write_status_creates_missing_directories(tmp_path: Path) -> None:
    deep_path = tmp_path / "not" / "yet" / "created" / "pipeline_status.md"
    _write_status(PipelineStatus(cycle_id="c9", phase=Phase.IMPL_DONE), deep_path)
    assert _parse_status(deep_path).phase == Phase.IMPL_DONE


def test_atomic_write_leaves_no_temp_files(tmp_path: Path) -> None:
    status_path = tmp_path / "pipeline_status.md"
    _write_status(PipelineStatus(phase=Phase.SPEC), status_path)
    _write_status(PipelineStatus(phase=Phase.SPEC_DONE), status_path)
    leftovers = [p for p in tmp_path.iterdir() if p.name != "pipeline_status.md"]
    assert leftovers == []
    assert _parse_status(status_path).phase == Phase.SPEC_DONE


# --- learning_state.yaml ----------------------------------------------------


def test_invalid_yaml_learning_state(tmp_path: Path) -> None:
    state_path = tmp_path / "learning_state.yaml"
    state_path.write_text("gate: [unclosed\n", encoding="utf-8")
    with pytest.raises(StateCorruptionError) as exc_info:
        _load_learning_state(state_path)
    assert str(state_path) in str(exc_info.value)


def test_non_mapping_learning_state(tmp_path: Path) -> None:
    state_path = tmp_path / "learning_state.yaml"
    state_path.write_text("just a string\n", encoding="utf-8")
    with pytest.raises(StateCorruptionError, match="YAML mapping"):
        _load_learning_state(state_path)


def test_missing_learning_state_recovers_to_empty(tmp_path: Path) -> None:
    assert _load_learning_state(tmp_path / "nope.yaml") == {}


# --- Hermes bus --------------------------------------------------------------


def test_ack_of_unconsumed_event_raises_event_not_found(tmp_path: Path) -> None:
    bus = HermesBus(root=tmp_path / "hermes")
    event = Event(
        topic=Topic.SPEC_READY,
        cycle_id="c1",
        unit_id="u1",
        artifact_path="a.md",
        content_hash="deadbeef",
    )
    with pytest.raises(EventNotFoundError) as exc_info:
        bus.ack(event)
    assert isinstance(exc_info.value, OpenclawError)
    assert event.dedup_key() in str(exc_info.value)


def test_corrupt_event_file_in_outbox(tmp_path: Path) -> None:
    bus = HermesBus(root=tmp_path / "hermes")
    bad_file = bus.outbox / "0000-corrupt.json"
    bad_file.write_text("not json at all", encoding="utf-8")
    with pytest.raises(StateCorruptionError) as exc_info:
        bus.consume()
    assert str(bad_file) in str(exc_info.value)


def test_event_file_with_missing_fields(tmp_path: Path) -> None:
    bus = HermesBus(root=tmp_path / "hermes")
    bad_file = bus.outbox / "0000-partial.json"
    bad_file.write_text('{"topic": "dojo.spec.ready"}', encoding="utf-8")
    with pytest.raises(StateCorruptionError, match="missing or invalid fields"):
        bus.consume()


def test_consume_with_deleted_inbox_directory(tmp_path: Path) -> None:
    bus = HermesBus(root=tmp_path / "hermes")
    bus.publish(Topic.SPEC_READY, "c1", "u1", "a.md", {"x": 1})
    shutil.rmtree(bus.inbox)
    with pytest.raises(OpenclawError, match="Cannot move Hermes event"):
        bus.consume(topic=Topic.SPEC_READY)


# --- adapter dispatch -------------------------------------------------------


def test_missing_producer_adapter_halts_cleanly(tmp_path: Path) -> None:
    scheduler = make_scheduler(tmp_path, adapters={})
    result = scheduler.step()
    assert result.halted is True
    assert "No producer adapter registered for curator" in result.reason


def test_crashing_adapter_halts_step_instead_of_raising(tmp_path: Path) -> None:
    class BoomAdapter:
        def handle(self, *args, **kwargs):
            raise RuntimeError("boom")

    scheduler = make_scheduler(tmp_path, adapters={"curator": BoomAdapter()})
    result = scheduler.step()
    assert result.halted is True
    assert "curator" in result.reason
    assert "RuntimeError" in result.reason
    assert "boom" in result.reason


def test_adapter_returning_non_dict_halts_cleanly(tmp_path: Path) -> None:
    class WeirdAdapter:
        def handle(self, *args, **kwargs):
            return "not-a-dict"

    scheduler = make_scheduler(tmp_path, adapters={"curator": WeirdAdapter()})
    result = scheduler.step()
    assert result.halted is True
    assert "instead of an AdapterResult dict" in result.reason
