"""AID-2715 (FACTORY-STRESS AID-2686/S5) — prova auto-atestada não é evidência.

Repro do defeito: atacante reescreve `proofs/<check>.output.txt` E o
`output_sha256` em `proofs.json` (runtime consistente entre si). Antes da
âncora, `revalidate_proofs` aceitava e o gate promovia.

Correção: o recibo `verified` sela `{check_id, cmd_sha256, exit_code,
output_sha256}` no ledger encadeado; o gate compara o runtime contra a
âncora e bloqueia divergência; sem âncora, bloqueia (fail-closed).
"""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from factory.coordinator import Coordinator
from factory.gate import evaluate
from factory.gitwork import TreeState
from factory.ledger import RunLedger
from factory.model import Receipt, WorkEvent, evidence_digest, proof_evidence
from factory.verify import VerifyResult

AUTHOR = "ctx-author-anchor"
VERIFIER = "ctx-verifier-anchor"


def _git(repo: Path, *args: str) -> str:
    import subprocess

    proc = subprocess.run(["git", "-C", str(repo), *args], capture_output=True, text=True)
    assert proc.returncode == 0, proc.stderr
    return proc.stdout


def _setup(tmp: Path, checks_cmd: str = "test -f feature.txt"):
    repo = tmp / "product"
    repo.mkdir()
    _git(repo, "init", "-q", "-b", "main")
    _git(repo, "config", "user.email", "demo@example.com")
    _git(repo, "config", "user.name", "Demo")
    (repo / "app.txt").write_text("v1\n", encoding="utf-8")
    _git(repo, "add", "-A")
    _git(repo, "commit", "-q", "-m", "base")
    reg = repo / "intent" / "anchor-1"
    reg.mkdir(parents=True)
    (reg / "intent.md").write_text("# Intent\n\nStatus: accepted\n", encoding="utf-8")
    (reg / "spec.md").write_text("# Spec\n", encoding="utf-8")
    (reg / "plan.md").write_text("# Plan\n\nStatus: approved\n", encoding="utf-8")
    (reg / "checks.md").write_text(
        f"# Checks\n\n```\nC1 | profile=cheap | {checks_cmd}\n"
        "C2 | profile=standard | test -s app.txt\n```\n",
        encoding="utf-8",
    )
    home = tmp / "factory-home"
    coord = Coordinator(repo=repo, home=home, registry=repo / "intent")
    coord.intake(WorkEvent(id="FE-A", origin="AID-2715", scope="stress", risk="high"))
    run_id = coord.claim("FE-A", AUTHOR)
    coord.freeze(run_id, "anchor-1", AUTHOR)
    coord.build(run_id, AUTHOR, "echo hi > feature.txt; git add -A; git commit -qm feat")
    coord.prove(run_id, VERIFIER)
    return coord, repo, run_id


def _forge_consistent_runtime(coord: Coordinator, run_id: str, check_id: str = "C1") -> None:
    """Ataque S5: output reescrito + output_sha256 re-assinado no proofs.json."""
    proofs_dir = coord._run_dir(run_id) / "proofs"
    (proofs_dir / f"{check_id}.output.txt").write_text(
        f"exit=0\nFAKED: {check_id} all tests passed\n", encoding="utf-8"
    )
    meta_path = proofs_dir / "proofs.json"
    meta = json.loads(meta_path.read_text(encoding="utf-8"))
    out = (proofs_dir / f"{check_id}.output.txt").read_text(encoding="utf-8")
    for proof in meta:
        if proof["check_id"] == check_id:
            proof["output_sha256"] = hashlib.sha256(out.encode("utf-8")).hexdigest()
    meta_path.write_text(json.dumps(meta, indent=2) + "\n", encoding="utf-8")


class TestS5Attack:
    def test_tampered_output_with_forged_proofs_json_blocks(self, tmp_path):
        coord, repo, run_id = _setup(tmp_path)
        _forge_consistent_runtime(coord, run_id, "C1")
        decision = coord.gate(run_id, "ctx-coordinator")
        assert decision.verdict == "block"
        assert any("diverges from ledger anchor" in r for r in decision.reasons)

    def test_attack_does_not_touch_ledger_chain(self, tmp_path):
        coord, repo, run_id = _setup(tmp_path)
        _forge_consistent_runtime(coord, run_id, "C1")
        snap = coord._ledger(run_id).snapshot()
        assert snap["chain_ok"], "ataque no runtime não deve alterar o ledger"

    def test_honest_pipeline_still_promotes(self, tmp_path):
        coord, repo, run_id = _setup(tmp_path)
        decision = coord.gate(run_id, "ctx-coordinator")
        assert decision.ok, decision.reasons

    def test_summary_carries_anchor(self, tmp_path):
        coord, repo, run_id = _setup(tmp_path)
        coord.gate(run_id, "ctx-coordinator")
        summary = json.loads(
            (coord._run_dir(run_id) / "receipt.summary.json").read_text(encoding="utf-8")
        )
        assert set(summary["proof_anchor"]) == {"C1", "C2"}


class TestAnchorSealing:
    def test_verified_receipt_seals_evidence_digests(self, tmp_path):
        coord, repo, run_id = _setup(tmp_path)
        receipts = coord._ledger(run_id).find("verified")
        assert receipts and receipts[0].proof_digests
        # AID-2719: `examined_sha` entra na âncora selada (prova amarrada ao
        # commit examinado, não só ao output).
        assert receipts[0].detail["proof_evidence"][0].keys() == {
            "check_id", "cmd_sha256", "exit_code", "output_sha256",
            "examined_sha",
        }
        verify_sha = coord._load_state(run_id)["verify_sha"]
        assert all(e["examined_sha"] == verify_sha
                   for e in receipts[0].detail["proof_evidence"])
        for e, d in zip(receipts[0].detail["proof_evidence"], receipts[0].proof_digests):
            assert evidence_digest(e) == d

    def test_tampering_anchor_breaks_chain(self, tmp_path):
        coord, repo, run_id = _setup(tmp_path)
        path = coord.home / "ledger" / f"{run_id}.jsonl"
        lines = path.read_text(encoding="utf-8").splitlines()
        receipt = json.loads(lines[2])  # seq 3 = verified
        assert receipt["proof_digests"]
        receipt["proof_digests"][0] = "0" * 64
        lines[2] = json.dumps(receipt, sort_keys=True, separators=(",", ":"))
        path.write_text("\n".join(lines) + "\n", encoding="utf-8")
        assert not RunLedger(path).verify_chain()

    def test_pre_anchor_ledger_still_verifies(self, tmp_path):
        """Compat: recibos sem proof_digests (pré-AID-2715) continuam válidos."""
        path = tmp_path / "old.jsonl"
        ledger = RunLedger(path)
        ledger.append(Receipt(seq=1, run_id="r", station_from="queued",
                              station_to="contracted", actor_role="coordinator",
                              context_id="c1"))
        assert RunLedger(path).verify_chain()


class TestFailClosed:
    def test_gate_without_anchor_refuses_self_attested_proofs(self, tmp_path):
        coord, repo, run_id = _setup(tmp_path)
        # Sabota o ledger: remove o recibo verified (ângulo: proofs sem âncora).
        path = coord.home / "ledger" / f"{run_id}.jsonl"
        lines = [l for l in path.read_text(encoding="utf-8").splitlines()
                 if json.loads(l)["station_to"] != "verified"]
        path.write_text("\n".join(lines) + "\n", encoding="utf-8")
        decision = coord.gate(run_id, "ctx-coordinator")
        assert decision.verdict == "block"
        assert any("no ledger anchor" in r for r in decision.reasons)

    def test_evaluate_blocks_without_anchor_by_default(self, tmp_path):
        from factory.contract import Contract

        files = {
            "intent.md": "x",
            "plan.md": "Status: approved",
            "checks.md": "C1 | profile=cheap | true",
        }
        contract = Contract(change_id="c", files=files, base_sha="a" * 40)
        proof = coord_proof(tmp_path)
        verify = VerifyResult(context_id="v", sha="b" * 40, proofs=[proof])
        decision = evaluate(
            contract=contract, frozen_digest=contract.digest,
            build=TreeState(sha="b" * 40, untracked=[]),
            verify=verify, author_context="a",
        )
        assert not decision.ok
        assert any("no ledger anchor" in r for r in decision.reasons)

    def test_anchored_extra_check_and_missing_check_both_block(self, tmp_path):
        from factory.contract import Contract

        files = {
            "intent.md": "x",
            "plan.md": "Status: approved",
            "checks.md": "C1 | profile=cheap | true",
        }
        contract = Contract(change_id="c", files=files, base_sha="a" * 40)
        proof = coord_proof(tmp_path, check_id="C1")
        verify = VerifyResult(context_id="v", sha="b" * 40, proofs=[proof])
        # Âncora tem C2 que sumiu do runtime e aponta digest errado p/ C1.
        anchored = {"C1": "0" * 64, "C2": "1" * 64}
        decision = evaluate(
            contract=contract, frozen_digest=contract.digest,
            build=TreeState(sha="b" * 40, untracked=[]),
            verify=verify, author_context="a", anchored_evidence=anchored,
        )
        assert not decision.ok
        assert any("C1" in r and "diverges from ledger anchor" in r for r in decision.reasons)
        assert any("C2" in r and "missing from runtime" in r for r in decision.reasons)


def coord_proof(tmp: Path, check_id: str = "C1"):
    from factory.model import Proof

    out = tmp / f"{check_id}.output.txt"
    out.write_text("exit=0\n", encoding="utf-8")
    proof = Proof(check_id=check_id, cmd="true", exit_code=0,
                  output_sha256=hashlib.sha256(b"exit=0\n").hexdigest(),
                  started_at="t0", finished_at="t1",
                  context_id="v", output_path=str(out))
    # digest honesto, para isolar o efeito da âncora divergente
    return proof
