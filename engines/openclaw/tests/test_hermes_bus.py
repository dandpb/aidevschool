"""Tests for the Hermes file-based event bus."""

from __future__ import annotations

import tempfile
from pathlib import Path

import pytest

from engines.openclaw.hermes.bus import Event, HermesBus
from engines.openclaw.hermes.topics import Topic


@pytest.fixture
def bus():
    with tempfile.TemporaryDirectory() as tmp:
        yield HermesBus(root=Path(tmp) / "hermes")


def test_publish_and_consume(bus: HermesBus) -> None:
    event, status = bus.publish(
        topic=Topic.SPEC_READY,
        cycle_id="c1",
        unit_id="u1",
        artifact_path="a.md",
        payload={"x": 1},
    )
    assert status == "new"
    assert event.topic == Topic.SPEC_READY

    consumed = bus.consume(topic=Topic.SPEC_READY)
    assert len(consumed) == 1
    assert consumed[0].content_hash == event.content_hash


def test_idempotency_by_content_hash(bus: HermesBus) -> None:
    bus.publish(
        topic=Topic.SPEC_READY,
        cycle_id="c1",
        unit_id="u1",
        artifact_path="a.md",
        payload={"x": 1},
    )
    bus.consume(topic=Topic.SPEC_READY)

    _, status = bus.publish(
        topic=Topic.SPEC_READY,
        cycle_id="c1",
        unit_id="u1",
        artifact_path="a.md",
        payload={"x": 1},
    )
    assert status == "duplicate"


def test_different_content_hash_is_new_event(bus: HermesBus) -> None:
    """Re-emitting the same topic/unit with different content is allowed in continuous cycles."""
    bus.publish(
        topic=Topic.SPEC_READY,
        cycle_id="c1",
        unit_id="u1",
        artifact_path="a.md",
        payload={"x": 1},
    )
    _, status = bus.publish(
        topic=Topic.SPEC_READY,
        cycle_id="c1",
        unit_id="u1",
        artifact_path="a.md",
        payload={"x": 2},
    )
    assert status == "new"
    assert len(bus.list_events(directory="outbox")) == 2


def test_ack_moves_to_log(bus: HermesBus) -> None:
    event, _ = bus.publish(
        topic=Topic.IMPL_READY,
        cycle_id="c1",
        unit_id="u1",
        artifact_path="impl",
        payload={"ok": True},
    )
    consumed = bus.consume(topic=Topic.IMPL_READY)
    bus.ack(consumed[0])

    assert len(bus.list_events(directory="inbox")) == 0
    assert len(bus.list_events(directory="log")) == 1


def test_topic_filter(bus: HermesBus) -> None:
    bus.publish(Topic.SPEC_READY, "c1", "u1", "a.md", {"x": 1})
    bus.publish(Topic.IMPL_READY, "c1", "u1", "impl", {"x": 2})

    spec_events = bus.consume(topic=Topic.SPEC_READY)
    assert len(spec_events) == 1
    assert spec_events[0].topic == Topic.SPEC_READY


def test_event_roundtrip_preserves_fields(bus: HermesBus) -> None:
    bus.publish(Topic.SPEC_READY, "c1", "u1", "a.md", {"x": 1})
    consumed = bus.consume(topic=Topic.SPEC_READY)
    event = consumed[0]
    assert isinstance(event, Event)
    assert event.cycle_id == "c1"
    assert event.unit_id == "u1"
    assert event.artifact_path == "a.md"
    assert event.payload == {"x": 1}
