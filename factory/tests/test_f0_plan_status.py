"""AID-2734 (FACTORY-STRESS F0, execução de AID-2729) — drift template↔parser.

Defeito: `docs/sdlc/templates/plan.md` renderiza o header canônico inline
(`Change-id: … · From: … · Status: approved`), mas `PLAN_APPROVED` só casava
`Status:` em início de linha — freeze rejeitava o registro canônico
(repro AID-2729: `factory freeze --change-id AID-2676-agentic-factory-poc`).

Correção (opção (a) de AID-2734): parser tolerante — aprovação casada tanto
inline (separador "·" do template) quanto em início de linha (legado).
`draft` e ausência de `Status` continuam bloqueando (fail-closed).

Contrato mútuo template↔parser: o teste renderiza o template REAL de
`docs/sdlc/templates/plan.md` — se um dos lados driftar de novo, este teste
quebra antes do freeze rejeitar registro canônico na main.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from factory.contract import Contract, ContractError
from factory.coordinator import Coordinator
from factory.model import WorkEvent

AUTHOR = "ctx-author-f0"
VERIFIER = "ctx-verifier-f0"

REPO_ROOT = Path(__file__).resolve().parents[2]
TEMPLATE = REPO_ROOT / "docs" / "sdlc" / "templates" / "plan.md"

CHANGE_ID = "AID-2734-plan-status-inline"


def render_canonical_template(status: str = "approved") -> str:
    """Renderiza o template canônico como o SDLC manda (header inline)."""
    text = TEMPLATE.read_text(encoding="utf-8")
    text = text.replace("# Plan: <one-line title>", f"# Plan: {CHANGE_ID}")
    text = text.replace("<same as intent/spec>", CHANGE_ID)
    text = text.replace("intent/<change-id>/spec.md", f"intent/{CHANGE_ID}/spec.md")
    text = text.replace("draft | approved", status)
    return text


def files_with_plan(plan: str) -> dict[str, str]:
    return {
        "intent.md": "# Intent\n",
        "spec.md": "# Spec\n",
        "plan.md": plan,
        "checks.md": "C1 | profile=cheap | true\n",
    }


def contract_for(plan: str) -> Contract:
    return Contract(change_id="c", files=files_with_plan(plan), base_sha="a" * 40)


class TestTemplateParserMutualContract:
    def test_canonical_template_inline_approved_passes(self):
        plan = render_canonical_template("approved")
        assert "· Status: approved" in plan  # header inline como o template manda
        contract = contract_for(plan)
        assert contract.checks[0].id == "C1"

    def test_canonical_template_inline_draft_blocks(self):
        plan = render_canonical_template("draft")
        with pytest.raises(ContractError, match="Status: approved"):
            contract_for(plan)

    def test_template_exists(self):
        assert TEMPLATE.is_file(), "template canônico sumiu — atualizar o parser"


class TestTolerantParser:
    def test_legacy_line_start_approved_passes(self):
        contract = contract_for("# Plan\n\nStatus: approved\n")
        assert contract.digest

    def test_inline_status_approved_after_separator_passes(self):
        contract = contract_for(
            "# Plan: x\n\nChange-id: c · From: spec.md · Status: approved\n"
        )
        assert contract.digest

    def test_inline_status_draft_blocks(self):
        with pytest.raises(ContractError, match="Status: approved"):
            contract_for("# Plan: x\n\nChange-id: c · From: spec.md · Status: draft\n")

    def test_inline_status_other_value_blocks(self):
        with pytest.raises(ContractError, match="Status: approved"):
            contract_for("# Plan: x\n\nChange-id: c · Status: review\n")

    def test_missing_status_blocks(self):
        with pytest.raises(ContractError, match="Status: approved"):
            contract_for("# Plan: x\n\nChange-id: c · From: spec.md\n")

    def test_approved_word_boundary_not_tricked(self):
        with pytest.raises(ContractError, match="Status: approved"):
            contract_for("# Plan: x\n\nChange-id: c · Status: approval-pending\n")


class TestFreezeAcceptsCanonicalHeader:
    """F0 end-to-end: freeze aceita registro com header canônico inline."""

    def test_freeze_with_canonical_inline_plan_succeeds(self, tmp_path):
        repo = tmp_path / "product"
        repo.mkdir()
        import subprocess

        def git(*args: str) -> None:
            proc = subprocess.run(["git", "-C", str(repo), *args],
                                  capture_output=True, text=True)
            assert proc.returncode == 0, proc.stderr

        git("init", "-q", "-b", "main")
        git("config", "user.email", "f0@example.com")
        git("config", "user.name", "F0")
        (repo / "app.txt").write_text("v1\n", encoding="utf-8")
        git("add", "-A")
        git("commit", "-q", "-m", "base")

        reg = repo / "intent" / CHANGE_ID
        reg.mkdir(parents=True)
        (reg / "intent.md").write_text("# Intent\n\nStatus: accepted\n", encoding="utf-8")
        (reg / "spec.md").write_text("# Spec\n", encoding="utf-8")
        (reg / "plan.md").write_text(render_canonical_template("approved"), encoding="utf-8")
        (reg / "checks.md").write_text(
            "# Checks\n\n```\nC1 | profile=cheap | test -s app.txt\n```\n",
            encoding="utf-8",
        )

        coord = Coordinator(repo=repo, home=tmp_path / "factory-home", registry=repo / "intent")
        coord.intake(WorkEvent(id="FE-F0", origin="AID-2734", scope="fix F0", risk="low"))
        run_id = coord.claim("FE-F0", AUTHOR)
        # Antes do fix esta linha levantava ContractError (header canônico inline).
        coord.freeze(run_id, CHANGE_ID, AUTHOR)
        assert (coord.home / "runs" / run_id / "contract" / "plan.md").is_file()
