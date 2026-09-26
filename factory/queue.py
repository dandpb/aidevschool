"""Fila de eventos + lease exclusivo (P1).

Intake cria o evento (ID, origem, risco). `claim` reserva o item com criação
atômica (O_CREAT|O_EXCL): um segundo agente que tente assumir o mesmo item
recebe `LeaseHeldError` — dois agentes nunca assumem o mesmo item. Reenvio do
mesmo evento não duplica execução: o evento é idempotente por ID e o lease é
a única porta de entrada para uma run. O lease carrega um fencing token
(`epoch`): takeover pós-expiração incrementa a época, grava recibo no ledger
encadeado e invalida writers da época anterior (AID-2718/AID-2721).
"""

from __future__ import annotations

import errno
import os
from pathlib import Path

from .ledger import RunLedger
from .model import Lease, Receipt, WorkEvent, utcnow


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
        takeover_from: Lease | None = None
        while True:
            # Fencing (P1, AID-2718/AID-2721): takeover pós-expiração incrementa
            # a época; writers da época anterior são recusados nas estações.
            epoch = 1 if takeover_from is None else takeover_from.epoch + 1
            lease = Lease(event_id=event_id, holder=holder,
                          ttl_seconds=ttl_seconds, epoch=epoch)
            try:
                fd = os.open(path, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o644)
            except FileExistsError as exc:
                existing = self.lease_of(event_id)
                if existing.released:
                    # AID-2728 S7: lease devolvido não é re-claimável — item
                    # precisa re-entrar pela fila (re-intake). Fail-closed.
                    raise LeaseHeldError(
                        f"event {event_id} lease was released at "
                        f"{existing.released_at} by {existing.holder} — "
                        "re-intake required, released leases are not re-claimable"
                    ) from exc
                if self.lease_expired(event_id):
                    takeover_from = self.lease_of(event_id)
                    self.release(event_id, holder_enforcement=False)
                    continue
                held = self.lease_of(event_id)
                raise LeaseHeldError(
                    f"event {event_id} is leased by {held.holder} since {held.acquired_at}"
                ) from exc
            with os.fdopen(fd, "w", encoding="utf-8") as fh:
                fh.write(lease.to_json())
            if takeover_from is not None:
                self._record_takeover(event_id, takeover_from, lease)
            return lease

    def _record_takeover(self, event_id: str, old: Lease, new: Lease) -> Receipt:
        """Takeover deixa recibo no ledger encadeado do run (histórico não apaga)."""
        ledger = RunLedger(self.root / "ledger" / f"run-{event_id}.jsonl")
        last = ledger.last()
        receipt = Receipt(
            seq=(last.seq + 1) if last else 1,
            run_id=f"run-{event_id}",
            station_from="leased",
            station_to="leased",
            actor_role="coordinator",
            context_id=new.holder,
            detail={
                "takeover": True,
                "previous_holder": old.holder,
                "previous_epoch": old.epoch,
                "epoch": new.epoch,
            },
        )
        return ledger.append(receipt)

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
        if lease.released:
            # AID-2728 S7: lease devolvido não volta à vida por heartbeat.
            raise FactoryError(
                f"lease for {event_id} was released at {lease.released_at} "
                f"by {lease.holder} — heartbeat on a released lease is refused"
            )
        lease.heartbeat_at = utcnow()
        tmp = self._lease_path(event_id).with_suffix(".tmp")
        tmp.write_text(lease.to_json(), encoding="utf-8")
        os.replace(tmp, self._lease_path(event_id))
        return lease

    def release(self, event_id: str, holder_enforcement: bool = True) -> None:
        path = self._lease_path(event_id)
        if path.exists():
            if holder_enforcement:
                # only rewrite-to-released; physical removal keeps history simple.
                # AID-2728 S7: grava a representação legível pelo próprio modelo
                # (Lease.released_at) — Lease.from_json volta a funcionar.
                lease = self.lease_of(event_id)
                lease.released_at = utcnow()
                tmp = path.with_suffix(".tmp")
                tmp.write_text(lease.to_json(), encoding="utf-8")
                os.replace(tmp, path)
                return
            path.unlink(missing_ok=True)
