"""Regressões P1 de fencing de lease nas estações (AID-2718 / AID-2721).

Adaptado dos achados X3/X3b do stress QA AID-2682
(`/paperclip/w2710qa/stress/test_stress_qa.py`): holder obsoleto cujo lease
foi tomado por terceiro (a) ou removido por completo (b) não pode provar nem
promover. Fail-closed: `CoordinatorError`, sem transição no ledger, sem
promote. Takeover pós-expiração incrementa a época e deixa recibo encadeado.
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from factory.coordinator import Coordinator, CoordinatorError
from factory.ledger import RunLedger
from factory.model import Lease, WorkEvent
from factory.queue import EventQueue
from factory.tests.test_factory_poc import (
    AUTHOR, VERIFIER, make_product_repo, make_registry,
)

BUILD_CMD = (
    "git config user.email a@a && git config user.name A && "
    "echo hi > feature.txt && git add -A && git commit -qm feat"
)


def setup_fenced_run(tmp: Path):
    repo = make_product_repo(tmp)
    registry = make_registry(repo, "demo-1")
    home = tmp / "factory-home"
    coord = Coordinator(repo=repo, home=home, registry=registry)
    coord.intake(WorkEvent(id="FE-1", origin="AID-2721", scope="stress", risk="low"))
    coord.claim("FE-1", AUTHOR)
    coord.freeze("run-FE-1", "demo-1", AUTHOR)
    coord.build("run-FE-1", AUTHOR, BUILD_CMD)
    return coord, home


def ledger_entries(coord: Coordinator, run_id: str = "run-FE-1"):
    return coord._ledger(run_id).read()


class TestX3StationsFenceOnTakeover:
    """X3: lease tomado por terceiro após expiração (holder divergente)."""

    def test_prove_refused_when_lease_held_by_newcomer(self, tmp_path):
        coord, home = setup_fenced_run(tmp_path)
        (home / "leases" / "FE-1.json").write_text(
            Lease(event_id="FE-1", holder="ctx-newcomer", ttl_seconds=600).to_json(),
            encoding="utf-8",
        )
        before = ledger_entries(coord)
        with pytest.raises(CoordinatorError, match="held by ctx-newcomer"):
            coord.prove("run-FE-1", VERIFIER)
        # fail-closed: nenhuma transição nova, estação intacta
        assert ledger_entries(coord) == before
        assert coord._load_state("run-FE-1")["station"] == "built"

    def test_gate_refused_when_lease_held_by_newcomer(self, tmp_path):
        coord, home = setup_fenced_run(tmp_path)
        coord.prove("run-FE-1", VERIFIER)
        (home / "leases" / "FE-1.json").write_text(
            Lease(event_id="FE-1", holder="ctx-newcomer", ttl_seconds=600).to_json(),
            encoding="utf-8",
        )
        with pytest.raises(CoordinatorError, match="held by ctx-newcomer"):
            coord.gate("run-FE-1", "ctx-coordinator")
        state = coord._load_state("run-FE-1")
        assert state["station"] == "verified"  # não promoveu
        assert not (coord._run_dir("run-FE-1") / "receipt.summary.json").exists()


class TestX3bStationsFenceOnMissingLease:
    """X3b: ausência total de lease não pode passar pelo gate."""

    def test_prove_refused_without_any_lease(self, tmp_path):
        coord, home = setup_fenced_run(tmp_path)
        (home / "leases" / "FE-1.json").unlink()
        before = ledger_entries(coord)
        with pytest.raises(CoordinatorError, match="no lease for FE-1"):
            coord.prove("run-FE-1", VERIFIER)
        assert ledger_entries(coord) == before

    def test_gate_refused_without_any_lease(self, tmp_path):
        coord, home = setup_fenced_run(tmp_path)
        coord.prove("run-FE-1", VERIFIER)
        (home / "leases" / "FE-1.json").unlink()
        with pytest.raises(CoordinatorError, match="no lease for FE-1"):
            coord.gate("run-FE-1", "ctx-coordinator")
        assert coord._load_state("run-FE-1")["station"] == "verified"


class TestExpiredLeaseIsFenced:
    """Lease vivo no papel do holder antigo, mas expirado, também bloqueia."""

    def test_stations_refuse_expired_lease(self, tmp_path):
        coord, home = setup_fenced_run(tmp_path)
        stale = Lease(
            event_id="FE-1", holder=AUTHOR, ttl_seconds=1,
            acquired_at="2026-01-01T00:00:00.000+00:00",
            heartbeat_at="2026-01-01T00:00:00.000+00:00",
        )
        (home / "leases" / "FE-1.json").write_text(stale.to_json(), encoding="utf-8")
        with pytest.raises(CoordinatorError, match="expired"):
            coord.prove("run-FE-1", VERIFIER)


class TestTakeoverEpochAndLedgerReceipt:
    """Takeover legítimo: época incrementa, writers velhos recusados, recibo
    encadeado persistido."""

    def _expired_lease(self, holder: str) -> Lease:
        return Lease(
            event_id="FE-9", holder=holder, ttl_seconds=1,
            acquired_at="2026-01-01T00:00:00.000+00:00",
            heartbeat_at="2026-01-01T00:00:00.000+00:00",
        )

    def _age_lease(self, home: Path, event_id: str) -> None:
        """Envelhece o lease corrente preservando holder/época (expira sem reset)."""
        path = home / "leases" / f"{event_id}.json"
        lease = Lease.from_json(path.read_text(encoding="utf-8"))
        lease.acquired_at = "2026-01-01T00:00:00.000+00:00"
        lease.heartbeat_at = "2026-01-01T00:00:00.000+00:00"
        lease.ttl_seconds = 1
        path.write_text(lease.to_json(), encoding="utf-8")

    def test_takeover_increments_epoch_and_appends_chained_receipt(self, tmp_path):
        repo = make_product_repo(tmp_path)
        home = tmp_path / "factory-home"
        q = EventQueue(home)
        q.submit(WorkEvent(id="FE-9", origin="AID-2721", scope="stress"))
        (home / "leases" / "FE-9.json").write_text(
            self._expired_lease("dead-worker").to_json(), encoding="utf-8")
        first = q.claim("FE-9", "worker-a")
        assert first.epoch == 2  # takeover sobre época 1
        self._age_lease(home, "FE-9")  # expira preservando época 2
        second = q.claim("FE-9", "worker-b")
        assert second.epoch == 3
        ledger = RunLedger(home / "ledger" / "run-FE-9.jsonl")
        receipts = ledger.read()
        assert [r.detail.get("takeover") for r in receipts] == [True, True]
        assert receipts[0].detail["previous_holder"] == "dead-worker"
        assert receipts[1].detail["epoch"] == 3
        assert receipts[1].prev_hash == receipts[0].hash
        assert ledger.verify_chain()

    def test_old_epoch_writer_is_refused_at_station(self, tmp_path):
        coord, home = setup_fenced_run(tmp_path)
        # lease expira e terceiro toma legitimamente via claim: época 1 -> 2
        self._age_lease(home, "FE-1")
        coord.queue.claim("FE-1", "ctx-newcomer")  # takeover: epoch 1 -> 2
        # adversário reescreve o holder de volta; a época entregou o takeover
        lease = Lease.from_json((home / "leases" / "FE-1.json").read_text(encoding="utf-8"))
        lease.holder = AUTHOR
        (home / "leases" / "FE-1.json").write_text(lease.to_json(), encoding="utf-8")
        with pytest.raises(CoordinatorError, match="epoch"):
            coord.prove("run-FE-1", VERIFIER)
        takeover_receipts = [
            r for r in ledger_entries(coord) if r.detail.get("takeover")
        ]
        assert takeover_receipts, "takeover deve deixar recibo no ledger do run"
        assert takeover_receipts[0].detail["previous_holder"] == AUTHOR
        assert coord._ledger("run-FE-1").verify_chain()


class TestHappyPathWithFence:
    """Fence ativo não atrapalha a run legítima do holder vivo."""

    def test_full_run_of_holder_still_promotes(self, tmp_path):
        coord, home = setup_fenced_run(tmp_path)
        result = coord.prove("run-FE-1", VERIFIER)
        assert result.all_passed
        decision = coord.gate("run-FE-1", "ctx-coordinator")
        assert decision.ok, decision.reasons
        state = coord._load_state("run-FE-1")
        assert state["station"] == "promoted"
        assert state["lease_holder"] == AUTHOR
        assert state["lease_epoch"] == 1
