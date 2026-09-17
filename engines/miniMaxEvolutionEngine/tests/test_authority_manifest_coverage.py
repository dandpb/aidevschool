"""The public manifest links the authority contracts and their proofs."""

from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[3]


@pytest.mark.parametrize("reference", [
    "engines/openclaw/runner/pipeline_status.py",
    "CONTEXT-MAP.md", "learner/CONTEXT.md",
    "engines/miniMaxEvolutionEngine/CONTEXT.md",
    "engines/aiDevschoolMvp/README.md",
    "engines/openclaw/tests/test_provenance.py",
    "engines/miniMaxEvolutionEngine/tests/test_context_authority.py",
    "engines/miniMaxEvolutionEngine/tests/test_authority_contract_semantics.py",
])
def test_authority_manifest_links_contracts_and_proofs(reference: str) -> None:
    manifest = (ROOT / "engines/codexDojo/ecosystem/MANIFEST.md").read_text()
    assert f"`{reference}`" in manifest
    assert (ROOT / reference).is_file()
