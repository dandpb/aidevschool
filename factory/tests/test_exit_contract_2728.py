"""Regressões do contrato de saída do CLI (AID-2728, execução AID-2737).

Achados QA AID-2682 adaptados para `factory/tests/`:
- **S5b** — ledger com última linha truncada/não-JSON derrubava traceback
  `json.JSONDecodeError` exit 1. Contrato: veredito estruturado
  `chain_ok:false` (+ motivo da linha) e CLI `ledger --verify` sai 2.
- **S6a** — contrato congelado adulterado pós-prove derrubava traceback
  `ContractError` exit 1 no `gate`. Contrato: veredito block JSON (P4) + exit 2;
  estações capturam exceções do domínio com JSON de motivo + exit 2.
- **S7** — `release(holder_enforcement=True)` gravava lease que
  `Lease.from_json` rejeitava (`TypeError`). Contrato: representação de release
  legível; lease liberado ⇒ fail-closed estruturado (`FactoryError`/
  `CoordinatorError`), nunca `TypeError`.

Classe única (QA AID-2682): fail-closed por acidente — seguro no resultado,
fora do contrato na forma.
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from factory.coordinator import Coordinator, CoordinatorError
from factory.ledger import LedgerCorruptError, RunLedger, load_raw
from factory.model import Lease, Receipt, WorkEvent
from factory.queue import EventQueue, FactoryError, LeaseHeldError
from factory.tests.test_factory_poc import (
    AUTHOR, VERIFIER, make_product_repo, make_registry,
)

REPO_ROOT = Path(__file__).resolve().parents[2]

BUILD_CMD = (
    "git config user.email a@a && git config user.name A && "
    "echo hi > feature.txt && git add -A && git commit -qm feat"
)


def setup_run(tmp: Path, change_id: str = "demo-1", checks_cmd: str = "test -f feature.txt"):
    repo = make_product_repo(tmp)
    registry = make_registry(repo, change_id, checks_cmd)
    home = tmp / "factory-home"
    coord = Coordinator(repo=repo, home=home, registry=registry)
    coord.intake(WorkEvent(id="FE-1", origin="AID-2728", scope="exit-contract", risk="low"))
    coord.claim("FE-1", AUTHOR)
    return coord, repo, home, change_id


def setup_verified_run(tmp: Path):
    """Pipeline completo até `prove` — base para gate/ledger."""
    coord, repo, home, cid = setup_run(tmp)
    coord.freeze("run-FE-1", cid, AUTHOR)
    coord.build("run-FE-1", AUTHOR, BUILD_CMD)
    coord.prove("run-FE-1", VERIFIER)
    return coord, repo, home, cid


def factory_cli(home: Path, *args: str, repo: Path | None = None):
    env = {"PYTHONPATH": str(REPO_ROOT), "PATH": "/usr/bin:/bin:/usr/local/bin",
           "FACTORY_HOME": str(home), "HOME": str(home.parent)}
    return subprocess.run(
        [sys.executable, "-m", "factory", "--home", str(home),
         "--repo", str(repo if repo else REPO_ROOT), *args],
        cwd=str(REPO_ROOT), capture_output=True, text=True, timeout=120, env=env,
    )


# ---------------------------------------------------------------- S5b ----

class TestS5bMalformedLedgerLine:
    def _truncate_last_line(self, ledger_path: Path) -> None:
        lines = ledger_path.read_text(encoding="utf-8").splitlines()
        lines[-1] = lines[-1][: len(lines[-1]) // 2]
        ledger_path.write_text("\n".join(lines) + "\n", encoding="utf-8")

    def test_truncated_last_line_verify_chain_returns_false(self, tmp_path):
        coord, *_ = setup_verified_run(tmp_path)
        ledger_path = coord.home / "ledger" / "run-FE-1.jsonl"
        self._truncate_last_line(ledger_path)
        # Contrato: sem exceção — veredito False.
        assert RunLedger(ledger_path).verify_chain() is False

    def test_truncated_last_line_report_has_line_reason(self, tmp_path):
        coord, *_ = setup_verified_run(tmp_path)
        ledger_path = coord.home / "ledger" / "run-FE-1.jsonl"
        self._truncate_last_line(ledger_path)
        report = RunLedger(ledger_path).verify_report()
        assert report["chain_ok"] is False
        assert report["hashes_ok"] is False
        assert report["error"]["line"] == len(
            ledger_path.read_text(encoding="utf-8").splitlines()
        )
        assert "invalid JSON" in report["error"]["reason"]

    def test_non_json_line_report_structured(self, tmp_path):
        coord, *_ = setup_verified_run(tmp_path)
        ledger_path = coord.home / "ledger" / "run-FE-1.jsonl"
        lines = ledger_path.read_text(encoding="utf-8").splitlines()
        lines[1] = "not-json-at-all"
        ledger_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
        report = RunLedger(ledger_path).verify_report()
        assert report["chain_ok"] is False
        assert report["error"] == {"line": 2, "reason": "invalid JSON: Expecting value: line 1 column 1 (char 0)"}

    def test_read_and_load_raw_raise_ledger_corrupt_error(self, tmp_path):
        coord, *_ = setup_verified_run(tmp_path)
        ledger_path = coord.home / "ledger" / "run-FE-1.jsonl"
        self._truncate_last_line(ledger_path)
        n_lines = len(ledger_path.read_text(encoding="utf-8").splitlines())
        with pytest.raises(LedgerCorruptError) as exc:
            RunLedger(ledger_path).read()
        assert exc.value.line_no == n_lines
        with pytest.raises(LedgerCorruptError):
            load_raw(ledger_path)

    def test_snapshot_is_structured_not_traceback(self, tmp_path):
        coord, *_ = setup_verified_run(tmp_path)
        ledger_path = coord.home / "ledger" / "run-FE-1.jsonl"
        self._truncate_last_line(ledger_path)
        snap = RunLedger(ledger_path).snapshot()
        assert snap["chain_ok"] is False
        assert snap["station"] == "unreadable"
        assert snap["error"]["line"] == len(
            ledger_path.read_text(encoding="utf-8").splitlines()
        )

    def test_cli_verify_truncated_ledger_exits_2_with_json(self, tmp_path):
        coord, repo, home, cid = setup_verified_run(tmp_path)
        ledger_path = home / "ledger" / "run-FE-1.jsonl"
        self._truncate_last_line(ledger_path)
        proc = factory_cli(home, "ledger", "FE-1", "--verify", repo=repo)
        assert proc.returncode == 2, (proc.stdout, proc.stderr)
        payload = json.loads(proc.stdout)
        assert payload["chain_ok"] is False
        assert payload["error"]["line"] == len(
            ledger_path.read_text(encoding="utf-8").splitlines()
        )
        assert "invalid JSON" in payload["error"]["reason"]
        # Zero traceback: stderr só pode carregar o motivo estruturado.
        assert "Traceback" not in proc.stderr

    def test_cli_verify_non_json_line_exits_2_with_json(self, tmp_path):
        coord, repo, home, cid = setup_verified_run(tmp_path)
        ledger_path = home / "ledger" / "run-FE-1.jsonl"
        lines = ledger_path.read_text(encoding="utf-8").splitlines()
        lines[-1] = "}{garbage"
        ledger_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
        proc = factory_cli(home, "ledger", "FE-1", "--verify", repo=repo)
        assert proc.returncode == 2, (proc.stdout, proc.stderr)
        assert json.loads(proc.stdout)["chain_ok"] is False
        assert "Traceback" not in proc.stderr

    def test_cli_list_corrupt_ledger_exits_2_with_json_reason(self, tmp_path):
        coord, repo, home, cid = setup_verified_run(tmp_path)
        ledger_path = home / "ledger" / "run-FE-1.jsonl"
        self._truncate_last_line(ledger_path)
        proc = factory_cli(home, "ledger", "FE-1", repo=repo)
        assert proc.returncode == 2, (proc.stdout, proc.stderr)
        payload = json.loads(proc.stderr)
        assert payload["error"] == "LedgerCorruptError"
        assert f"line {len(ledger_path.read_text(encoding='utf-8').splitlines())}" in payload["reason"]
        assert "Traceback" not in proc.stderr

    def test_cli_verify_healthy_ledger_still_exits_0(self, tmp_path):
        coord, repo, home, cid = setup_verified_run(tmp_path)
        proc = factory_cli(home, "ledger", "FE-1", "--verify", repo=repo)
        assert proc.returncode == 0, (proc.stdout, proc.stderr)
        payload = json.loads(proc.stdout)
        assert payload["chain_ok"] is True
        assert payload["hashes_ok"] is True


# ---------------------------------------------------------------- S6a ----

class TestS6aTamperedFrozenContract:
    def _tamper_frozen_plan(self, home: Path) -> None:
        plan = home / "runs" / "run-FE-1" / "contract" / "plan.md"
        plan.write_text(
            plan.read_text(encoding="utf-8").replace("Status: approved", "Status: approved (tampered)"),
            encoding="utf-8",
        )

    def test_gate_returns_block_decision_not_exception(self, tmp_path):
        coord, repo, home, cid = setup_verified_run(tmp_path)
        self._tamper_frozen_plan(home)
        decision = coord.gate("run-FE-1", "ctx-coordinator")  # não pode explodir
        assert decision.verdict == "block"
        assert any("P4" in r and "frozen contract diverges" in r for r in decision.reasons)
        # Block persistiu estado + recibo (falha e retry não apagam histórico).
        assert coord._load_state("run-FE-1")["station"] == "blocked"
        assert coord._ledger("run-FE-1").find("blocked")

    def test_cli_gate_tampered_contract_exits_2_with_block_json(self, tmp_path):
        coord, repo, home, cid = setup_verified_run(tmp_path)
        self._tamper_frozen_plan(home)
        proc = factory_cli(home, "gate", "FE-1", "--context", "ctx-coordinator", repo=repo)
        assert proc.returncode == 2, (proc.stdout, proc.stderr)
        payload = json.loads(proc.stdout)
        assert payload["verdict"] == "block"
        assert any("P4" in r for r in payload["reasons"])
        assert "Traceback" not in proc.stderr

    def test_cli_freeze_domain_error_is_json_exit_2(self, tmp_path):
        coord, repo, home, cid = setup_run(tmp_path)
        proc = factory_cli(home, "freeze", "FE-1", "--change-id", "missing-change",
                           "--context", AUTHOR, repo=repo)
        assert proc.returncode == 2, (proc.stdout, proc.stderr)
        payload = json.loads(proc.stderr)
        assert payload["error"] == "ContractError"
        assert "no versioned registry" in payload["reason"]
        assert "Traceback" not in proc.stderr

    def test_cli_prove_domain_error_is_json_exit_2(self, tmp_path):
        coord, repo, home, cid = setup_run(tmp_path)
        proc = factory_cli(home, "prove", "FE-1", "--context", VERIFIER, repo=repo)
        assert proc.returncode == 2, (proc.stdout, proc.stderr)
        payload = json.loads(proc.stderr)
        assert payload["error"] == "CoordinatorError"
        assert "Traceback" not in proc.stderr

    def test_cli_build_block_behavior_unchanged_exit_2(self, tmp_path):
        """Sem regressão: build com comando de autor falhando continua exit 2."""
        coord, repo, home, cid = setup_run(tmp_path)
        coord.freeze("run-FE-1", cid, AUTHOR)
        proc = factory_cli(home, "build", "FE-1", "--context", AUTHOR,
                           "--cmd", "exit 3", repo=repo)
        assert proc.returncode == 2, (proc.stdout, proc.stderr)
        assert "BLOCKED" in proc.stderr

    def test_cli_claim_held_behavior_unchanged_exit_2(self, tmp_path):
        """Sem regressão: segundo claim continua block P1 + exit 2."""
        coord, repo, home, cid = setup_run(tmp_path)
        proc = factory_cli(home, "claim", "FE-1", "--context", "ctx-second", repo=repo)
        assert proc.returncode == 2, (proc.stdout, proc.stderr)
        assert "BLOCKED (P1)" in proc.stderr


# ----------------------------------------------------------------- S7 ----

class TestS7ReleasedLeaseReadable:
    def test_release_then_lease_of_roundtrips(self, tmp_path):
        home = tmp_path / "home"
        q = EventQueue(home)
        q.submit(WorkEvent(id="FE-1", origin="AID-2728", scope="s7", risk="low"))
        q.claim("FE-1", holder="ctx-a")
        q.release("FE-1", holder_enforcement=True)
        lease = q.lease_of("FE-1")  # antes: TypeError
        assert lease.released is True
        assert lease.released_at is not None
        assert lease.holder == "ctx-a"
        # Roundtrip do modelo preserva a representação legível.
        again = Lease.from_json(lease.to_json())
        assert again.released_at == lease.released_at

    def test_heartbeat_on_released_lease_fails_closed(self, tmp_path):
        home = tmp_path / "home"
        q = EventQueue(home)
        q.submit(WorkEvent(id="FE-1", origin="AID-2728", scope="s7", risk="low"))
        q.claim("FE-1", holder="ctx-a")
        q.release("FE-1", holder_enforcement=True)
        with pytest.raises(FactoryError) as exc:
            q.heartbeat("FE-1")
        assert "released" in str(exc.value)
        # Heartbeat não resurrect: released_at permanece.
        assert q.lease_of("FE-1").released is True

    def test_claim_on_released_lease_fails_closed_not_typeerror(self, tmp_path):
        home = tmp_path / "home"
        q = EventQueue(home)
        q.submit(WorkEvent(id="FE-1", origin="AID-2728", scope="s7", risk="low"))
        q.claim("FE-1", holder="ctx-a")
        q.release("FE-1", holder_enforcement=True)
        with pytest.raises(LeaseHeldError) as exc:
            q.claim("FE-1", holder="ctx-b")
        assert "released" in str(exc.value)
        assert "re-intake" in str(exc.value)

    def test_station_fence_refuses_released_lease(self, tmp_path):
        coord, repo, home, cid = setup_verified_run(tmp_path)
        coord.queue.release("FE-1", holder_enforcement=True)
        with pytest.raises(CoordinatorError) as exc:
            coord.gate("run-FE-1", "ctx-coordinator")
        assert "released" in str(exc.value)
        # Nenhuma transição nova no ledger após o fence.
        assert not coord._ledger("run-FE-1").find("promoted")

    def test_takeover_after_expiry_still_works(self, tmp_path):
        """Expiração + takeover (AID-2721) não é bloqueado pela semântica de release."""
        home = tmp_path / "home"
        q = EventQueue(home)
        q.submit(WorkEvent(id="FE-1", origin="AID-2728", scope="s7", risk="low"))
        q.claim("FE-1", holder="ctx-a")
        # Simula expiração: heartbeat velho + ttl curto.
        lease_path = home / "leases" / "FE-1.json"
        data = json.loads(lease_path.read_text(encoding="utf-8"))
        data["ttl_seconds"] = 0
        lease_path.write_text(json.dumps(data), encoding="utf-8")
        lease = q.claim("FE-1", holder="ctx-b")  # takeover
        assert lease.epoch == 2
        assert q.lease_of("FE-1").holder == "ctx-b"

    def test_active_lease_roundtrip_keeps_working(self, tmp_path):
        home = tmp_path / "home"
        q = EventQueue(home)
        q.submit(WorkEvent(id="FE-1", origin="AID-2728", scope="s7", risk="low"))
        lease = q.claim("FE-1", holder="ctx-a")
        assert q.lease_of("FE-1").released is False
        beat = q.heartbeat("FE-1")
        assert beat.heartbeat_at >= lease.heartbeat_at
