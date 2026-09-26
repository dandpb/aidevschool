"""AID-2719 (FACTORY-STRESS AID-2682) — evidência não vinculada não promove.

Repros portados do stress como negativos verdes (ORDEM AID-2784; refs
`/paperclip/w2710qa/stress/test_stress_qa.py`, `/paperclip/w2719sm/stress/test_stress_sm.py`):

- X4 (P4/P5): tarja de `build_sha`/`verify_sha` em `state.json` para um commit
  jamais examinado (`git commit-tree HEAD^{tree}`) → antes promovia com o
  ledger dizendo SHAs anteriores. Correção: o gate cruza o state com o último
  recibo verificável de cada estação do ledger e as provas carregam
  `examined_sha` — divergência bloqueia.
- X5 (P2/P3): contrato all-cheap + provas do próprio autor promoviam. A
  âncora de evidência (AID-2715) já recusa a forma forjada; a regra nova é o
  perfil mínimo: all-cheap com risco ≥ medium não promove sem revisão humana
  explícita registrada (`record_review`, recibo `actor_role=human`).
- X6 (P1 histórico): truncagem de sufixo do ledger passava em `--verify`
  (cadeia verificada só como prefixo). Correção: âncora externa do head
  (`state.ledger_head`, atualizada a cada append; `receipt.summary.json`
  reflui ao registro versionado) checada no gate e no `ledger --verify`.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from factory.coordinator import Coordinator
from factory.ledger import RunLedger
from factory.model import Proof, WorkEvent, sha256_text

AUTHOR = "ctx-author-x"
VERIFIER = "ctx-verifier-x"
REVIEWER = "ctx-reviewer-x"

BUILD_CMD = (
    "git config user.email a@a && git config user.name A && "
    "echo hi > feature.txt && git add -A && git commit -qm feat"
)


def _git(repo: Path, *args: str) -> str:
    import subprocess

    proc = subprocess.run(["git", "-C", str(repo), *args], capture_output=True, text=True)
    assert proc.returncode == 0, proc.stderr
    return proc.stdout


def _setup(tmp: Path, *, risk: str = "low",
           checks: str = "C1 | profile=cheap | test -f feature.txt\n"
                         "C2 | profile=standard | test -s app.txt\n"):
    repo = tmp / "product"
    repo.mkdir()
    _git(repo, "init", "-q", "-b", "main")
    _git(repo, "config", "user.email", "s@s")
    _git(repo, "config", "user.name", "S")
    (repo / "app.txt").write_text("v1\n", encoding="utf-8")
    (repo / "feature.txt").write_text("f\n", encoding="utf-8")
    _git(repo, "add", "-A")
    _git(repo, "commit", "-q", "-m", "base")
    reg = repo / "intent" / "bind-1"
    reg.mkdir(parents=True)
    (reg / "intent.md").write_text("# Intent\n\nStatus: accepted\n", encoding="utf-8")
    (reg / "spec.md").write_text("# Spec\n", encoding="utf-8")
    (reg / "plan.md").write_text("# Plan\n\nStatus: approved\n", encoding="utf-8")
    (reg / "checks.md").write_text(f"# Checks\n\n```\n{checks}```\n", encoding="utf-8")
    home = tmp / "factory-home"
    coord = Coordinator(repo=repo, home=home, registry=repo / "intent")
    coord.intake(WorkEvent(id="FE-1", origin="AID-2719", scope="stress", risk=risk))
    coord.claim("FE-1", AUTHOR)
    coord.freeze("run-FE-1", "bind-1", AUTHOR)
    coord.build("run-FE-1", AUTHOR, BUILD_CMD)
    return coord, repo, home


# ---------------------------------------------------------------------- X4

class TestX4StateTamperRebindsProofs:
    def test_state_tamper_to_unexamined_commit_blocks(self, tmp_path):
        """Repro X4: provas legítimas (sha S1) + state apontando para S2.

        Antes: `gate(pr_head_sha=S2)` → promote com reasons=[] (ledger dizia
        SHAs anteriores). Agora: binding state ⇄ ledger + examined_sha bloqueiam.
        """
        coord, repo, home = _setup(tmp_path)
        coord.prove("run-FE-1", VERIFIER)
        sp = home / "runs" / "run-FE-1" / "state.json"
        st = json.loads(sp.read_text(encoding="utf-8"))
        s1 = st["verify_sha"]
        s2 = _git(repo, "commit-tree", "HEAD^{tree}", "-m", "unexamined").strip()
        assert s2 != s1
        st.update(build_sha=s2, verify_sha=s2, build_untracked=[], verify_untracked=[])
        sp.write_text(json.dumps(st), encoding="utf-8")
        ledger_shas = [r.sha for r in coord._ledger("run-FE-1").read()]
        assert s2 not in ledger_shas  # o ledger carrega a verdade
        decision = coord.gate("run-FE-1", "coord", pr_head_sha=s2)
        assert decision.verdict == "block"
        assert any("state verify_sha" in r and "ledger verified receipt sha" in r
                   for r in decision.reasons)
        assert any("state build_sha" in r and "ledger built receipt sha" in r
                   for r in decision.reasons)
        assert coord._load_state("run-FE-1")["station"] == "blocked"

    def test_proofs_carry_examined_sha_and_gate_compares(self, tmp_path):
        """Critério 4: proofs carregam o SHA examinado; divergência bloqueia."""
        coord, repo, home = _setup(tmp_path)
        coord.prove("run-FE-1", VERIFIER)
        proofs_path = home / "runs" / "run-FE-1" / "proofs" / "proofs.json"
        meta = json.loads(proofs_path.read_text(encoding="utf-8"))
        assert all(p["examined_sha"] for p in meta)
        # prova "válida" deslocada para outro SHA (sem tocar o state):
        # rebind clássico — examined_sha divergente do verify bloqueia.
        st = json.loads((home / "runs" / "run-FE-1" / "state.json").read_text(encoding="utf-8"))
        other = _git(repo, "commit-tree", "HEAD^{tree}", "-m", "other").strip()
        for p in meta:
            p["examined_sha"] = other
        proofs_path.write_text(json.dumps(meta, indent=2) + "\n", encoding="utf-8")
        decision = coord.gate("run-FE-1", "coord")
        assert decision.verdict == "block"
        assert any("examined sha" in r and "!= verified sha" in r
                   for r in decision.reasons)
        _ = st

    def test_legacy_proof_without_examined_sha_requires_reprove(self, tmp_path):
        coord, repo, home = _setup(tmp_path)
        coord.prove("run-FE-1", VERIFIER)
        proofs_path = home / "runs" / "run-FE-1" / "proofs" / "proofs.json"
        meta = json.loads(proofs_path.read_text(encoding="utf-8"))
        for p in meta:
            p.pop("examined_sha", None)  # prova legada/pré-binding
        proofs_path.write_text(json.dumps(meta, indent=2) + "\n", encoding="utf-8")
        decision = coord.gate("run-FE-1", "coord")
        assert decision.verdict == "block"
        assert any("predates examined-SHA binding" in r for r in decision.reasons)

    def test_honest_mixed_pipeline_still_promotes(self, tmp_path):
        """Negativos não podem quebrar o caminho honesto (check standard)."""
        coord, repo, home = _setup(tmp_path)
        coord.prove("run-FE-1", VERIFIER)
        decision = coord.gate("run-FE-1", "coord",
                              pr_head_sha=coord._load_state("run-FE-1")["verify_sha"])
        assert decision.ok, decision.reasons
        state = coord._load_state("run-FE-1")
        assert state["station"] == "promoted"
        assert state["ledger_head"] == coord._ledger("run-FE-1").last().hash


# ---------------------------------------------------------------------- X5

class TestX5AllCheapMinimumProfile:
    CHEAP_ONLY = "C1 | profile=cheap | test -f feature.txt\n"

    def test_forged_author_proofs_block(self, tmp_path):
        """Repro X5 literal: all-cheap + proofs.json forjado pelo autor
        (risco medium — forma que o dono do gate alvo no critério 3)."""
        coord, repo, home = _setup(tmp_path, risk="medium", checks=self.CHEAP_ONLY)
        run_dir = home / "runs" / "run-FE-1"
        st = json.loads((run_dir / "state.json").read_text(encoding="utf-8"))
        st.update(station="verified", verifier_context="ctx-anyone",
                  verify_sha=st["build_sha"], verify_untracked=st["build_untracked"],
                  updated_at="2026-09-26T00:00:00.000+00:00")
        (run_dir / "state.json").write_text(json.dumps(st), encoding="utf-8")
        out = run_dir / "proofs" / "C1.output.txt"
        out.parent.mkdir(exist_ok=True)
        out.write_text("exit=0\n--- stdout ---\nfake by author\n--- stderr ---\n",
                       encoding="utf-8")
        proof = Proof(check_id="C1", cmd="test -f feature.txt", exit_code=0,
                      output_sha256=sha256_text(out.read_text(encoding="utf-8")),
                      started_at="t0", finished_at="t1",
                      context_id=AUTHOR, output_path=str(out))
        (run_dir / "proofs" / "proofs.json").write_text(
            json.dumps([proof.__dict__]), encoding="utf-8")
        decision = coord.gate("run-FE-1", "coord")
        assert decision.verdict == "block"
        # âncora (AID-2715) e perfil mínimo (AID-2719) — duas camadas.
        assert any("no ledger anchor" in r for r in decision.reasons)
        assert any("no profile=standard check" in r for r in decision.reasons)

    def test_anchored_all_cheap_medium_risk_still_needs_review(self, tmp_path):
        """Forma aprofundada: provas HONESTAS de contexto distinto, all-cheap,
        risco medium — independência reduzida a strings não pode promover."""
        coord, repo, home = _setup(tmp_path, risk="medium", checks=self.CHEAP_ONLY)
        coord.prove("run-FE-1", VERIFIER)  # provas reais, âncora real
        decision = coord.gate("run-FE-1", "coord")
        assert decision.verdict == "block"
        reasons = [r for r in decision.reasons if "X5" in r or "profile=standard" in r]
        assert reasons and all("no ledger anchor" not in r for r in reasons)
        assert any("no explicit human review" in r for r in decision.reasons)

    def test_explicit_human_review_unlocks_all_cheap_medium(self, tmp_path):
        """Revisão explícita registrada (recibo human + state) libera."""
        coord, repo, home = _setup(tmp_path, risk="medium", checks=self.CHEAP_ONLY)
        coord.prove("run-FE-1", VERIFIER)
        coord.record_review("run-FE-1", REVIEWER)
        receipts = coord._ledger("run-FE-1").read()
        assert any(r.actor_role == "human" for r in receipts)
        decision = coord.gate("run-FE-1", "coord")
        assert decision.ok, decision.reasons

    def test_review_by_author_or_verifier_does_not_count(self, tmp_path):
        """Revisor ≠ autor ≠ verificador — revisão conivente não vale."""
        coord, repo, home = _setup(tmp_path, risk="medium", checks=self.CHEAP_ONLY)
        coord.prove("run-FE-1", VERIFIER)
        coord.record_review("run-FE-1", VERIFIER)  # verificador revisando a si
        decision = coord.gate("run-FE-1", "coord")
        assert decision.verdict == "block"
        assert any("no explicit human review" in r for r in decision.reasons)

    def test_all_cheap_low_risk_promotes_as_before(self, tmp_path):
        """Critério 3 é para risco ≥ medium; low segue promovendo (mixed
        profile já coberto no caminho honesto X4)."""
        coord, repo, home = _setup(tmp_path, risk="low", checks=self.CHEAP_ONLY)
        coord.prove("run-FE-1", VERIFIER)
        decision = coord.gate("run-FE-1", "coord")
        assert decision.ok, decision.reasons

    def test_missing_risk_counts_as_unknown_and_blocks_all_cheap(self, tmp_path):
        """Run legada sem risco no state: fail-closed (desconhecido)."""
        coord, repo, home = _setup(tmp_path, risk="low", checks=self.CHEAP_ONLY)
        coord.prove("run-FE-1", VERIFIER)
        sp = home / "runs" / "run-FE-1" / "state.json"
        st = json.loads(sp.read_text(encoding="utf-8"))
        st.pop("risk", None)
        sp.write_text(json.dumps(st), encoding="utf-8")
        decision = coord.gate("run-FE-1", "coord")
        assert decision.verdict == "block"
        assert any("risk=unknown" in r for r in decision.reasons)


# ---------------------------------------------------------------------- X6

class TestX6LedgerSuffixTruncation:
    def _truncate_suffix(self, home: Path, drop: int = 2) -> int:
        lp = home / "ledger" / "run-FE-1.jsonl"
        lines = lp.read_text(encoding="utf-8").splitlines()
        keep = lines[: max(1, len(lines) - drop)]
        lp.write_text("\n".join(keep) + "\n", encoding="utf-8")
        return len(lines)

    def test_anchored_verify_detects_truncation(self, tmp_path):
        """Repro X6: truncagem 4→2 mantinha verify_chain()==True; com a âncora
        externa do head (state.ledger_head) o veredito vira chain_ok=false."""
        coord, repo, home = _setup(tmp_path)
        coord.prove("run-FE-1", VERIFIER)
        coord.gate("run-FE-1", "coord")
        before = self._truncate_suffix(home)
        state = json.loads(
            (home / "runs" / "run-FE-1" / "state.json").read_text(encoding="utf-8"))
        assert state["ledger_head"]
        report = RunLedger(home / "ledger" / "run-FE-1.jsonl").verify_report(
            expected_head=state["ledger_head"])
        assert report["chain_ok"] is False
        assert "external anchor" in report["error"]["reason"]

    def test_gate_blocks_on_truncated_ledger(self, tmp_path):
        coord, repo, home = _setup(tmp_path)
        coord.prove("run-FE-1", VERIFIER)
        self._truncate_suffix(home)  # apaga receipts recentes ANTES do gate
        decision = coord.gate("run-FE-1", "coord")
        assert decision.verdict == "block"
        assert any("!= state anchor" in r and "truncated" in r
                   for r in decision.reasons)

    def test_state_anchor_follows_every_append(self, tmp_path):
        """O head ancorado acompanha cada append (coordenador mantém a âncora)."""
        coord, repo, home = _setup(tmp_path)
        coord.prove("run-FE-1", VERIFIER)
        st = coord._load_state("run-FE-1")
        assert st["ledger_head"] == coord._ledger("run-FE-1").last().hash
        assert st["ledger_seq"] == coord._ledger("run-FE-1").last().seq
        coord.gate("run-FE-1", "coord")
        st = coord._load_state("run-FE-1")
        assert st["ledger_head"] == coord._ledger("run-FE-1").last().hash

    def test_summary_carries_head_anchor_for_versioned_registry(self, tmp_path):
        coord, repo, home = _setup(tmp_path)
        coord.prove("run-FE-1", VERIFIER)
        coord.gate("run-FE-1", "coord")
        summary = json.loads(
            (home / "runs" / "run-FE-1" / "receipt.summary.json").read_text(encoding="utf-8"))
        assert summary["ledger_head"]
        receipts = coord._ledger("run-FE-1").read()
        # âncora do summary é um recibo do ledger (head pré-transição)
        assert summary["ledger_head"] in {r.hash for r in receipts}

    def test_cli_verify_truncated_ledger_exits_2_with_anchor_reason(self, tmp_path):
        import subprocess

        coord, repo, home = _setup(tmp_path)
        coord.prove("run-FE-1", VERIFIER)
        coord.gate("run-FE-1", "coord")
        self._truncate_suffix(home)
        env = {"PYTHONPATH": str(Path(__file__).resolve().parents[2]),
               "PATH": "/usr/bin:/bin:/usr/local/bin",
               "FACTORY_HOME": str(home), "HOME": str(home.parent)}
        proc = subprocess.run(
            [sys.executable, "-m", "factory", "--home", str(home),
             "--repo", str(repo), "ledger", "FE-1", "--verify"],
            capture_output=True, text=True, timeout=120, env=env,
        )
        assert proc.returncode == 2, (proc.stdout, proc.stderr)
        payload = json.loads(proc.stdout)
        assert payload["chain_ok"] is False
        assert "external anchor" in payload["error"]["reason"]
        assert "Traceback" not in proc.stderr

    def test_cli_verify_healthy_ledger_with_anchor_still_exits_0(self, tmp_path):
        import subprocess

        coord, repo, home = _setup(tmp_path)
        coord.prove("run-FE-1", VERIFIER)
        coord.gate("run-FE-1", "coord")
        env = {"PYTHONPATH": str(Path(__file__).resolve().parents[2]),
               "PATH": "/usr/bin:/bin:/usr/local/bin",
               "FACTORY_HOME": str(home), "HOME": str(home.parent)}
        proc = subprocess.run(
            [sys.executable, "-m", "factory", "--home", str(home),
             "--repo", str(repo), "ledger", "FE-1", "--verify"],
            capture_output=True, text=True, timeout=120, env=env,
        )
        assert proc.returncode == 0, (proc.stdout, proc.stderr)
        payload = json.loads(proc.stdout)
        assert payload["chain_ok"] is True
        assert payload["head"] == payload["anchored_head"]

    def test_gate_without_state_anchor_fails_closed(self, tmp_path):
        """Run legada sem ledger_head: o gate não pode fingir que detecta."""
        coord, repo, home = _setup(tmp_path)
        coord.prove("run-FE-1", VERIFIER)
        sp = home / "runs" / "run-FE-1" / "state.json"
        st = json.loads(sp.read_text(encoding="utf-8"))
        st.pop("ledger_head", None)
        st.pop("ledger_seq", None)
        sp.write_text(json.dumps(st), encoding="utf-8")
        decision = coord.gate("run-FE-1", "coord")
        assert decision.verdict == "block"
        assert any("no ledger_head anchor" in r for r in decision.reasons)


# ------------------------------------------------------------------ review CLI

class TestReviewCli:
    def test_cli_review_records_human_receipt(self, tmp_path):
        import subprocess

        coord, repo, home = _setup(tmp_path, risk="medium",
                                   checks="C1 | profile=cheap | test -f feature.txt\n")
        coord.prove("run-FE-1", VERIFIER)
        env = {"PYTHONPATH": str(Path(__file__).resolve().parents[2]),
               "PATH": "/usr/bin:/bin:/usr/local/bin",
               "FACTORY_HOME": str(home), "HOME": str(home.parent)}
        proc = subprocess.run(
            [sys.executable, "-m", "factory", "--home", str(home),
             "--repo", str(repo), "review", "FE-1", "--context", REVIEWER],
            capture_output=True, text=True, timeout=120, env=env,
        )
        assert proc.returncode == 0, (proc.stdout, proc.stderr)
        payload = json.loads(proc.stdout)
        assert payload["human_review"]["approved"] is True
        decision = coord.gate("run-FE-1", "coord")
        assert decision.ok, decision.reasons
