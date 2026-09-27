"""Regressões P1 de takeover atômico + perdedor sem crash (AID-2725/AID-2748).

Defeitos QA AID-2682 re-verificados first-hand na base corrente de `main`
(ae9db6fc, 2026-09-26): S3a perdedor de claim paralelo vazava
`JSONDecodeError`/`FileNotFoundError` (janela os.open→fdopen, lease vazio);
S3b 2 threads + barreira sobre lease expirado produziam 2 vencedores
(43/300 — janela decide-expirado + unlink incondicional + recurse sem
revalidar). S2 (zumbi até PROMOTED) já fechado pelas estações com fence
AID-2721; aqui vira regressão end-to-end pelo caminho real de takeover.

Correção (AID-2748): decisão+swap de takeover sob lockfile O_CREAT|O_EXCL
por evento; swap é um único `os.replace`; leitura do lease tolerante com
retry curto; perdedor sempre recebe erro tipado (`LeaseHeldError`).
"""

from __future__ import annotations

import json
import shutil
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from factory.coordinator import Coordinator, CoordinatorError
from factory.model import Lease, WorkEvent
from factory.queue import EventQueue, FactoryError, LeaseHeldError
from factory.tests.test_factory_poc import (
    AUTHOR, VERIFIER, make_product_repo, make_registry,
)

BUILD_CMD = (
    "git config user.email a@a && git config user.name A && "
    "echo hi > feature.txt && git add -A && git commit -qm feat"
)

PAST = "2026-01-01T00:00:00.000+00:00"


def backdate_lease(home: Path, event_id: str) -> Lease:
    """Envelhece o lease corrente preservando holder/época (expira sem reset)."""
    path = home / "leases" / f"{event_id}.json"
    lease = Lease.from_json(path.read_text(encoding="utf-8"))
    lease.acquired_at = PAST
    lease.heartbeat_at = PAST
    lease.ttl_seconds = 1
    path.write_text(lease.to_json(), encoding="utf-8")
    return lease


def fresh_queue(tmp: Path, tag: str) -> tuple[EventQueue, Path]:
    home = tmp / f"factory-{tag}"
    q = EventQueue(home)
    q.submit(WorkEvent(id="E1", origin="AID-2748", scope="atomic takeover", risk="low"))
    return q, home


class TestS3aLoserNeverCrashes:
    """S3a: perdedor de claim paralelo recebe `LeaseHeldError`, nunca
    `JSONDecodeError`/`OSError` — inclusive na janela lease vazio/parcial."""

    def test_claim_on_empty_lease_file_raises_typed_error(self, tmp_path):
        q, home = fresh_queue(tmp_path, "s3a-empty")
        (home / "leases" / "E1.json").write_text("", encoding="utf-8")
        with pytest.raises(LeaseHeldError, match="unreadable"):
            q.claim("E1", holder="ctx-loser")

    def test_claim_on_partial_json_lease_raises_typed_error(self, tmp_path):
        q, home = fresh_queue(tmp_path, "s3a-partial")
        (home / "leases" / "E1.json").write_text('{"event_id": "E1", "holde', encoding="utf-8")
        with pytest.raises(LeaseHeldError, match="unreadable"):
            q.claim("E1", holder="ctx-loser")

    def test_lease_of_unreadable_lease_fails_closed(self, tmp_path):
        q, home = fresh_queue(tmp_path, "s3a-of")
        (home / "leases" / "E1.json").write_text("not-json{", encoding="utf-8")
        with pytest.raises(FactoryError, match="unreadable"):
            q.lease_of("E1")

    def test_parallel_fresh_claim_single_winner_and_typed_losers(self, tmp_path):
        leaks: list[str] = []
        winners: list[int] = []
        for rnd in range(40):
            d = tmp_path / f"round-{rnd}"
            q = EventQueue(d)
            q.submit(WorkEvent(id="E1", origin="AID-2748", scope="contention", risk="low"))
            barrier = threading.Barrier(8)
            lock = threading.Lock()
            wins: list[str] = []

            def try_claim(i: int) -> None:
                barrier.wait()
                try:
                    q.claim("E1", holder=f"ctx-{i}")
                    with lock:
                        wins.append(f"ctx-{i}")
                except LeaseHeldError:
                    pass
                except Exception as exc:  # noqa: BLE001 — vazamento do contrato
                    with lock:
                        leaks.append(f"r{rnd}:ctx-{i}:{type(exc).__name__}")

            with ThreadPoolExecutor(max_workers=8) as ex:
                list(ex.map(try_claim, range(8)))
            winners.append(len(wins))
        assert not leaks, f"perdedores vazaram exceção fora do contrato: {leaks[:5]}"
        assert winners == [1] * 40


class TestS3bAtomicTakeover:
    """S3b: corrida de takeover sobre lease expirado — exatamente 1 vencedor,
    época incrementa uma única vez, recibo de takeover único e encadeado."""

    def _race(self, tmp: Path, tag: str, iters: int, nthreads: int) -> None:
        for n in range(iters):
            d = tmp / f"{tag}-iter-{n}"
            q = EventQueue(d)
            q.submit(WorkEvent(id="E1", origin="AID-2748", scope="takeover race", risk="low"))
            first = q.claim("E1", holder="stale", ttl_seconds=1)
            backdate_lease(d, "E1")
            barrier = threading.Barrier(nthreads)
            got: list[str] = []
            lock = threading.Lock()

            def racer(tag_id: str) -> None:
                barrier.wait()
                try:
                    q.claim("E1", holder=tag_id, ttl_seconds=3600)
                    with lock:
                        got.append(tag_id)
                except LeaseHeldError:
                    pass

            threads = [threading.Thread(target=racer, args=(f"ctx-{k}",))
                       for k in range(nthreads)]
            for t in threads:
                t.start()
            for t in threads:
                t.join()
            assert len(got) == 1, f"iter {n}: {len(got)} vencedores de takeover {got}"
            final = q.lease_of("E1")
            assert final.epoch == first.epoch + 1
            assert final.holder == got[0]
            ledger = (d / "ledger" / "run-E1.jsonl").read_text(encoding="utf-8")
            assert ledger.count('"takeover":true') == 1, f"iter {n}: recibos de takeover != 1"
            from factory.ledger import RunLedger
            assert RunLedger(d / "ledger" / "run-E1.jsonl").verify_chain()
            assert not list((d / "leases").glob("*.claimlock")), "lockfile órfão"

    def test_two_thread_barrier_race_has_single_winner(self, tmp_path):
        self._race(tmp_path, "s3b2", 60, 2)

    def test_four_thread_barrier_race_has_single_winner(self, tmp_path):
        self._race(tmp_path, "s3b4", 25, 4)

    def test_expired_lease_takeover_still_allowed_single_thread(self, tmp_path):
        q, home = fresh_queue(tmp_path, "s3b-solo")
        q.claim("E1", holder="stale", ttl_seconds=1)
        backdate_lease(home, "E1")
        new = q.claim("E1", holder="worker-b", ttl_seconds=3600)
        assert new.epoch == 2
        assert new.holder == "worker-b"


class TestS2ZombieFencedAfterRealTakeover:
    """S2 (regressão end-to-end): zumbi válido no congelamento/build perde o
    lease no meio do pipeline; takeover real via `claim`; prove/gate recusam o
    zumbi (holder/época) e ninguém promove a run órfã."""

    def _setup(self, tmp: Path) -> Coordinator:
        repo = make_product_repo(tmp)
        registry = make_registry(repo, "demo-1")
        home = tmp / "factory-home"
        coord = Coordinator(repo=repo, home=home, registry=registry)
        coord.intake(WorkEvent(id="FE-2", origin="AID-2748", scope="zombie", risk="low"))
        return coord

    def test_zombie_gate_fenced_after_takeover_post_verify(self, tmp_path):
        coord = self._setup(tmp_path)
        coord.queue.claim("FE-2", "ctx-zombie", ttl_seconds=600)
        coord.freeze("run-FE-2", "demo-1", "ctx-zombie")
        coord.build("run-FE-2", AUTHOR, BUILD_CMD)
        coord.prove("run-FE-2", VERIFIER)
        backdate_lease(coord.home, "FE-2")
        new = coord.queue.claim("FE-2", "ctx-worker-b", ttl_seconds=3600)
        assert new.epoch == 2
        with pytest.raises(CoordinatorError, match="held by ctx-worker-b"):
            coord.gate("run-FE-2", "ctx-coordinator")
        state = coord._load_state("run-FE-2")
        assert state["station"] == "verified"  # zumbi não promoveu
        assert not (coord._run_dir("run-FE-2") / "receipt.summary.json").exists()
        assert coord._ledger("run-FE-2").verify_chain()

    def test_zombie_prove_fenced_after_takeover_post_build(self, tmp_path):
        coord = self._setup(tmp_path)
        coord.queue.claim("FE-2", "ctx-zombie", ttl_seconds=600)
        coord.freeze("run-FE-2", "demo-1", "ctx-zombie")
        coord.build("run-FE-2", AUTHOR, BUILD_CMD)
        backdate_lease(coord.home, "FE-2")
        new = coord.queue.claim("FE-2", "ctx-worker-b", ttl_seconds=3600)
        assert new.epoch == 2
        with pytest.raises(CoordinatorError, match="held by ctx-worker-b"):
            coord.prove("run-FE-2", VERIFIER)
        with pytest.raises(CoordinatorError, match="not verified"):
            coord.gate("run-FE-2", "ctx-coordinator")
        assert coord._load_state("run-FE-2")["station"] == "built"

    def test_new_holder_cannot_hijack_frozen_run_either(self, tmp_path):
        coord = self._setup(tmp_path)
        coord.queue.claim("FE-2", "ctx-zombie", ttl_seconds=1)
        coord.freeze("run-FE-2", "demo-1", "ctx-zombie")
        coord.build("run-FE-2", AUTHOR, BUILD_CMD)
        backdate_lease(coord.home, "FE-2")
        coord.queue.claim("FE-2", "ctx-worker-b", ttl_seconds=3600)
        with pytest.raises(CoordinatorError, match="expected ctx-zombie"):
            coord.prove("run-FE-2", VERIFIER)
        assert coord._load_state("run-FE-2")["station"] == "built"

    def test_heartbeat_cannot_revert_takeover(self, tmp_path):
        q, home = fresh_queue(tmp_path, "hb")
        q.claim("E1", holder="ctx-zombie", ttl_seconds=1)
        backdate_lease(home, "E1")
        new = q.claim("E1", holder="ctx-worker-b", ttl_seconds=3600)
        q.heartbeat("E1")  # heartbeat tardio do zumbi não pode reverter o takeover
        after = q.lease_of("E1")
        assert after.holder == new.holder
        assert after.epoch == new.epoch
