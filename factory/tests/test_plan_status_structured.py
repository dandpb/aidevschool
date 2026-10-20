"""AID-2775 (AID-5003, plano AID-3522 r1 aprovado pelo founder) — fail-closed
estrutural de `plan_is_approved`.

Defeito: o regex `PLAN_APPROVED` (âncora `(?:^|·)`) aprovava plano `draft`
quando o BLOCO de header continha, em prosa, a substring `· Status: approved`
(repro QA AID-2767 na adjudicação #534 vs #538: `plan_is_approved` → True,
`Contract` aceito → freeze liberado com status real=draft).

Correção (D1): parser estruturado — linha-campo (lead `Change-id | From |
Status | Author`) + segmento-campo `Status:` (split `·`) + valor `^approved\b`
(semântica de valor preservada). Casos canônicos abaixo (§6 do plano), com o
negativo em prosa (repro AID-2775) como caso 6.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from factory.contract import Contract, ContractError, plan_is_approved

REPO_ROOT = Path(__file__).resolve().parents[2]
TEMPLATE = REPO_ROOT / "docs" / "sdlc" / "templates" / "plan.md"

CHANGE_ID = "AID-2775-plan-status-structured"


def render_canonical_template(status: str = "approved") -> str:
    text = TEMPLATE.read_text(encoding="utf-8")
    text = text.replace("# Plan: <one-line title>", f"# Plan: {CHANGE_ID}")
    text = text.replace("<same as intent/spec>", CHANGE_ID)
    text = text.replace("intent/<change-id>/spec.md", f"intent/{CHANGE_ID}/spec.md")
    text = text.replace("draft | approved", status)
    return text


def files_with_plan(plan: str) -> dict[str, str]:
    return {
        "intent.md": "# Intent\n\nStatus: accepted\n",
        "spec.md": "# Spec\n",
        "plan.md": plan,
        "checks.md": "C1 | profile=cheap | true\n",
    }


def contract_for(plan: str) -> Contract:
    return Contract(change_id=CHANGE_ID, files=files_with_plan(plan), base_sha="a" * 40)


def blocked(plan: str) -> None:
    with pytest.raises(ContractError, match="Status: approved"):
        contract_for(plan)


class TestPlanStatusStructuredCanonical:
    """10 casos canônicos (plano §6). Caso 6 é a repro AID-2775."""

    def test_case_1_template_inline_approved_passes(self):
        plan = render_canonical_template("approved")
        assert "· Status: approved" in plan  # campo mid-line do header canônico
        assert contract_for(plan).digest

    def test_case_2_own_line_approved_passes(self):
        assert contract_for("# Plan: x\n\nStatus: approved\n").digest

    def test_case_3_own_line_spacing_tolerated(self):
        assert plan_is_approved("# Plan\n\n   Status:   approved\n")
        assert plan_is_approved("# Plan\n\nStatus:approved\n")

    def test_case_4_inline_trailing_status_segment_passes(self):
        plan = "# Plan: x\n\nAuthor: ctx · Status: approved · Date: 2026-10-17 16:00Z\n"
        assert contract_for(plan).digest

    def test_case_5_status_below_first_section_blocks(self):
        # campo válido, mas FORA do bloco de header (abaixo da 1ª seção `## `)
        blocked("# Plan: x\n\n## Detalhes\n\nChange-id: c · Status: approved\n")

    def test_case_6_prose_mention_in_header_block_blocks(self):
        # Repro AID-2775: prosa com `· Status: approved` ANTES da 1ª seção
        # `## ` (dentro do bloco de header) NÃO é campo — fail-closed.
        plan = (
            "# Plano X\n\n"
            "Change-id: X · From: spec.md · Status: draft\n\n"
            "Nota: o documento anterior dizia · Status: approved, mas foi revogado.\n"
        )
        assert not plan_is_approved(plan)
        blocked(plan)

    def test_case_7_draft_blocks(self):
        plan = render_canonical_template("draft")
        assert "· Status: draft" in plan
        blocked(plan)

    def test_case_8_non_approved_values_block(self):
        # `^approved\b` preservado: `approvedonly`/`approval-pending` não aprovam
        blocked("# Plan: x\n\nChange-id: c · From: s.md · Status: accepted\n")
        blocked("# Plan: x\n\nChange-id: c · Status: approvedonly\n")
        blocked("# Plan: x\n\nChange-id: c · Status: approval-pending\n")

    def test_case_9_missing_status_blocks(self):
        blocked("# Plan: x\n\nChange-id: c · From: intent/c/spec.md\n")
        blocked("# Plan: x\n")

    def test_case_10_prose_quoting_status_is_not_a_field(self):
        blocked("# Plan: x\n\nEscreva `Status: approved` no header do plan.md.\n")
        blocked("# Plan: x\n\nO verificador confere Status: approved antes do build.\n")


class TestPlanStatusValueSemanticsPreserved:
    def test_value_with_parenthetical_still_approves(self):
        # valor `approved (retro; …)` ocorre em registros reais — `^approved\b`
        assert contract_for("# Plan: x\n\nStatus: approved (retro; execução concluída)\n").digest

    def test_separator_alone_is_not_a_field_line(self):
        # linha começando com `·` não tem lead de campo — não aprova ( tightening
        # estrutural vs. regex antigo, fail-closed)
        assert not plan_is_approved("# Plan: x\n\n· Status: approved\n")

    def test_unknown_field_lead_does_not_approve(self):
        assert not plan_is_approved("# Plan: x\n\nNota: campo · Status: approved · fim\n")


class TestCanonicalRegistryStillApproved:
    def test_real_registry_plan_passes_new_parser(self):
        # controle espelhado do b5, agora pelo caminho OPERATIVO (parser):
        # o registro canônico real versionado no repo continua aprovado.
        canonical = REPO_ROOT / "intent" / "AID-2676-agentic-factory-poc" / "plan.md"
        assert "· Status: approved" in canonical.read_text(encoding="utf-8")
        assert plan_is_approved(canonical.read_text(encoding="utf-8"))
