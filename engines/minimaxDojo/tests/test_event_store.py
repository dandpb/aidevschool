"""Contract tests for the append-only event store.

The event store is the file-backed audit trail for all state machine transitions,
gate verdicts, and agent actions. It MUST be:
- Append-only (no rewriting history)
- NDJSON format (one event per line)
- Lockable for concurrent access prevention
- Queryable by unit_id, agent, event type

Reference: engines/minimaxDojo/docs/02_state_machine.md §7 (Event format)
           engines/minimaxDojo/docs/05_memory_system.md
"""

import json
import tempfile
import unittest
from pathlib import Path


class TestEventStore(unittest.TestCase):
    """Tests for the append-only event store."""

    def setUp(self):
        from engines.minimaxDojo.core.memory import EventStore
        self.store_class = EventStore
        self.tmpdir = tempfile.mkdtemp()
        self.store_path = Path(self.tmpdir) / "events.ndjson"

    def tearDown(self):
        import shutil
        shutil.rmtree(self.tmpdir, ignore_errors=True)

    def test_append_creates_file_if_not_exists(self):
        store = self.store_class(self.store_path)
        store.append({
            "ts": "2026-06-17T12:00:00Z",
            "agente": "maestro",
            "ev": "unit.start",
            "unit": "U-001",
        })
        self.assertTrue(self.store_path.exists())

    def test_append_writes_valid_ndjson(self):
        store = self.store_class(self.store_path)
        store.append({"ts": "2026-06-17T12:00:00Z", "ev": "test1"})
        store.append({"ts": "2026-06-17T12:01:00Z", "ev": "test2"})
        lines = self.store_path.read_text().strip().split("\n")
        self.assertEqual(len(lines), 2)
        for line in lines:
            data = json.loads(line)
            self.assertIn("ts", data)
            self.assertIn("ev", data)

    def test_read_all_events(self):
        store = self.store_class(self.store_path)
        store.append({"ts": "T1", "ev": "a", "unit": "U-001"})
        store.append({"ts": "T2", "ev": "b", "unit": "U-001"})
        store.append({"ts": "T3", "ev": "c", "unit": "U-002"})
        events = store.read_all()
        self.assertEqual(len(events), 3)

    def test_read_by_unit(self):
        store = self.store_class(self.store_path)
        store.append({"ts": "T1", "ev": "a", "unit": "U-001"})
        store.append({"ts": "T2", "ev": "b", "unit": "U-002"})
        store.append({"ts": "T3", "ev": "c", "unit": "U-001"})
        u001_events = store.read_by_unit("U-001")
        self.assertEqual(len(u001_events), 2)
        for e in u001_events:
            self.assertEqual(e["unit"], "U-001")

    def test_read_by_agent(self):
        store = self.store_class(self.store_path)
        store.append({"ts": "T1", "agente": "maestro", "ev": "a"})
        store.append({"ts": "T2", "agente": "prometor", "ev": "b"})
        store.append({"ts": "T3", "agente": "maestro", "ev": "c"})
        maestro_events = store.read_by_agent("maestro")
        self.assertEqual(len(maestro_events), 2)

    def test_read_by_event_type(self):
        store = self.store_class(self.store_path)
        store.append({"ts": "T1", "ev": "unit.start"})
        store.append({"ts": "T2", "ev": "verdict"})
        store.append({"ts": "T3", "ev": "unit.start"})
        start_events = store.read_by_event("unit.start")
        self.assertEqual(len(start_events), 2)

    def test_append_is_atomic(self):
        """Append should not corrupt existing data on failure."""
        store = self.store_class(self.store_path)
        store.append({"ts": "T1", "ev": "original"})
        # Simulate a bad append (invalid JSON value that would corrupt)
        try:
            store.append({"ts": "T2", "ev": object()})  # unserializable
        except (TypeError, ValueError):
            pass  # expected
        # Original data should be intact
        events = store.read_all()
        self.assertEqual(len(events), 1)
        self.assertEqual(events[0]["ev"], "original")

    def test_cannot_overwrite_history(self):
        """Event store is append-only; no update or delete operations."""
        store = self.store_class(self.store_path)
        store.append({"ts": "T1", "ev": "immutable"})
        # Verify no update/delete methods exist
        self.assertFalse(hasattr(store, "update"))
        self.assertFalse(hasattr(store, "delete"))
        self.assertFalse(hasattr(store, "remove"))


class TestPhaseLock(unittest.TestCase):
    """Tests for phase lock files (prevent concurrent phase execution)."""

    def setUp(self):
        from engines.minimaxDojo.core.memory import PhaseLock
        self.lock_class = PhaseLock
        self.tmpdir = tempfile.mkdtemp()

    def tearDown(self):
        import shutil
        shutil.rmtree(self.tmpdir, ignore_errors=True)

    def test_acquire_creates_lock_file(self):
        lock = self.lock_class(Path(self.tmpdir))
        lock.acquire("spec", agent_id="curator-001")
        self.assertTrue((Path(self.tmpdir) / "spec.lock").exists())

    def test_lock_contains_metadata(self):
        lock = self.lock_class(Path(self.tmpdir))
        lock.acquire("spec", agent_id="curator-001")
        lock_data = json.loads((Path(self.tmpdir) / "spec.lock").read_text())
        self.assertEqual(lock_data["phase"], "spec")
        self.assertEqual(lock_data["agent_id"], "curator-001")
        self.assertIn("acquired_at", lock_data)

    def test_cannot_acquire_locked_phase(self):
        from engines.minimaxDojo.core.memory import LockError
        lock = self.lock_class(Path(self.tmpdir))
        lock.acquire("spec", agent_id="curator-001")
        with self.assertRaises(LockError):
            lock.acquire("spec", agent_id="curator-002")

    def test_release_removes_lock(self):
        lock = self.lock_class(Path(self.tmpdir))
        lock.acquire("spec", agent_id="curator-001")
        lock.release("spec")
        self.assertFalse((Path(self.tmpdir) / "spec.lock").exists())

    def test_release_allows_reacquire(self):
        lock = self.lock_class(Path(self.tmpdir))
        lock.acquire("spec", agent_id="curator-001")
        lock.release("spec")
        lock.acquire("spec", agent_id="curator-002")  # should succeed
        self.assertTrue((Path(self.tmpdir) / "spec.lock").exists())

    def test_is_locked_reports_status(self):
        lock = self.lock_class(Path(self.tmpdir))
        self.assertFalse(lock.is_locked("spec"))
        lock.acquire("spec", agent_id="curator-001")
        self.assertTrue(lock.is_locked("spec"))
        lock.release("spec")
        self.assertFalse(lock.is_locked("spec"))


if __name__ == "__main__":
    unittest.main()
