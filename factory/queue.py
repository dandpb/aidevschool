"""Fila de eventos + lease exclusivo (P1).

Intake cria o evento (ID, origem, risco) de forma atômica: tmp único por
escritor + `os.link` create-if-absent (semântica O_CREAT|O_EXCL) — o arquivo
da fila só fica visível com o payload completo, reenvio idêntico é idempotente
e payload divergente (concorrente OU sequencial) levanta `FactoryError`
(AID-2727/AID-2731). `claim` reserva o item com criação
atômica (O_CREAT|O_EXCL): um segundo agente que tente assumir o mesmo item
recebe `LeaseHeldError` — dois agentes nunca assumem o mesmo item. Reenvio do
mesmo evento não duplica execução: o evento é idempotente por ID e o lease é
a única porta de entrada para uma run. O lease carrega um fencing token
(`epoch`): takeover pós-expiração incrementa a época, grava recibo no ledger
encadeado e invalida writers da época anterior (AID-2718/AID-2721).

Takeover é atômico (AID-2725): a decisão expirou→troca corre sob um lockfile
O_CREAT|O_EXCL por evento, e a troca em si é um único `os.replace` — exatamente
um vencedor, nunca dois (S3b). O perdedor de claim paralelo recebe erro tipado
(`LeaseHeldError`/`FactoryError`), nunca `JSONDecodeError`/`OSError`: leituras
do arquivo de lease toleram a janela transitória vazio/ausente com retry curto
(S3a). Limites: concorrência intra-host.
"""

from __future__ import annotations

import errno
import json
import os
import time
import uuid
from contextlib import contextmanager
from pathlib import Path

from .ledger import RunLedger
from .model import Lease, Receipt, WorkEvent, utcnow

LEASE_READ_ATTEMPTS = 40
LEASE_READ_BACKOFF_S = 0.005
CLAIM_LOCK_STALE_S = 10.0
CLAIM_LOCK_TIMEOUT_S = 30.0


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
        # Intake atômico (AID-2727/AID-2731): publica create-if-absent. O tmp é
        # único por escritor (<id>.<pid>.<uuid>.tmp) e `os.link` é atômico — o
        # arquivo da fila só fica visível já com o payload completo (semântica
        # O_EXCL sem janela de leitura parcial), então um perdedor concorrente
        # sempre relê um evento íntegro para decidir idempotência/divergência.
        tmp = self.queue_dir / f"{event.id}.{os.getpid()}.{uuid.uuid4().hex[:8]}.tmp"
        try:
            with open(tmp, "w", encoding="utf-8") as fh:
                fh.write(event.to_json())
            try:
                os.link(tmp, path)
            except FileExistsError:
                existing = WorkEvent.from_json(path.read_text(encoding="utf-8"))
                existing_created = existing.created_at
                existing.created_at = event.created_at  # campo volátil: fora da igualdade
                same = existing.to_json() == event.to_json()
                existing.created_at = existing_created
                if same:
                    return existing  # reenvio idempotente (mesma identidade)
                raise FactoryError(f"event id {event.id} already exists with different payload")
            return event
        finally:
            tmp.unlink(missing_ok=True)

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

    def _read_lease(self, path: Path) -> Lease | None:
        """Leitura tolerante (AID-2725 S3a): entre `os.open` e o fechamento do
        fd do vencedor, ou entre unlink e recriação, o arquivo pode aparecer
        vazio/ausente por instantes — retry curto em vez de propagar
        `JSONDecodeError`/`FileNotFoundError` para fora do contrato."""
        for _ in range(LEASE_READ_ATTEMPTS):
            try:
                text = path.read_text(encoding="utf-8")
            except OSError:  # incluindo FileNotFoundError durante a disputa
                text = ""
            if text.strip():
                try:
                    return Lease.from_json(text)
                except (ValueError, TypeError, KeyError):
                    pass  # gravação parcial: a próxima tentativa vê o arquivo completo
            time.sleep(LEASE_READ_BACKOFF_S)
        return None

    @contextmanager
    def _claim_lock(self, event_id: str):
        """Serializa decisão+swap de takeover (AID-2725 S3b): lockfile
        O_CREAT|O_EXCL por evento; locks órfãos de processo morto no meio da
        seção crítica são roubáveis após `CLAIM_LOCK_STALE_S`."""
        lock_path = self.lease_dir / f"{event_id}.claimlock"
        deadline = time.monotonic() + CLAIM_LOCK_TIMEOUT_S
        while True:
            try:
                fd = os.open(lock_path, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o644)
                break
            except FileExistsError:
                try:
                    age = time.time() - lock_path.stat().st_mtime
                except FileNotFoundError:
                    age = 0.0
                if age > CLAIM_LOCK_STALE_S:
                    try:
                        lock_path.unlink()
                    except FileNotFoundError:
                        pass
                elif time.monotonic() > deadline:
                    raise FactoryError(
                        f"claim lock for {event_id} contended beyond "
                        f"{CLAIM_LOCK_TIMEOUT_S}s"
                    )
                time.sleep(0.005)
        try:
            os.close(fd)
            yield
        finally:
            try:
                lock_path.unlink()
            except FileNotFoundError:
                pass

    def claim(self, event_id: str, holder: str, ttl_seconds: int = 3600) -> Lease:
        self.get(event_id)  # unknown event -> FactoryError
        path = self._lease_path(event_id)
        while True:
            # Fencing (P1, AID-2718/AID-2721): takeover pós-expiração incrementa
            # a época; writers da época anterior são recusados nas estações.
            lease = Lease(event_id=event_id, holder=holder,
                          ttl_seconds=ttl_seconds, epoch=1)
            try:
                fd = os.open(path, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o644)
            except FileExistsError:
                with self._claim_lock(event_id):
                    held = self._read_lease(path)
                    if held is None:
                        if path.exists():
                            # fail-closed tipado: lease ilegível não autoriza takeover
                            raise LeaseHeldError(
                                f"event {event_id} lease is unreadable — takeover refused"
                            )
                        continue  # lease sumiu na disputa: volta a tentar criar
                    if not self._is_expired(held):
                        raise LeaseHeldError(
                            f"event {event_id} is leased by {held.holder} "
                            f"since {held.acquired_at}"
                        )
                    # Takeover atômico (AID-2725 S3b): decisão+swap sob o lock —
                    # exatamente um vencedor; não existe mais unlink+recria.
                    takeover = Lease(event_id=event_id, holder=holder,
                                     ttl_seconds=ttl_seconds, epoch=held.epoch + 1)
                    tmp = self.lease_dir / f"{event_id}.takeover"
                    with open(tmp, "w", encoding="utf-8") as fh:
                        fh.write(takeover.to_json())
                    os.replace(tmp, path)
                    self._record_takeover(event_id, held, takeover)
                    return takeover
            with os.fdopen(fd, "w", encoding="utf-8") as fh:
                fh.write(lease.to_json())
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
        lease = self._read_lease(path)
        if lease is None:
            raise FactoryError(f"lease for {event_id} is unreadable")
        return lease

    def has_lease(self, event_id: str) -> bool:
        return self._lease_path(event_id).exists()

    def _is_expired(self, lease: Lease) -> bool:
        import datetime as dt

        acquired = dt.datetime.fromisoformat(lease.heartbeat_at)
        return (dt.datetime.now(dt.timezone.utc) - acquired).total_seconds() > lease.ttl_seconds

    def lease_expired(self, event_id: str) -> bool:
        try:
            lease = self.lease_of(event_id)
        except FactoryError:
            return False
        return self._is_expired(lease)

    def heartbeat(self, event_id: str) -> Lease:
        # read-modify-write sob o claim lock (AID-2725): sem ele, um heartbeat
        # defasado poderia reverter um takeover recém-trocado via os.replace.
        with self._claim_lock(event_id):
            lease = self.lease_of(event_id)
            lease.heartbeat_at = utcnow()
            tmp = self._lease_path(event_id).with_suffix(".tmp")
            tmp.write_text(lease.to_json(), encoding="utf-8")
            os.replace(tmp, self._lease_path(event_id))
        return lease

    def release(self, event_id: str, holder_enforcement: bool = True) -> None:
        path = self._lease_path(event_id)
        if not path.exists():
            return
        if holder_enforcement:
            # only rewrite-to-released; physical removal keeps history simple
            with self._claim_lock(event_id):
                lease = self._read_lease(path)
                if lease is None:
                    raise FactoryError(f"lease for {event_id} is unreadable")
                data = json.loads(lease.to_json())
                data["released_at"] = utcnow()
                tmp = path.with_suffix(".released.tmp")
                tmp.write_text(json.dumps(data, sort_keys=True), encoding="utf-8")
                os.replace(tmp, path)
            return
        path.unlink(missing_ok=True)
