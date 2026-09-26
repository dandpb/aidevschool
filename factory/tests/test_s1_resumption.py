"""Regressões S1 de retomada idempotente por estação (AID-2726 / AID-2735).

Adaptado dos charters S1a/S1b/S1d do stress QA AID-2682
(`/paperclip/w2726sm/stress/s1a_kill_freeze.py`, `s1b_kill_build.py`,
`s1cd_kill_prove_gate.py`): kill físico no meio de uma estação não pode travar
a run — o retry da estação converge sem intervenção manual (write-ahead no
freeze; worktree reclamado no build; resumo regenerado no gate). Fencing
(AID-2721) permanece fail-closed em todas as reentradas.
"""

from __future__ import annotations

import json
import os
import signal
import subprocess
import sys
import time
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from factory.contract import load_from_registry
from factory.coordinator import Coordinator, CoordinatorError
from factory.model import WorkEvent
from factory.tests.test_factory_poc import (
    AUTHOR, VERIFIER, make_product_repo, make_registry,
)

BUILD_CMD = (
    "git config user.email a@a && git config user.name A && "
    "echo hi > feature.txt && git add -A && git commit -qm feat"
)


def setup_claimed(tmp: Path, change_id: str = "demo-1"):
    repo = make_product_repo(tmp)
    registry = make_registry(repo, change_id)
    home = tmp / "factory-home"
    coord = Coordinator(repo=repo, home=home, registry=registry)
    coord.intake(WorkEvent(id="FE-1", origin="AID-2726", scope="resumption", risk="low"))
    coord.claim("FE-1", AUTHOR)
    return coord, repo, registry, home


class TestS1aKillDuringFreeze:
    """S1a: kill físico na janela do freeze não pode travar a run."""

    def test_kill_on_first_save_then_retry_freeze_converges(self, tmp_path):
        # repro QA: monkeypatch _save_state -> os._exit(9). Com o write-ahead,
        # o primeiro save é ANTES dos efeitos: a vítima morre sem persistir
        # nada — nada de contract dir órfão, nada de state parcial.
        coord, repo, registry, home = setup_claimed(tmp_path)
        victim = (
            "import os, sys\n"
            f"sys.path.insert(0, {str(repo)!r})\n"
            "from factory import coordinator as C\n"
            "def die(self, run_id, state):\n"
            "    os._exit(9)\n"
            "C.Coordinator._save_state = die\n"
            "c = C.Coordinator(**%r)\n"
            "c.freeze('run-FE-1', 'demo-1', %r)\n"
        ) % ({"repo": str(repo), "home": str(home), "registry": str(registry)}, AUTHOR)
        p = subprocess.run([sys.executable, "-c", victim],
                           capture_output=True, text=True, timeout=60)
        assert p.returncode == 9  # morte física simulada
        run_dir = home / "runs" / "run-FE-1"
        assert not (run_dir / "contract").exists()
        assert not (run_dir / "state.json").exists()
        # retry converge: freeze → contracted → status/resume funcionam
        contract = coord.freeze("run-FE-1", "demo-1", AUTHOR)
        assert contract.digest
        assert coord._load_state("run-FE-1")["station"] == "contracted"
        assert coord.status("run-FE-1")["ledger"]["chain_ok"]
        assert coord.resume("run-FE-1") == "contracted"

    def test_kill_after_writeahead_partial_contract_dir_is_refrozen(self, tmp_path):
        # kill entre o write-ahead e o fim de Contract.freeze: state=freezing
        # persistido + contract dir parcial no disco.
        coord, repo, registry, home = setup_claimed(tmp_path)
        victim = (
            "import os, sys\n"
            f"sys.path.insert(0, {str(repo)!r})\n"
            "from factory import coordinator as C\n"
            "from factory.contract import Contract\n"
            "def die(self, run_dir):\n"
            "    target = run_dir / 'contract'\n"
            "    target.mkdir(parents=True, exist_ok=True)\n"
            "    (target / 'intent.md').write_text('partial', encoding='utf-8')\n"
            "    os._exit(9)\n"
            "Contract.freeze = die\n"
            "c = C.Coordinator(**%r)\n"
            "c.freeze('run-FE-1', 'demo-1', %r)\n"
        ) % ({"repo": str(repo), "home": str(home), "registry": str(registry)}, AUTHOR)
        p = subprocess.run([sys.executable, "-c", victim],
                           capture_output=True, text=True, timeout=60)
        assert p.returncode == 9
        run_dir = home / "runs" / "run-FE-1"
        assert (run_dir / "state.json").exists()
        assert coord._load_state("run-FE-1")["station"] == "freezing"
        assert (run_dir / "contract" / "intent.md").exists()  # parcial
        # retry converge: reclaim do parcial + recongelamento completo
        contract = coord.freeze("run-FE-1", "demo-1", AUTHOR)
        assert coord._load_state("run-FE-1")["station"] == "contracted"
        assert contract.digest == coord._load_state("run-FE-1")["contract_digest"]
        assert (run_dir / "contract" / "contract.lock.json").exists()
        assert coord._ledger("run-FE-1").verify_chain()
        # e a run segue o pipeline normalmente até promoted
        coord.build("run-FE-1", AUTHOR, BUILD_CMD)
        coord.prove("run-FE-1", VERIFIER)
        assert coord.gate("run-FE-1", "ctx-coordinator").ok

    def test_legacy_orphan_contract_dir_without_state_is_reclaimed(self, tmp_path):
        # estado travado da ordem ANTIGA de escritas (contract dir, sem state)
        coord, repo, registry, home = setup_claimed(tmp_path)
        base = subprocess.run(["git", "-C", str(repo), "rev-parse", "HEAD"],
                              capture_output=True, text=True).stdout.strip()
        load_from_registry(registry, "demo-1", base).freeze(coord._run_dir("run-FE-1"))
        assert not coord._state_path("run-FE-1").exists()
        # retry converge: órfão reclamado e recongelado com state válido
        coord.freeze("run-FE-1", "demo-1", AUTHOR)
        state = coord._load_state("run-FE-1")
        assert state["station"] == "contracted"
        assert state["attempts"] == 1
        assert coord._ledger("run-FE-1").verify_chain()

    def test_reentry_at_contracted_backfills_missing_receipt(self, tmp_path):
        # kill entre state=contracted e o append: reentrada devolve o contrato
        # e completa o recibo (acrécimo marcado, sem duplicar depois).
        coord, repo, registry, home = setup_claimed(tmp_path)
        coord.freeze("run-FE-1", "demo-1", AUTHOR)
        (home / "ledger" / "run-FE-1.jsonl").unlink()  # recibo perdido no kill
        again = coord.freeze("run-FE-1", "demo-1", AUTHOR)
        receipts = coord._ledger("run-FE-1").read()
        assert again.digest == coord._load_state("run-FE-1")["contract_digest"]
        assert [r.station_to for r in receipts] == ["contracted"]
        assert receipts[0].detail.get("backfill") is True
        coord.freeze("run-FE-1", "demo-1", AUTHOR)  # idempotente: não duplica
        assert len(coord._ledger("run-FE-1").read()) == 1
        assert coord._ledger("run-FE-1").verify_chain()

    def test_reentry_refuses_different_change_id(self, tmp_path):
        coord, repo, registry, home = setup_claimed(tmp_path)
        coord.freeze("run-FE-1", "demo-1", AUTHOR)
        with pytest.raises(CoordinatorError, match="already contracted"):
            coord.freeze("run-FE-1", "other-change", AUTHOR)

    def test_freeze_refuses_station_beyond_freezing(self, tmp_path):
        coord, repo, registry, home = setup_claimed(tmp_path)
        coord.freeze("run-FE-1", "demo-1", AUTHOR)
        coord.build("run-FE-1", AUTHOR, BUILD_CMD)
        with pytest.raises(CoordinatorError, match="at built"):
            coord.freeze("run-FE-1", "demo-1", AUTHOR)


class TestS1bKillDuringBuild:
    """S1b: SIGKILL com autor em execução não pode deixar worktree órfão."""

    def test_real_sigkill_then_retry_build_converges(self, tmp_path):
        coord, repo, registry, home = setup_claimed(tmp_path)
        coord.freeze("run-FE-1", "demo-1", AUTHOR)
        victim = (
            "import sys\n"
            f"sys.path.insert(0, {str(repo)!r})\n"
            "from factory.coordinator import Coordinator\n"
            "c = Coordinator(**%r)\n"
            "c.build('run-FE-1', %r, 'sleep 60')\n"
        ) % ({"repo": str(repo), "home": str(home), "registry": str(registry)}, AUTHOR)
        proc = subprocess.Popen([sys.executable, "-c", victim],
                                stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        worktree = home / "worktrees" / "run-FE-1"
        deadline = time.monotonic() + 30
        while time.monotonic() < deadline and not worktree.exists():
            time.sleep(0.1)
        assert worktree.exists(), "vítima deveria ter criado o worktree"
        os.kill(proc.pid, signal.SIGKILL)
        proc.communicate(timeout=30)
        assert proc.returncode == -9
        # retry converge: worktree reclamado e recriado, sem GitError
        state = coord.build("run-FE-1", AUTHOR, BUILD_CMD)
        assert state["station"] == "built"
        assert state["build_sha"] != state.get("base_sha")
        head = subprocess.run(["git", "-C", str(worktree), "rev-parse", "HEAD"],
                              capture_output=True, text=True).stdout.strip()
        assert head == state["build_sha"]
        assert coord._ledger("run-FE-1").verify_chain()

    def test_create_worktree_is_idempotent_on_existing_dir(self, tmp_path):
        repo = make_product_repo(tmp_path)
        base = subprocess.run(["git", "-C", str(repo), "rev-parse", "HEAD"],
                              capture_output=True, text=True).stdout.strip()
        from factory.gitwork import create_worktree
        wt = tmp_path / "factory-home" / "worktrees" / "run-X"
        create_worktree(repo, base, wt)
        (wt / "leftover.txt").write_text("tentativa morta\n", encoding="utf-8")
        create_worktree(repo, base, wt)  # reclaim + recria
        assert not (wt / "leftover.txt").exists()
        head = subprocess.run(["git", "-C", str(wt), "rev-parse", "HEAD"],
                              capture_output=True, text=True).stdout.strip()
        assert head == base

    def test_create_worktree_prunes_stale_registration(self, tmp_path):
        # diretório apagado sem desregistro: `worktree add` falharia com
        # "already registered" sem o prune.
        import shutil as _shutil
        repo = make_product_repo(tmp_path)
        base = subprocess.run(["git", "-C", str(repo), "rev-parse", "HEAD"],
                              capture_output=True, text=True).stdout.strip()
        from factory.gitwork import create_worktree
        wt = tmp_path / "factory-home" / "worktrees" / "run-X"
        create_worktree(repo, base, wt)
        _shutil.rmtree(wt)  # deixa só o registro stale
        create_worktree(repo, base, wt)
        assert wt.exists()
        head = subprocess.run(["git", "-C", str(wt), "rev-parse", "HEAD"],
                              capture_output=True, text=True).stdout.strip()
        assert head == base


class TestS1dKillDuringGate:
    """S1d: kill no gate não pode perder o receipt.summary."""

    def _setup_verified(self, tmp: Path):
        coord, repo, registry, home = setup_claimed(tmp)
        coord.freeze("run-FE-1", "demo-1", AUTHOR)
        coord.build("run-FE-1", AUTHOR, BUILD_CMD)
        coord.prove("run-FE-1", VERIFIER)
        return coord, repo, registry, home

    def test_kill_between_summary_and_state_then_retry_converges(self, tmp_path):
        # write-order: resumo ANTES do state — a vítima morre com a run ainda
        # `verified` e o resumo presente; o retry re-avalia e promove.
        coord, repo, registry, home = self._setup_verified(tmp_path)
        victim = (
            "import os, sys\n"
            f"sys.path.insert(0, {str(repo)!r})\n"
            "from factory import coordinator as C\n"
            "def die(self, run_id, state):\n"
            "    os._exit(9)\n"
            "C.Coordinator._save_state = die\n"
            "c = C.Coordinator(**%r)\n"
            "c.gate('run-FE-1', 'ctx-coordinator')\n"
        ) % {"repo": str(repo), "home": str(home), "registry": str(registry)}
        p = subprocess.run([sys.executable, "-c", victim],
                           capture_output=True, text=True, timeout=120)
        assert p.returncode == 9
        run_dir = home / "runs" / "run-FE-1"
        assert coord._load_state("run-FE-1")["station"] == "verified"
        assert (run_dir / "receipt.summary.json").exists()
        # retry converge: gate re-avalia, promove e regrava o resumo
        decision = coord.gate("run-FE-1", "ctx-coordinator")
        assert decision.ok
        assert coord._load_state("run-FE-1")["station"] == "promoted"
        summary = json.loads((run_dir / "receipt.summary.json").read_text(encoding="utf-8"))
        assert summary["verdict"] == "promote"
        assert summary["run_id"] == "run-FE-1"
        assert coord._ledger("run-FE-1").verify_chain()

    def test_promoted_without_summary_is_regenerated(self, tmp_path):
        # legado da ordem antiga: promoted sem resumo → gate regenera
        coord, repo, registry, home = self._setup_verified(tmp_path)
        coord.gate("run-FE-1", "ctx-coordinator")
        summary_path = coord._run_dir("run-FE-1") / "receipt.summary.json"
        summary_before = json.loads(summary_path.read_text(encoding="utf-8"))
        summary_path.unlink()
        receipts_before = len(coord._ledger("run-FE-1").read())
        decision = coord.gate("run-FE-1", "ctx-coordinator")  # antes: erro fatal
        assert decision.ok
        summary_after = json.loads(summary_path.read_text(encoding="utf-8"))
        assert summary_after["verdict"] == "promote"
        assert summary_after["run_id"] == summary_before["run_id"]
        assert summary_after["sha"] == summary_before["sha"]
        # sem duplicar recibos de promoção
        assert len([r for r in coord._ledger("run-FE-1").read()
                    if r.station_to == "promoted"]) == 1
        assert len(coord._ledger("run-FE-1").read()) == receipts_before

    def test_promoted_with_summary_is_idempotent(self, tmp_path):
        coord, repo, registry, home = self._setup_verified(tmp_path)
        first = coord.gate("run-FE-1", "ctx-coordinator")
        entries = coord._ledger("run-FE-1").read()
        second = coord.gate("run-FE-1", "ctx-coordinator")
        assert second.verdict == first.verdict == "promote"
        assert coord._ledger("run-FE-1").read() == entries  # ledger intacto

    def test_promoted_without_promotion_receipt_fails_closed(self, tmp_path):
        coord, repo, registry, home = self._setup_verified(tmp_path)
        coord.gate("run-FE-1", "ctx-coordinator")
        (coord._run_dir("run-FE-1") / "receipt.summary.json").unlink()
        (home / "ledger" / "run-FE-1.jsonl").unlink()
        with pytest.raises(CoordinatorError, match="no promotion receipt"):
            coord.gate("run-FE-1", "ctx-coordinator")
