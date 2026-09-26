"""Regressão do túmulo de lease legível (AID-2762).

Achado QA AID-2759 (countersign PR #533), preexistente na base 82e56f2b:
`EventQueue.release(event_id)` (holder_enforcement=True, default) regravava o
lease acrescentando a chave `released_at` fora do schema; `Lease.from_json`
fazia `cls(**json.loads(text))` e levantava `TypeError` em toda leitura
posterior (`lease_of`/`claim`/`lease_expired`). Correção: `released_at` é
campo first-class do `Lease` e `from_json` ignora chaves desconhecidas
(leitura tolerante). Semântica documentada no factory/README.md: lease
liberado vira túmulo legível — o item NÃO volta para `pending()`; novo
`claim` dentro do TTL → `LeaseHeldError`; após expiração → takeover com
época incrementada e recibo no ledger.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from factory.ledger import RunLedger
from factory.model import Lease, WorkEvent
from factory.queue import EventQueue, LeaseHeldError


def _aged_tombstone_text(path: Path) -> str:
    """Envelhece o lease liberado preservando holder/época/released_at."""
    lease = Lease.from_json(path.read_text(encoding="utf-8"))
    lease.acquired_at = "2026-01-01T00:00:00.000+00:00"
    lease.heartbeat_at = "2026-01-01T00:00:00.000+00:00"
    lease.ttl_seconds = 1
    return lease.to_json()


class TestReleasedLeaseIsReadableTombstone:
    """Repro AID-2762: liberar o lease não pode envenenar leituras futuras."""

    def test_claim_after_release_raises_leaseheld_not_typeerror(self, tmp_path):
        q = EventQueue(tmp_path)
        q.submit(WorkEvent(id="E1", origin="t", scope="t", risk="low"))
        q.claim("E1", "holder-a")
        q.release("E1")  # holder_enforcement=True (default)
        with pytest.raises(LeaseHeldError, match="leased by holder-a"):
            q.claim("E1", "holder-b")  # antes do fix: TypeError (released_at)

    def test_lease_of_reads_tombstone_with_released_at(self, tmp_path):
        q = EventQueue(tmp_path)
        q.submit(WorkEvent(id="E1", origin="t", scope="t", risk="low"))
        q.claim("E1", "holder-a")
        q.release("E1")
        tomb = q.lease_of("E1")  # antes do fix: TypeError
        assert tomb.holder == "holder-a"
        assert tomb.released_at is not None
        assert not q.lease_expired("E1")  # heartbeat fresco, dentro do TTL

    def test_released_event_stays_out_of_pending(self, tmp_path):
        q = EventQueue(tmp_path)
        q.submit(WorkEvent(id="E1", origin="t", scope="t", risk="low"))
        q.claim("E1", "holder-a")
        q.release("E1")
        assert [e.id for e in q.pending()] == []  # túmulo mantém item fora da fila


class TestTakeoverOnExpiredTombstone:
    """Túmulo expirado segue o caminho de takeover (época incrementa, recibo)."""

    def test_claim_after_tombstone_expiry_takes_over_with_epoch(self, tmp_path):
        q = EventQueue(tmp_path)
        q.submit(WorkEvent(id="E9", origin="t", scope="t", risk="low"))
        first = q.claim("E9", "holder-a")
        q.release("E9")
        path = tmp_path / "leases" / "E9.json"
        path.write_text(_aged_tombstone_text(path), encoding="utf-8")
        assert q.lease_expired("E9")
        second = q.claim("E9", "holder-b")  # antes do fix: TypeError no caminho
        assert second.epoch == first.epoch + 1
        assert second.holder == "holder-b"
        assert second.released_at is None  # lease novo, sem túmulo
        receipts = RunLedger(tmp_path / "ledger" / "run-E9.jsonl").read()
        assert receipts and receipts[0].detail.get("takeover") is True
        assert receipts[0].detail["previous_holder"] == "holder-a"


class TestTolerantFromJson:
    """Leitura tolerante: chaves desconhecidas não envenenam o leitor."""

    def test_unknown_keys_are_ignored(self, tmp_path):
        q = EventQueue(tmp_path)
        q.submit(WorkEvent(id="E1", origin="t", scope="t", risk="low"))
        path = tmp_path / "leases" / "E1.json"
        path.write_text(
            '{"event_id":"E1","holder":"x","future_field":1,"epoch":7}',
            encoding="utf-8",
        )
        lease = q.lease_of("E1")  # antes do fix: TypeError (qualquer chave extra)
        assert lease.holder == "x"
        assert lease.epoch == 7
        assert not hasattr(lease, "future_field")

    def test_legacy_lease_without_released_at_still_parses(self, tmp_path):
        text = Lease(event_id="E1", holder="legacy").to_json()
        assert '"released_at"' in text  # campo serializa (null quando ausente)
        lease = Lease.from_json(text)
        assert lease.released_at is None


class TestUnenforcedReleaseStillUnlinks:
    """Caminho do takeover interno (holder_enforcement=False) inalterado."""

    def test_release_without_enforcement_removes_file(self, tmp_path):
        q = EventQueue(tmp_path)
        q.submit(WorkEvent(id="E1", origin="t", scope="t", risk="low"))
        q.claim("E1", "holder-a")
        q.release("E1", holder_enforcement=False)
        assert not (tmp_path / "leases" / "E1.json").exists()
        assert [e.id for e in q.pending()] == ["E1"]  # sem túmulo, volta à fila
