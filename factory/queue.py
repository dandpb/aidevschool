"""Fila de eventos + lease exclusivo (P1).

Intake cria o evento (ID, origem, risco). `claim` reserva o item com criação
atômica (O_CREAT|O_EXCL): um segundo agente que tente assumir o mesmo item
recebe `LeaseHeldError` — dois agentes nunca assumem o mesmo item. Reenvio do
mesmo evento não duplica execução: o evento é idempotente por ID e o lease é
a única porta de entrada para uma run.
"""

from __future__ import annotations

import errno
import json
import os
from pathlib import Path

from .model import Lease, WorkEvent, utcnow


class FactoryError(RuntimeError):
    pass


class LeaseHeldError(FactoryError):
    """P1: outro contexto já reservou este item."""


class EventQueue:
    def __init__(self, root: Path) -> None:
        self.root = Path(root)
        self.queue_dir = self.root / "queue"
        self.lease_dir = self.root / "leases"
        self.queue_dir.mkdir(parents=True, exist_ok=True)
        self.lease_dir.mkdir(parents=True, exist_ok=True)

    # -- intake ------------------------------------------------------------

    def submit(self, event: WorkEvent) -> WorkEvent:
        path = self.queue_dir / f"{event.id}.json"
        if path.exists():
            existing = WorkEvent.from_json(path.read_text(encoding="utf-8"))
            existing_created = existing.created_at
            existing.created_at = event.created_at  # campo volátil: fora da igualdade
            same = existing.to_json() == event.to_json()
            existing.created_at = existing_created
            if same:
                return existing  # reenvio idempotente (mesma identidade)
            raise FactoryError(f"event id {event.id} already exists with different payload")
        tmp = path.with_suffix(".tmp")
        tmp.write_text(event.to_json(), encoding="utf-8")
        os.replace(tmp, path)
        return event

    def get(self, event_id: str) -> WorkEvent:
        path = self.queue_dir / f"{event_id}.json"
        if not path.exists():
            raise FactoryError(f"unknown event {event_id}")
        return WorkEvent.from_json(path.read_text(encoding="utf-8"))

    def pending(self) -> list[WorkEvent]:
        out = []
        for path in sorted(self.queue_dir.glob("*.json")):
            event = WorkEvent.from_json(path.read_text(encoding="utf-8"))
            if not (self.lease_dir / f"{event.id}.json").exists():
                out.append(event)
        return out

    # -- lease ---------------------------------------------------------------

    def _lease_path(self, event_id: str) -> Path:
        return self.lease_dir / f"{event_id}.json"

    def claim(self, event_id: str, holder: str, ttl_seconds: int = 3600) -> Lease:
        self.get(event_id)  # unknown event -> FactoryError
        path = self._lease_path(event_id)
        lease = Lease(event_id=event_id, holder=holder, ttl_seconds=ttl_seconds)
        try:
            fd = os.open(path, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o644)
        except FileExistsError as exc:
            if self.lease_expired(event_id):
                self.release(event_id, holder_enforcement=False)
                return self.claim(event_id, holder, ttl_seconds)
            held = self.lease_of(event_id)
            raise LeaseHeldError(
                f"event {event_id} is leased by {held.holder} since {held.acquired_at}"
            ) from exc
        with os.fdopen(fd, "w", encoding="utf-8") as fh:
            fh.write(lease.to_json())
        return lease

    def lease_of(self, event_id: str) -> Lease:
        path = self._lease_path(event_id)
        if not path.exists():
            raise FactoryError(f"no lease for {event_id}")
        return Lease.from_json(path.read_text(encoding="utf-8"))

    def has_lease(self, event_id: str) -> bool:
        return self._lease_path(event_id).exists()

    def lease_expired(self, event_id: str) -> bool:
        try:
            lease = self.lease_of(event_id)
        except FactoryError:
            return False
        import datetime as dt

        acquired = dt.datetime.fromisoformat(lease.heartbeat_at)
        return (dt.datetime.now(dt.timezone.utc) - acquired).total_seconds() > lease.ttl_seconds

    def heartbeat(self, event_id: str) -> Lease:
        lease = self.lease_of(event_id)
        lease.heartbeat_at = utcnow()
        tmp = self._lease_path(event_id).with_suffix(".tmp")
        tmp.write_text(lease.to_json(), encoding="utf-8")
        os.replace(tmp, self._lease_path(event_id))
        return lease

    def release(self, event_id: str, holder_enforcement: bool = True) -> None:
        path = self._lease_path(event_id)
        if path.exists():
            if holder_enforcement:
                # only rewrite-to-released; physical removal keeps history simple
                lease = self.lease_of(event_id)
                data = json.loads(lease.to_json())
                data["released_at"] = utcnow()
                path.write_text(json.dumps(data, sort_keys=True), encoding="utf-8")
                return
            path.unlink(missing_ok=True)
