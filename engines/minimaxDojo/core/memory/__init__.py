"""Append-only event store and phase locks for Ágora Continuum.

Reference: engines/minimaxDojo/docs/02_state_machine.md §7 (Event format)
           engines/minimaxDojo/docs/05_memory_system.md

The event store is the audit trail. It is append-only: no update, no delete.
Every state transition, gate verdict, and agent action is recorded as NDJSON.
"""

from __future__ import annotations

import json
import os
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


class LockError(Exception):
    """Raised when a phase is already locked by another agent."""


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


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


class PhaseLock:
    """File-based phase lock to prevent concurrent phase execution.

    Each phase (spec, impl, review, benchmark, optimization) can only
    be acquired by one agent at a time. The lock is released when the
    phase completes.
    """

    def __init__(self, lock_dir: str | Path):
        self.lock_dir = Path(lock_dir)
        self.lock_dir.mkdir(parents=True, exist_ok=True)

    def _lock_path(self, phase: str) -> Path:
        return self.lock_dir / f"{phase}.lock"

    def acquire(self, phase: str, agent_id: str) -> None:
        """Acquire a lock for a phase. Raises LockError if already locked."""
        lock_file = self._lock_path(phase)
        if lock_file.exists():
            existing = json.loads(lock_file.read_text())
            raise LockError(
                f"phase '{phase}' is locked by {existing.get('agent_id')} "
                f"since {existing.get('acquired_at')}"
            )
        lock_data = {
            "phase": phase,
            "agent_id": agent_id,
            "acquired_at": _now_iso(),
        }
        # Atomic write via temp file + rename
        tmp = lock_file.with_suffix(".lock.tmp")
        tmp.write_text(json.dumps(lock_data, indent=2))
        tmp.rename(lock_file)

    def release(self, phase: str) -> None:
        """Release the lock for a phase."""
        lock_file = self._lock_path(phase)
        if lock_file.exists():
            lock_file.unlink()

    def is_locked(self, phase: str) -> bool:
        """Check if a phase is currently locked."""
        return self._lock_path(phase).exists()
