"""Regressão determinística X1 (AID-2757): double-claim em takeover de lease expirado.

Defeito (achado do retro-countersign AID-2753; pré-existente na base 43dd3e2e,
reproduzido na main 82e56f2b com 2/120 corridas): janela TOCTOU no caminho de
takeover de `factory/queue.py` `claim()` — `lease_expired` (1) e `lease_of` (2)
liam o lease velho expirado, `release(holder_enforcement=False)` (3) fazia
unlink não-atômico e o `continue` (4) reabria com O_CREAT|O_EXCL. P1 concluía
(1)-(4) e instaurava o lease novo; P2, que já tinha lido o lease velho em
(1)-(2), executava (3) e apagava o lease recém-instalado de P1 — o (4) de P2
também sucedia. Ambos retornavam a mesma época: dois holders vivos, mesma
época, recibo de takeover duplicado no ledger.

A correção atômica (AID-2748/AID-2725, PR #562) eliminou o unlink do caminho
de claim: decisão+swap correm sob lockfile O_CREAT|O_EXCL por evento e a troca
é um único `os.replace` — a janela (1)-(4) não existe mais na main. Este
módulo estabiliza o repro X1 como regressão:

- `test_x1_forced_toctou_window_single_winner`: **determinístico** — o
  interleaving exato do defeito é forçado por instrumentação (o perdedor bate
  na porta da decisão de takeover ENQUANTO o vencedor está estacionado entre a
  decisão e o swap), sem depender de sorte do agendador;
- `test_x1_barrier_race_120_rounds_zero_double_claims`: o repro X1 original
  (120 corridas, 0 double-claim) como corrida de barreira;
- `test_takeover_path_never_calls_release_unlink`: o caminho de takeover não
  pode reintroduzir `release()`/unlink.
"""

from __future__ import annotations

import sys
import threading
from contextlib import contextmanager
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from factory.ledger import RunLedger
from factory.model import WorkEvent
from factory.queue import EventQueue, LeaseHeldError
from factory.tests.test_p1_atomic_takeover import backdate_lease

WINDOW_TIMEOUT_S = 15.0


def fresh_queue(tmp: Path, tag: str) -> tuple[EventQueue, Path]:
    home = tmp / f"factory-{tag}"
    q = EventQueue(home)
    q.submit(WorkEvent(id="E1", origin="AID-2757", scope="x1 double-claim", risk="low"))
    return q, home


class TestX1ForcedToctouWindow:
    """X1 determinístico: o perdedor chega à porta da decisão de takeover
    ENQUANTO o vencedor está estacionado entre a decisão e o swap — o
    interleaving exato da janela do defeito, forçado por instrumentação —
    e ainda assim só há um vencedor."""

    def test_x1_forced_toctou_window_single_winner(self, tmp_path, monkeypatch):
        q, home = fresh_queue(tmp_path, "x1-forced")
        stale = q.claim("E1", holder="stale", ttl_seconds=1)
        backdate_lease(home, "E1")

        # Instrumentação (ver docstring da classe). O vencedor é estacionado
        # entre a decisão ("expirado") e o swap; o perdedor "bate na porta"
        # do lock nesse instante — no código vulnerável, esse era o momento
        # em que ele executaria o unlink do lease alheio.
        winner_at_decision = threading.Event()
        winner_inside = threading.Event()
        loser_knocked = threading.Event()
        state = {"lock_attempts": 0, "in_critical": 0, "max_in_critical": 0}
        guard = threading.Lock()
        winner_ident = []

        orig_is_expired = EventQueue._is_expired
        orig_claim_lock = EventQueue._claim_lock

        def hooked_is_expired(self, lease):
            expired = orig_is_expired(self, lease)
            if expired and lease.holder == "stale" and not winner_at_decision.is_set():
                winner_at_decision.set()
                assert loser_knocked.wait(WINDOW_TIMEOUT_S), (
                    "perdedor nunca bateu no lock do takeover — a janela X1 "
                    "não foi forçada (teste degradou para sequencial)"
                )
            return expired

        @contextmanager
        def hooked_claim_lock(self, event_id):
            with guard:
                state["lock_attempts"] += 1
            if winner_ident and threading.get_ident() not in winner_ident:
                loser_knocked.set()
            with orig_claim_lock(self, event_id):
                with guard:
                    state["in_critical"] += 1
                    state["max_in_critical"] = max(
                        state["max_in_critical"], state["in_critical"]
                    )
                if winner_ident and threading.get_ident() in winner_ident:
                    winner_inside.set()
                try:
                    yield
                finally:
                    with guard:
                        state["in_critical"] -= 1

        monkeypatch.setattr(EventQueue, "_is_expired", hooked_is_expired)
        monkeypatch.setattr(EventQueue, "_claim_lock", hooked_claim_lock)

        results: dict[str, object] = {}

        def winner_run() -> None:
            winner_ident.append(threading.get_ident())
            try:
                results["winner"] = q.claim(
                    "E1", holder="ctx-winner", ttl_seconds=3600
                )
            except BaseException as exc:  # noqa: BLE001 — contrato do teste
                results["winner_error"] = exc

        def loser_run() -> None:
            try:
                q.claim("E1", holder="ctx-loser", ttl_seconds=3600)
                results["loser_won"] = True
            except LeaseHeldError as exc:
                results["loser_error"] = str(exc)
            except BaseException as exc:  # noqa: BLE001 — contrato do teste
                results["loser_leak"] = exc

        t_win = threading.Thread(target=winner_run)
        t_win.start()
        assert winner_inside.wait(WINDOW_TIMEOUT_S), (
            "vencedor nunca entrou na seção crítica do takeover"
        )
        t_lose = threading.Thread(target=loser_run)
        t_lose.start()
        t_win.join(timeout=WINDOW_TIMEOUT_S + 5)
        t_lose.join(timeout=WINDOW_TIMEOUT_S + 5)
        assert not t_win.is_alive() and not t_lose.is_alive(), "threads não terminaram"

        # A janela foi realmente forçada (senão o teste não prova nada).
        assert winner_at_decision.is_set(), "vencedor nunca chegou à decisão de takeover"
        assert loser_knocked.is_set(), "perdedor nunca bateu no lock do takeover"

        # Exatamente um vencedor, época incrementada uma única vez.
        assert "winner" in results and "winner_error" not in results, results
        new = results["winner"]
        assert new.epoch == stale.epoch + 1 == 2
        assert new.holder == "ctx-winner"

        # Perdedor recebe erro tipado citando o lease FRESCO do vencedor —
        # prova de que a decisão dele rodou DEPOIS do swap, não sobre o velho.
        assert "loser_won" not in results, f"double-claim: {results}"
        assert "loser_leak" not in results, results
        assert "ctx-winner" in str(results["loser_error"])

        # Disco: lease único do vencedor, não-devolvido.
        final = q.lease_of("E1")
        assert (final.holder, final.epoch) == ("ctx-winner", 2)
        assert not final.released

        # Ledger: exatamente um recibo de takeover, cadeia íntegra.
        ledger_path = home / "ledger" / "run-E1.jsonl"
        assert ledger_path.read_text(encoding="utf-8").count('"takeover":true') == 1
        assert RunLedger(ledger_path).verify_chain()

        # Decisão+swap mutuamente exclusivos por construção.
        assert state["max_in_critical"] == 1, state
        assert state["lock_attempts"] >= 2, state
        assert not list((home / "leases").glob("*.claimlock")), "lockfile órfão"


class TestX1StabilizedRace:
    """Repro X1 original estabilizado: 120 corridas de barreira sobre lease
    expirado — 0 double-claims, 1 vencedor, época+1, recibo único."""

    def test_x1_barrier_race_120_rounds_zero_double_claims(self, tmp_path):
        leaks: list[str] = []
        for n in range(120):
            d = tmp_path / f"x1-race-{n}"
            q = EventQueue(d)
            q.submit(WorkEvent(id="E1", origin="AID-2757", scope="x1 race", risk="low"))
            first = q.claim("E1", holder="stale", ttl_seconds=1)
            backdate_lease(d, "E1")
            barrier = threading.Barrier(2)
            got: list[str] = []
            lock = threading.Lock()

            def racer(tag: str) -> None:
                barrier.wait()
                try:
                    q.claim("E1", holder=tag, ttl_seconds=3600)
                    with lock:
                        got.append(tag)
                except LeaseHeldError:
                    pass
                except BaseException as exc:  # noqa: BLE001 — vazamento do contrato
                    with lock:
                        leaks.append(f"r{n}:{tag}:{type(exc).__name__}")

            threads = [
                threading.Thread(target=racer, args=(f"ctx-{k}",)) for k in range(2)
            ]
            for t in threads:
                t.start()
            for t in threads:
                t.join()
            assert len(got) == 1, f"round {n}: double-claim — {len(got)} vencedores {got}"
            final = q.lease_of("E1")
            assert (final.holder, final.epoch) == (got[0], first.epoch + 1)
            ledger = (d / "ledger" / "run-E1.jsonl").read_text(encoding="utf-8")
            assert ledger.count('"takeover":true') == 1, f"round {n}: recibos != 1"
            assert RunLedger(d / "ledger" / "run-E1.jsonl").verify_chain()
            assert not list((d / "leases").glob("*.claimlock")), "lockfile órfão"
        assert not leaks, f"perdedores vazaram exceção fora do contrato: {leaks[:5]}"


class TestTakeoverNeverUnlinks:
    """O caminho de takeover não pode reintroduzir `release()`/unlink: com o
    método sabotado, o takeover precisa funcionar por completo (AID-2757)."""

    def test_takeover_path_never_calls_release_unlink(self, tmp_path, monkeypatch):
        q, home = fresh_queue(tmp_path, "x1-nounlink")
        q.claim("E1", holder="stale", ttl_seconds=1)
        backdate_lease(home, "E1")

        def release_must_not_run(self, event_id, holder_enforcement=True):
            raise AssertionError(
                "claim() voltou a chamar release() no caminho de takeover — "
                "regressão da janela unlink do AID-2757"
            )

        monkeypatch.setattr(EventQueue, "release", release_must_not_run)
        new = q.claim("E1", holder="ctx-b", ttl_seconds=3600)
        assert new.epoch == 2
        assert new.holder == "ctx-b"
        assert q.lease_of("E1").holder == "ctx-b"
