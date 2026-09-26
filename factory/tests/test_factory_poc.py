"""Critérios de saída da POC (HTML §04): cada afirmação tem seu caso
negativo — "um gate só é confiável se recusar uma prova enganosa".

Fixture: repo git temporário (produto de mentira) + FACTORY_HOME em tmp.
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from factory.coordinator import Coordinator
from factory.gate import evaluate
from factory.gitwork import TreeState
from factory.ledger import RunLedger
from factory.model import Proof, Receipt, WorkEvent
from factory.queue import EventQueue, LeaseHeldError
from factory.verify import VerifyResult

AUTHOR = "ctx-author-run1"
VERIFIER = "ctx-verifier-run1"


def _git(repo: Path, *args: str) -> str:
    proc = subprocess.run(["git", "-C", str(repo), *args], capture_output=True, text=True)
    assert proc.returncode == 0, proc.stderr
    return proc.stdout


def make_product_repo(tmp: Path) -> Path:
    repo = tmp / "product"
    repo.mkdir()
    _git(repo, "init", "-q", "-b", "main")
    _git(repo, "config", "user.email", "demo@example.com")
    _git(repo, "config", "user.name", "Demo")
    (repo / "app.txt").write_text("v1\n", encoding="utf-8")
    _git(repo, "add", "-A")
    _git(repo, "commit", "-q", "-m", "base")
    return repo


def make_registry(repo: Path, change_id: str, checks_cmd: str = "test -f feature.txt") -> Path:
    reg = repo / "intent" / change_id
    reg.mkdir(parents=True)
    (reg / "intent.md").write_text("# Intent\n\nStatus: accepted\n", encoding="utf-8")
    (reg / "spec.md").write_text("# Spec\n", encoding="utf-8")
    (reg / "plan.md").write_text("# Plan\n\nStatus: approved\n", encoding="utf-8")
    (reg / "checks.md").write_text(
        f"# Checks\n\n```\nC1 | profile=cheap | {checks_cmd}\n"
        f"C2 | profile=standard | test -s app.txt\n```\n",
        encoding="utf-8",
    )
    return repo / "intent"


def setup_run(tmp: Path, change_id: str = "demo-1", checks_cmd: str = "test -f feature.txt"):
    repo = make_product_repo(tmp)
    registry = make_registry(repo, change_id, checks_cmd)
    home = tmp / "factory-home"
    coord = Coordinator(repo=repo, home=home, registry=registry)
    event = WorkEvent(id="FE-1", origin="AID-2676", scope="demo", risk="low")
    coord.intake(event)
    run_id = coord.claim("FE-1", AUTHOR)
    return coord, repo, run_id, change_id


class TestP1Lease:
    def test_second_agent_cannot_claim_same_item(self, tmp_path):
        coord, repo, run_id, cid = setup_run(tmp_path)
        with pytest.raises(LeaseHeldError) as exc:
            coord.queue.claim("FE-1", holder="ctx-second-agent")
        assert "leased by" in str(exc.value)

    def test_event_resend_is_idempotent(self, tmp_path):
        coord, repo, run_id, cid = setup_run(tmp_path)
        again = coord.intake(WorkEvent(id="FE-1", origin="AID-2676", scope="demo", risk="low"))
        assert again.to_json() == coord.queue.get("FE-1").to_json()
        assert len(list((coord.home / "queue").glob("*.json"))) == 1


class TestP2Proofs:
    def test_failing_check_blocks(self, tmp_path):
        coord, repo, run_id, cid = setup_run(tmp_path, checks_cmd="test -f missing.txt")
        coord.freeze(run_id, cid, AUTHOR)
        coord.build(run_id, AUTHOR, "echo hi > feature.txt; git add -A; git commit -qm feat")
        result = coord.prove(run_id, VERIFIER)
        assert not result.all_passed
        decision = coord.gate(run_id, "ctx-coordinator")
        assert decision.verdict == "block"
        assert any("P2: check C1 failed" in r for r in decision.reasons)

    def test_check_without_proof_does_not_pass(self, tmp_path):
        coord, repo, run_id, cid = setup_run(tmp_path)
        contract = coord.freeze(run_id, cid, AUTHOR)
        coord.build(run_id, AUTHOR, "echo hi > feature.txt; git add -A; git commit -qm feat")
        coord.prove(run_id, VERIFIER)
        # Sabota as provas: apaga os outputs arquivados -> digest sem arquivo.
        for f in (coord._run_dir(run_id) / "proofs").glob("*.output.txt"):
            f.write_text("tampered\n", encoding="utf-8")
        decision = coord.gate(run_id, "ctx-coordinator")
        assert decision.verdict == "block"
        assert any("digest mismatch" in r or "missing" in r for r in decision.reasons)


class TestP3DistinctContexts:
    def test_same_context_author_and_verifier_is_refused(self, tmp_path):
        coord, repo, run_id, cid = setup_run(tmp_path)
        coord.freeze(run_id, cid, AUTHOR)
        coord.build(run_id, AUTHOR, "echo hi > feature.txt; git add -A; git commit -qm feat")
        coord.prove(run_id, AUTHOR)  # mesmo contexto assinando build e veredito
        decision = coord.gate(run_id, "ctx-coordinator")
        assert decision.verdict == "block"
        assert any("P3" in r for r in decision.reasons)


class TestP4ShaAndTree:
    def test_sha_drift_between_build_and_verify_blocks(self, tmp_path):
        coord, repo, run_id, cid = setup_run(tmp_path)
        coord.freeze(run_id, cid, AUTHOR)
        coord.build(run_id, AUTHOR, "echo hi > feature.txt; git add -A; git commit -qm feat")
        # Autor commita DEPOIS do recibo de build (worktree avança sozinho).
        state = coord._load_state(run_id)
        wt = Path(state["worktree"])
        _git(wt, "commit", "-q", "--allow-empty", "-m", "drift")
        coord.prove(run_id, VERIFIER)
        decision = coord.gate(run_id, "ctx-coordinator")
        assert decision.verdict == "block"
        assert any("P4: sha drifted" in r for r in decision.reasons)

    def test_untracked_file_appearing_after_build_blocks(self, tmp_path):
        coord, repo, run_id, cid = setup_run(tmp_path)
        coord.freeze(run_id, cid, AUTHOR)
        coord.build(run_id, AUTHOR, "echo hi > feature.txt; git add -A; git commit -qm feat")
        state = coord._load_state(run_id)
        (Path(state["worktree"]) / "stray-artifact.txt").write_text("x", encoding="utf-8")
        result = coord.prove(run_id, VERIFIER)
        decision = coord.gate(run_id, "ctx-coordinator")
        assert decision.verdict == "block"
        assert any("untracked files changed" in r for r in decision.reasons)

    def test_contract_divergence_blocks(self, tmp_path):
        coord, repo, run_id, cid = setup_run(tmp_path)
        coord.freeze(run_id, cid, AUTHOR)
        coord.build(run_id, AUTHOR, "echo hi > feature.txt; git add -A; git commit -qm feat")
        coord.prove(run_id, VERIFIER)
        # Registro versionado muda DEPOIS do congelamento -> digest diverge.
        (repo / "intent" / cid / "checks.md").write_text(
            "# Checks\n\n```\nC1 | profile=cheap | true\n```\n", encoding="utf-8"
        )
        decision = coord.gate(run_id, "ctx-coordinator")
        assert decision.verdict == "block"
        assert any("contract digest drifted" in r for r in decision.reasons)


class TestP5PrHead:
    def test_pr_head_mismatch_is_refused(self, tmp_path):
        coord, repo, run_id, cid = setup_run(tmp_path)
        coord.freeze(run_id, cid, AUTHOR)
        coord.build(run_id, AUTHOR, "echo hi > feature.txt; git add -A; git commit -qm feat")
        coord.prove(run_id, VERIFIER)
        decision = coord.gate(run_id, "ctx-coordinator", pr_head_sha="0" * 40)
        assert decision.verdict == "block"
        assert any("P5" in r for r in decision.reasons)

    def test_pr_head_matching_verified_sha_promotes(self, tmp_path):
        coord, repo, run_id, cid = setup_run(tmp_path)
        coord.freeze(run_id, cid, AUTHOR)
        coord.build(run_id, AUTHOR, "echo hi > feature.txt; git add -A; git commit -qm feat")
        result = coord.prove(run_id, VERIFIER)
        decision = coord.gate(run_id, "ctx-coordinator", pr_head_sha=result.sha)
        assert decision.ok, decision.reasons


class TestLedger:
    def test_chain_detects_tampering(self, tmp_path):
        path = tmp_path / "ledger.jsonl"
        ledger = RunLedger(path)
        ledger.append(Receipt(seq=1, run_id="r", station_from="queued",
                              station_to="contracted", actor_role="coordinator",
                              context_id="c1"))
        ledger.append(Receipt(seq=2, run_id="r", station_from="contracted",
                              station_to="built", actor_role="author",
                              context_id="c1"))
        assert ledger.verify_chain()
        lines = path.read_text().splitlines()
        receipt = json.loads(lines[0])
        receipt["detail"] = {"sneaky": True}
        lines[0] = json.dumps(receipt, sort_keys=True, separators=(",", ":"))
        path.write_text("\n".join(lines) + "\n", encoding="utf-8")
        assert not RunLedger(path).verify_chain()

    def test_seq_must_continue(self, tmp_path):
        ledger = RunLedger(tmp_path / "l.jsonl")
        ledger.append(Receipt(seq=1, run_id="r", station_from="a", station_to="b",
                              actor_role="coordinator", context_id="c"))
        with pytest.raises(Exception):
            ledger.append(Receipt(seq=5, run_id="r", station_from="b", station_to="c",
                                  actor_role="coordinator", context_id="c"))


class TestE2E:
    def test_full_pipeline_promotes_and_history_survives(self, tmp_path):
        coord, repo, run_id, cid = setup_run(tmp_path)
        coord.freeze(run_id, cid, AUTHOR)
        coord.build(run_id, AUTHOR, "echo hi > feature.txt; git add -A; git commit -qm feat")
        result = coord.prove(run_id, VERIFIER)
        assert result.all_passed
        decision = coord.gate(run_id, "ctx-coordinator")
        assert decision.ok, decision.reasons
        status = coord.status(run_id)
        assert status["state"]["station"] == "promoted"
        assert status["ledger"]["chain_ok"]
        # Falha/retry não apaga histórico: recibos continuam no ledger.
        station = coord.resume(run_id)
        assert station == "promoted"
        assert len(coord._ledger(run_id).read()) >= 4

    def test_resume_after_interruption_continues_from_station(self, tmp_path):
        coord, repo, run_id, cid = setup_run(tmp_path)
        coord.freeze(run_id, cid, AUTHOR)
        # "Crash" após contrato: novo processo só chama resume + build.
        assert coord.resume(run_id) == "contracted"
        coord.build(run_id, AUTHOR, "echo hi > feature.txt; git add -A; git commit -qm feat")
        coord.prove(run_id, VERIFIER)
        assert coord.gate(run_id, "ctx-coordinator").ok

    def test_blocked_run_spawns_retry_event_and_keeps_receipts(self, tmp_path):
        coord, repo, run_id, cid = setup_run(tmp_path, checks_cmd="test -f missing.txt")
        coord.freeze(run_id, cid, AUTHOR)
        coord.build(run_id, AUTHOR, "echo hi > feature.txt; git add -A; git commit -qm feat")
        coord.prove(run_id, VERIFIER)
        assert coord.gate(run_id, "ctx-coordinator").verdict == "block"
        coord.resume(run_id)
        retry = coord.queue.pending()
        assert any(e.id.startswith("FE-1-retry") for e in retry)
        # recibo de bloqueio permanece
        assert coord._ledger(run_id).find("blocked")

    def test_author_failure_blocks_without_sha(self, tmp_path):
        coord, repo, run_id, cid = setup_run(tmp_path)
        coord.freeze(run_id, cid, AUTHOR)
        with pytest.raises(Exception):
            coord.build(run_id, AUTHOR, "exit 3")
        assert coord._load_state(run_id)["station"] == "blocked"


class TestGateUnit:
    def _contract_like(self, tmp_path):
        from factory.contract import Contract

        files = {
            "intent.md": "x",
            "plan.md": "Status: approved",
            "checks.md": "C1 | profile=cheap | true",
        }
        return Contract(change_id="c", files=files, base_sha="a" * 40)

    def test_missing_required_check_proof_blocks(self, tmp_path):
        contract = self._contract_like(tmp_path)
        verify = VerifyResult(context_id="v", sha="b" * 40, proofs=[])
        decision = evaluate(contract=contract, frozen_digest=contract.digest,
                            build=TreeState(sha="b" * 40, untracked=[]),
                            verify=verify, author_context="a")
        assert not decision.ok
        assert any("no proof" in r for r in decision.reasons)

    def test_exit_zero_without_output_artifact_is_not_pass(self, tmp_path):
        contract = self._contract_like(tmp_path)
        proof = Proof(check_id="C1", cmd="true", exit_code=0,
                      output_sha256="dead" * 16, started_at="t0", finished_at="t1",
                      context_id="v", output_path=str(tmp_path / "nope.txt"))
        verify = VerifyResult(context_id="v", sha="b" * 40, proofs=[proof])
        decision = evaluate(contract=contract, frozen_digest=contract.digest,
                            build=TreeState(sha="b" * 40, untracked=[]),
                            verify=verify, author_context="a")
        assert not decision.ok
        assert any("missing" in r for r in decision.reasons)
