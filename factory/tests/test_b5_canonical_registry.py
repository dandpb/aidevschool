"""Regressão B5 (AID-2732): o contrato congela o registro canônico REAL.

3 fontes independentes (FACTORY-STRESS onda 1): AID-2683 F0 (#10),
AID-2684 #3 + adendum #17, AID-2686 #5/F1 — `PLAN_APPROVED` exigia
`Status:` em início de linha, mas o header canônico do template
(`Change-id: ... · From: ... · Status: approved`) carrega o campo mid-line.
Este caminho era fixture-only (`test_factory_poc.py` usa registro
sintético) e nunca pode voltar a ser.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from factory.contract import PLAN_APPROVED, Contract, ContractError, load_from_registry
from factory.coordinator import Coordinator
from factory.model import WorkEvent

REPO_ROOT = Path(__file__).resolve().parents[2]
CANONICAL_CHANGE_ID = "AID-2676-agentic-factory-poc"
CANONICAL_PLAN = REPO_ROOT / "intent" / CANONICAL_CHANGE_ID / "plan.md"


def _git(repo: Path, *args: str) -> str:
    import subprocess

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


class TestCanonicalRegistry:
    def test_canonical_plan_header_matches_plan_approved(self):
        """A repro mínima da AID-2732: regex casa o header real (era None)."""
        assert PLAN_APPROVED.search(CANONICAL_PLAN.read_text(encoding="utf-8"))

    def test_canonical_plan_header_is_mid_line_field(self):
        """Guarda a pré-condição do defeito: o header canônico é mid-line."""
        header = CANONICAL_PLAN.read_text(encoding="utf-8").splitlines()[2]
        assert header.startswith("Change-id:")
        assert not re.match(r"^\s*Status:", header)
        assert "· Status: approved" in header

    def test_load_from_registry_canonical(self, tmp_path):
        contract = load_from_registry(
            REPO_ROOT / "intent", CANONICAL_CHANGE_ID, base_sha="deadbeef"
        )
        assert contract.change_id == CANONICAL_CHANGE_ID
        assert [c.id for c in contract.checks] == ["C1", "C2", "C3"]
        frozen = contract.freeze(tmp_path / "run")
        reloaded = Contract.load_frozen(tmp_path / "run")
        assert reloaded.digest == contract.digest
        assert frozen.is_dir()

    def test_coordinator_freeze_over_real_registry(self, tmp_path):
        """Freeze completo (fila+lease+contrato) contra o registro REAL."""
        repo = make_product_repo(tmp_path)
        coord = Coordinator(
            repo=repo, home=tmp_path / "factory-home", registry=REPO_ROOT / "intent"
        )
        coord.intake(WorkEvent(id="FE-B5", origin="AID-2732", scope="factory-b5", risk="low"))
        run_id = coord.claim("FE-B5", "ctx-author-b5")
        contract = coord.freeze(run_id, CANONICAL_CHANGE_ID, "ctx-author-b5")
        assert contract.digest


class TestStrictnessPreserved:
    """A correção não pode enfraquecer a exigência de aprovação (AID-2732)."""

    def _plan(self, status_line: str) -> str:
        return (
            "# Plan: demo\n\n"
            f"{status_line}\n\n## Files that change\n\n- `x.py`\n"
        )

    def _contract(self, plan: str) -> Contract:
        """Com checks.md válido: ContractError só pode vir da aprovação."""
        return Contract(
            change_id="demo-1",
            files={
                "intent.md": "# Intent\n\nStatus: accepted\n",
                "plan.md": plan,
                "checks.md": "# Checks\n\n```\nC1 | profile=cheap | true\n```\n",
            },
            base_sha="x",
        )

    def test_own_line_form_still_accepted(self):
        assert PLAN_APPROVED.search(self._plan("Status: approved"))
        assert PLAN_APPROVED.search(self._plan("   Status:   approved"))
        assert PLAN_APPROVED.search(self._plan("Status:approved"))

    def test_mid_line_field_after_separator_accepted(self):
        line = "Change-id: demo-1 · From: intent/demo-1/spec.md · Status: approved"
        assert PLAN_APPROVED.search(self._plan(line))
        line_trailing = "Author: x · Status: approved · Date: 2026-09-26 04:00Z"
        assert PLAN_APPROVED.search(self._plan(line_trailing))

    def test_prose_mention_is_not_approval(self):
        for plan in (
            self._plan("Escreva `Status: approved` no header do plan.md."),
            self._plan("O verificador confere que o plan diz Status: approved antes do build."),
            self._plan("## Notas\n\n- draft antigo mencionava \"· Status: approved\" citado"),
            # campo válido, mas fora do bloco de header (abaixo da 1ª seção)
            "# Plan: demo\n\n## Detalhes\n\nChange-id: demo-1 · Status: approved\n",
        ):
            with pytest.raises(ContractError, match="Status: approved"):
                self._contract(plan)

    def test_non_approved_status_values_rejected(self):
        # Nota: `approved` + hífen (ex. `approved-pending`) casa o `\b` —
        # semântica pré-existente do regex original, mantida intocada.
        for line in (
            "Status: draft",
            "Change-id: demo-1 · From: s.md · Status: draft",
            "Change-id: demo-1 · From: s.md · Status: accepted",
            "Status: approvedonly",
        ):
            with pytest.raises(ContractError, match="Status: approved"):
                self._contract(self._plan(line))

    def test_error_message_names_both_forms(self):
        with pytest.raises(ContractError, match="`·`-separated mid-line"):
            self._contract("# Plan\n")
