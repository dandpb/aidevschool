from pathlib import Path

import pytest
import yaml

from readiness_test_support import register_tools_package


register_tools_package()

from product_readiness_tools.load import DomainParseError, load_domain


REPO_ROOT = Path(__file__).resolve().parents[3]
READINESS_ROOT = REPO_ROOT / "docs" / "product-readiness"


def test_load_domain_parses_publication_gate_and_fails_closed_on_unknown_gate_fields(tmp_path: Path) -> None:
    # Given the canonical policy declares the publication gate (AID-6005)
    domain = load_domain(READINESS_ROOT)

    # Then the gate is parsed closed-typed with the approved requirements
    gate = domain.policy.publication_gate
    assert gate is not None
    assert gate.introduced_by is not None and "AID-6005" in gate.introduced_by
    assert len(gate.requirements) == 4
    assert all(requirement.strip() for requirement in gate.requirements)

    # Given a policy copy with an undeclared field inside the gate
    target = tmp_path / "product-readiness"
    target.mkdir()
    policy = yaml.safe_load((READINESS_ROOT / "policy.yaml").read_text(encoding="utf-8"))
    policy["publicationGate"]["enforcedBy"] = "nobody"
    (target / "policy.yaml").write_text(yaml.safe_dump(policy), encoding="utf-8")
    (target / "inventory.yaml").write_text(
        (READINESS_ROOT / "inventory.yaml").read_text(encoding="utf-8"), encoding="utf-8"
    )
    (target / "scenarios").symlink_to(READINESS_ROOT / "scenarios", target_is_directory=True)

    # When the domain is loaded, then parsing fails closed on the gate shape
    with pytest.raises(DomainParseError, match="enforcedBy"):
        load_domain(target)
