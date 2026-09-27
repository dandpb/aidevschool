"""CI smoke de registry (AID-2732, propostas 6/AID-2684 + 7/AID-2683).

Todo `intent/*/` com `checks.md` (definição operacional de registro de
fábrica) tem de carregar via `load_from_registry`. Roda no checkout do CI a
cada PR/push — pega a classe B5 (header canônico rejeitado pelo contrato)
para qualquer registro futuro, não apenas o canônico AID-2676.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from factory.contract import ContractError, load_from_registry

REPO_ROOT = Path(__file__).resolve().parents[2]
INTENT_ROOT = REPO_ROOT / "intent"


def factory_registries() -> list[str]:
    return sorted(
        p.parent.name for p in INTENT_ROOT.glob("*/checks.md")
    )


def test_intent_root_exists_with_factory_registries():
    assert INTENT_ROOT.is_dir()
    found = factory_registries()
    assert found, "no factory registries found (intent/*/checks.md)"


@pytest.mark.parametrize("change_id", factory_registries() or ["__none__"])
def test_every_factory_registry_loads(change_id):
    if change_id == "__none__":
        pytest.skip("no factory registries")
    contract = load_from_registry(INTENT_ROOT, change_id, base_sha="HEAD")
    assert contract.change_id == change_id
    assert contract.checks, f"{change_id}: checks.md parsed empty"


def test_invalid_registry_fails_closed(tmp_path):
    """Caso negativo do smoke: registro inválido DEVE falhar (não pular)."""
    reg = tmp_path / "intent" / "broken-1"
    reg.mkdir(parents=True)
    (reg / "intent.md").write_text("# Intent\n\nStatus: accepted\n", encoding="utf-8")
    (reg / "spec.md").write_text("# Spec\n", encoding="utf-8")
    # header cita a aprovação em prosa, sem campo de header válido
    (reg / "plan.md").write_text(
        "# Plan\n\nO template manda escrever `Status: approved` no header.\n",
        encoding="utf-8",
    )
    (reg / "checks.md").write_text(
        "# Checks\n\n```\nC1 | profile=cheap | true\n```\n", encoding="utf-8"
    )
    with pytest.raises(ContractError):
        load_from_registry(tmp_path / "intent", "broken-1", base_sha="HEAD")
