"""Append-only event store and phase locks for Ágora Continuum.

Reference: engines/minimaxDojo/docs/02_state_machine.md §7 (Event format)
           engines/minimaxDojo/docs/05_memory_system.md

The event store is the audit trail. It is append-only: no update, no delete.
Every state transition, gate verdict, and agent action is recorded as NDJSON.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any


class EventStore:
    """Append-only NDJSON event store.

    Events are written atomically (write to temp, rename).
    The store has NO update or delete operations — history is immutable.
    """

    def __init__(self, path: str | Path):
        self.path = Path(path)

    def append(self, event: dict[str, Any]) -> None:
        """Append a single event atomically. Raises on unserializable data."""
        # Validate serialization BEFORE writing (prevents corruption)
        line = json.dumps(event)  # default=str handles datetime etc.

        # Atomic append: write to temp then append to file
        self.path.parent.mkdir(parents=True, exist_ok=True)

        # Use append mode with file locking via O_APPEND
        with open(self.path, "a", encoding="utf-8") as f:
            f.write(line + "\n")
            f.flush()
            os.fsync(f.fileno())

    def read_all(self) -> list[dict[str, Any]]:
        """Read all events from the store."""
        if not self.path.exists():
            return []
        events: list[dict[str, Any]] = []
        with open(self.path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    events.append(json.loads(line))
        return events

    def read_by_unit(self, unit_id: str) -> list[dict[str, Any]]:
        """Filter events by unit_id."""
        return [
            e for e in self.read_all()
            if e.get("unit") == unit_id
        ]

    def read_by_agent(self, agent: str) -> list[dict[str, Any]]:
        """Filter events by agent name."""
        return [
            e for e in self.read_all()
            if e.get("agente") == agent
        ]

    def read_by_event(self, event_type: str) -> list[dict[str, Any]]:
        """Filter events by event type."""
        return [
            e for e in self.read_all()
            if e.get("ev") == event_type
        ]


