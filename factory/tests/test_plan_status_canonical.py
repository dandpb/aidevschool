"""AID-2732/AID-2734 — o freeze aceita o header canônico de plan.md.

O template canônico do repo carrega o status inline na linha `Change-id:`
(`... · Status: approved`); a POC exigia `Status:` em início de linha e
rejeitava registros canônicos (B5/F0, confirmado por 3 fontes
independentes do programa FACTORY-STRESS). Casos negativos: status não
aprovado inline e menção em prosa continuam barrados (fail-closed).
"""

from __future__ import annotations

import pytest

from factory.contract import Contract, ContractError, load_from_registry


def _files(plan: str) -> dict[str, str]:
    return {
        "intent.md": "# Intent\n",
        "spec.md": "# Spec\n",
        "plan.md": plan,
        "checks.md": "C1 | profile=cheap | true\n",
    }


@pytest.mark.parametrize(
    "plan",
    [
        "# Plan\n\nChange-id: X · From: intent/X/spec.md · Status: approved\n",
        "# Plan\n\nChange-id: X · From: spec.md · Status: approved (decisão de owner AID-2732)\n",
        "# Plan\n\nChange-id: X · From: PR #262 (Sentinel) · Status: approved (retro; execução já concluída)\n",
    ],
    ids=["minimal", "com-parentese", "retro-real-de-main"],
)
def test_canonical_inline_header_accepted(plan):
    contract = Contract(change_id="X", files=_files(plan), base_sha="a" * 40)
    assert [c.id for c in contract.checks] == ["C1"]


def test_line_start_status_still_accepted():
    contract = Contract(change_id="X", files=_files("Status: approved\n"), base_sha="a" * 40)
    assert contract.checks[0].id == "C1"


@pytest.mark.parametrize("status", ["draft", "proposed", "review"])
def test_canonical_inline_non_approved_rejected(status):
    plan = f"# Plan\n\nChange-id: X · From: spec.md · Status: {status}\n"
    with pytest.raises(ContractError, match="Status: approved"):
        Contract(change_id="X", files=_files(plan), base_sha="a" * 40)


def test_prose_mention_off_changeid_line_rejected():
    plan = (
        "# Plan\n\n"
        "Change-id: X · From: spec.md · Status: draft\n\n"
        "Nota: o documento anterior dizia · Status: approved, mas foi revogado.\n"
    )
    with pytest.raises(ContractError, match="Status: approved"):
        Contract(change_id="X", files=_files(plan), base_sha="a" * 40)


def test_plan_without_any_status_rejected():
    with pytest.raises(ContractError, match="Status: approved"):
        Contract(change_id="X", files=_files("# Plan\n\nChange-id: X · From: spec.md\n"), base_sha="a" * 40)


def test_load_from_registry_freezes_canonical_plan(tmp_path):
    change_id = "AID-2732-plan-status-canonical-header"
    root = tmp_path / "intent" / change_id
    root.mkdir(parents=True)
    (root / "intent.md").write_text("# Intent\n", encoding="utf-8")
    (root / "spec.md").write_text("# Spec\n", encoding="utf-8")
    (root / "plan.md").write_text(
        "# Plan\n\n"
        "Change-id: AID-2732-plan-status-canonical-header · "
        "From: intent/AID-2732-plan-status-canonical-header/spec.md · Status: approved\n",
        encoding="utf-8",
    )
    (root / "checks.md").write_text("C1 | profile=cheap | true\n", encoding="utf-8")
    contract = load_from_registry(tmp_path / "intent", change_id, "b" * 40)
    assert contract.base_sha == "b" * 40
    assert contract.digest
