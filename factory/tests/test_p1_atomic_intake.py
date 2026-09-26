"""Regressões P1 de intake atômico (AID-2727 / AID-2731).

Adaptado dos achados X2/S4 do stress QA AID-2682:
- X2: `test_x2_concurrent_divergent_intake` em `/paperclip/w2710qa/stress/test_stress_qa.py`
- S4: `s4_intake_race.py` em `/paperclip/w2716/stress/`

`queue.submit` publica o arquivo da fila de forma create-if-absent atômica
(tmp único por escritor + `os.link`): sob concorrência com payloads
divergentes para o mesmo id novo vale exatamente 1 aceite + 1
`FactoryError` — nunca aceite duplo silencioso (last-writer-wins) e nunca
`FileNotFoundError`/leitura parcial no perdedor. Reenvio idêntico
(sequencial ou concorrente) permanece idempotente; divergência sequencial
segue rejeitada.
"""

from __future__ import annotations

import shutil
import sys
import threading
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from factory.model import WorkEvent
from factory.queue import EventQueue, FactoryError


def divergent_pair(event_id: str = "FE-R"):
    return (
        WorkEvent(id=event_id, origin="AID-2731", scope="payload-X", risk="low"),
        WorkEvent(id=event_id, origin="AID-2731", scope="payload-Y", risk="low"),
    )


def run_pair(q: EventQueue, ev_x: WorkEvent, ev_y: WorkEvent):
    """2 threads + barreira: ambos entram no submit juntos; classifica saídas."""
    barrier = threading.Barrier(2)
    outcomes: dict[str, str] = {}
    lock = threading.Lock()

    def submit(tag: str, ev: WorkEvent) -> None:
        try:
            barrier.wait(timeout=10)
            returned = q.submit(ev)
            with lock:
                outcomes[tag] = f"ok:{returned.scope}"
        except FactoryError as exc:
            with lock:
                outcomes[tag] = f"factory_error:{exc}"
        except Exception as exc:  # noqa: BLE001 — fora do contrato é defeito
            with lock:
                outcomes[tag] = f"off_contract:{type(exc).__name__}:{exc}"

    t1 = threading.Thread(target=submit, args=("X", ev_x))
    t2 = threading.Thread(target=submit, args=("Y", ev_y))
    t1.start()
    t2.start()
    t1.join(timeout=30)
    t2.join(timeout=30)
    return outcomes


class TestSequentialContract:
    """S4-seq: sequencial idêntico idempotente; divergente rejeita."""

    def test_identical_resubmit_is_idempotent(self, tmp_path):
        q = EventQueue(tmp_path)
        ev, _ = divergent_pair("D")
        first = q.submit(ev)
        second = q.submit(WorkEvent(id="D", origin="AID-2731", scope="payload-X", risk="low"))
        assert first.id == second.id == "D"
        assert second.created_at == first.created_at  # retorna existing, não o reenvio

    def test_divergent_resubmit_raises(self, tmp_path):
        q = EventQueue(tmp_path)
        ev_x, ev_y = divergent_pair("D")
        q.submit(ev_x)
        with pytest.raises(FactoryError, match="already exists with different payload"):
            q.submit(ev_y)
        assert q.get("D").scope == "payload-X"  # disco intocado


class TestConcurrentDivergentSingleShot:
    """X2 (adaptado): uma rodada sincronizada por barreira, asserts exatos."""

    def test_exactly_one_accept_one_factory_error(self, tmp_path):
        q = EventQueue(tmp_path)
        ev_x, ev_y = divergent_pair("FE-X")
        outcomes = run_pair(q, ev_x, ev_y)

        oks = [tag for tag, out in outcomes.items() if out.startswith("ok:")]
        errs = [tag for tag, out in outcomes.items() if out.startswith("factory_error:")]
        off = [out for out in outcomes.values() if out.startswith("off_contract:")]

        assert not off, f"exceção fora do contrato no intake concorrente: {off}"
        assert len(outcomes) == 2
        assert len(oks) == 1, f"esperado exatamente 1 aceite, veio {outcomes}"
        assert len(errs) == 1, f"esperado exatamente 1 FactoryError, veio {outcomes}"

        winner_scope = outcomes[oks[0]].split(":", 1)[1]
        on_disk = q.get("FE-X").scope
        assert on_disk == winner_scope, (
            f"sucesso retornado ({winner_scope!r}) != payload persistido ({on_disk!r})"
        )
        assert q.pending()[0].id == "FE-X"

    def test_no_tmp_left_behind(self, tmp_path):
        q = EventQueue(tmp_path)
        ev_x, ev_y = divergent_pair("FE-X")
        run_pair(q, ev_x, ev_y)
        leftovers = [p.name for p in q.queue_dir.glob("*.tmp")]
        assert leftovers == [], f"tmps residuais na fila: {leftovers}"


class TestConcurrentDivergentStress:
    """S4 (adaptado): 200 rodadas concorrentes divergentes, contagem estrita."""

    ROUNDS = 200

    def test_200_rounds_no_double_accept_no_crash(self, tmp_path):
        home = tmp_path / "s4-race"
        silent_double = 0
        off_contract = 0
        wrong_pair = 0
        for n in range(self.ROUNDS):
            d = home / f"iter-{n}"
            if d.exists():
                shutil.rmtree(d)
            q = EventQueue(d)
            ev_x, ev_y = divergent_pair("R")
            outcomes = run_pair(q, ev_x, ev_y)
            oks = [out for out in outcomes.values() if out.startswith("ok:")]
            errs = [out for out in outcomes.values() if out.startswith("factory_error:")]
            off = [out for out in outcomes.values() if out.startswith("off_contract:")]
            if off:
                off_contract += 1
            elif len(oks) == 2:
                silent_double += 1
            elif not (len(oks) == 1 and len(errs) == 1):
                wrong_pair += 1
            else:
                on_disk = q.get("R").scope
                if on_disk != oks[0].split(":", 1)[1]:
                    wrong_pair += 1
        assert silent_double == 0, (
            f"{silent_double}/{self.ROUNDS} rodadas aceitaram payloads divergentes "
            "concorrentes sem erro (TOCTOU reintroduzido)"
        )
        assert off_contract == 0, (
            f"{off_contract}/{self.ROUNDS} rodadas com exceção fora do contrato "
            "(FileNotFoundError/leitura parcial no tmp compartilhado)"
        )
        assert wrong_pair == 0, (
            f"{wrong_pair}/{self.ROUNDS} rodadas sem o par exato 1 aceite + 1 FactoryError"
        )


class TestConcurrentIdenticalIdempotent:
    """Bônus: reenvio idêntico concorrente não diverge — todos idempotentes."""

    def test_same_payload_both_return_existing(self, tmp_path):
        q = EventQueue(tmp_path)
        barrier = threading.Barrier(2)
        results: list[str] = []
        lock = threading.Lock()

        def submit(ev: WorkEvent) -> None:
            try:
                barrier.wait(timeout=10)
                ret = q.submit(ev)
                with lock:
                    results.append(ret.created_at)
            except Exception as exc:  # noqa: BLE001
                with lock:
                    results.append(f"err:{type(exc).__name__}")

        ev = WorkEvent(id="SAME", origin="AID-2731", scope="payload-X", risk="low")
        t1 = threading.Thread(target=submit, args=(ev,))
        t2 = threading.Thread(target=submit, args=(ev,))
        t1.start()
        t2.start()
        t1.join(timeout=30)
        t2.join(timeout=30)

        assert len(results) == 2 and all(not r.startswith("err:") for r in results), results
        assert results[0] == results[1], "reenvio idêntico retornou identidades distintas"
        assert q.get("SAME").scope == "payload-X"
