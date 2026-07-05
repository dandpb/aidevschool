"""File-based Hermes pub/sub bus with idempotency and conflict detection."""

from __future__ import annotations

import hashlib
import json
import time
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any

from engines.openclaw.errors import EventNotFoundError, OpenclawError, StateCorruptionError
from engines.openclaw.fsio import atomic_write_text, read_json_object
from engines.openclaw.hermes.topics import Topic


ROOT = Path(__file__).resolve().parent.parent.parent.parent
HERMES_ROOT = ROOT / ".mavis" / "hermes"


@dataclass(frozen=True, slots=True)
class Event:
    """A Hermes event."""

    topic: Topic
    cycle_id: str
    unit_id: str
    artifact_path: str
    content_hash: str
    payload: dict[str, Any] = field(default_factory=dict)
    produced_at: str = field(default_factory=lambda: str(time.time()))

    def to_dict(self) -> dict[str, Any]:
        return {
            "topic": self.topic.value,
            "cycle_id": self.cycle_id,
            "unit_id": self.unit_id,
            "artifact_path": self.artifact_path,
            "content_hash": self.content_hash,
            "payload": self.payload,
            "produced_at": self.produced_at,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "Event":
        return cls(
            topic=Topic(data["topic"]),
            cycle_id=data["cycle_id"],
            unit_id=data["unit_id"],
            artifact_path=data["artifact_path"],
            content_hash=data["content_hash"],
            payload=data.get("payload", {}),
            produced_at=data.get("produced_at", ""),
        )

    def dedup_key(self) -> str:
        return f"{self.topic.value}:{self.unit_id}:{self.content_hash}"


def _content_hash(payload: dict[str, Any]) -> str:
    """Stable hash for idempotency."""
    canonical = json.dumps(payload, sort_keys=True, ensure_ascii=True)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()[:16]


class HermesBus:
    """File-backed pub/sub bus.

    Events are immutable JSON files under ``.mavis/hermes/``:

    - ``outbox/`` — events waiting to be delivered.
    - ``inbox/`` — events consumed by subscribers.
    - ``log/`` — processed events (idempotency ledger).
    - ``conflicts/`` — same dedup key with different content.
    """

    def __init__(self, root: Path | None = None) -> None:
        self.root = root or HERMES_ROOT
        self.outbox = self.root / "outbox"
        self.inbox = self.root / "inbox"
        self.log = self.root / "log"
        self.conflicts = self.root / "conflicts"
        try:
            for d in (self.outbox, self.inbox, self.log, self.conflicts):
                d.mkdir(parents=True, exist_ok=True)
        except OSError as exc:
            raise OpenclawError(
                f"Cannot create Hermes bus directories under {self.root}: {exc}"
            ) from exc

    def _load_event(self, path: Path) -> Event:
        """Read one event file, raising StateCorruptionError on any defect."""
        data = read_json_object(path, what="Hermes event")
        try:
            return Event.from_dict(data)
        except (KeyError, ValueError, TypeError) as exc:
            raise StateCorruptionError(
                f"Hermes event at {path} has missing or invalid fields ({exc!r}). "
                f"Move the file out of {path.parent.name}/ and re-run."
            ) from exc

    def _event_path(self, directory: Path, event: Event) -> Path:
        safe_unit = event.unit_id.replace("/", "__").replace("\\", "__")
        filename = (
            f"{event.produced_at.replace('.', '_')}-{event.topic.value.replace('.', '_')}"
            f"-{safe_unit}-{event.content_hash}.json"
        )
        return directory / filename

    def publish(
        self,
        topic: Topic,
        cycle_id: str,
        unit_id: str,
        artifact_path: str,
        payload: dict[str, Any] | None = None,
        content_hash: str | None = None,
    ) -> tuple[Event, str]:
        """Publish an event.

        Returns the event and one of ``new``, ``duplicate``, ``conflict``.
        """
        payload = payload or {}
        computed_hash = content_hash or _content_hash(payload)
        event = Event(
            topic=topic,
            cycle_id=cycle_id,
            unit_id=unit_id,
            artifact_path=artifact_path,
            content_hash=computed_hash,
            payload=payload,
        )

        status = self._classify(event)
        if status == "duplicate":
            return event, "duplicate"

        path = self._event_path(self.outbox, event)
        atomic_write_text(path, json.dumps(event.to_dict(), indent=2))

        if status == "conflict":
            conflict_path = self._event_path(self.conflicts, event)
            atomic_write_text(conflict_path, json.dumps(event.to_dict(), indent=2))

        return event, status

    def _classify(self, event: Event) -> str:
        key = event.dedup_key()
        for directory in (self.outbox, self.inbox, self.log):
            for path in directory.glob("*.json"):
                if self._load_event(path).dedup_key() == key:
                    return "duplicate"
        return "new"

    def consume(self, topic: Topic | None = None, limit: int = 0) -> list[Event]:
        """Move events from outbox to inbox and return them."""
        events: list[tuple[Path, Event]] = []
        for path in sorted(self.outbox.glob("*.json")):
            event = self._load_event(path)
            if topic is None or event.topic == topic:
                events.append((path, event))
            if limit and len(events) >= limit:
                break

        consumed: list[Event] = []
        for path, event in events:
            dest = self._event_path(self.inbox, event)
            self._move(path, dest)
            consumed.append(event)
        return consumed

    def _move(self, src: Path, dest: Path) -> None:
        try:
            src.rename(dest)
        except OSError as exc:
            raise OpenclawError(
                f"Cannot move Hermes event {src} to {dest}: {exc}"
            ) from exc

    def ack(self, event: Event) -> Path:
        """Move an event from inbox to log (idempotency ledger)."""
        for inbox_file in self.inbox.glob("*.json"):
            if self._load_event(inbox_file).dedup_key() == event.dedup_key():
                dest = self._event_path(self.log, event)
                self._move(inbox_file, dest)
                return dest
        raise EventNotFoundError(
            f"Event not found in Hermes inbox ({self.inbox}): {event.dedup_key()}. "
            "It may have been acked already or never consumed."
        )

    def list_events(
        self,
        topic: Topic | None = None,
        directory: str = "log",
    ) -> list[Event]:
        """List events in a directory (outbox, inbox, log, conflicts)."""
        dir_path = getattr(self, directory)
        events: list[Event] = []
        for path in sorted(dir_path.glob("*.json")):
            event = self._load_event(path)
            if topic is None or event.topic == topic:
                events.append(event)
        return events

    def reset(self) -> None:
        """Remove all events. Useful for tests."""
        for d in (self.outbox, self.inbox, self.log, self.conflicts):
            for path in d.glob("*.json"):
                path.unlink()
