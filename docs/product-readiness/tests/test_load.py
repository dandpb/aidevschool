from pathlib import Path

import pytest
import yaml

from readiness_test_support import register_tools_package


register_tools_package()

from product_readiness_tools.load import DomainParseError, load_domain
from product_readiness_tools.models import ReadinessTier


REPO_ROOT = Path(__file__).resolve().parents[3]
READINESS_ROOT = REPO_ROOT / "docs" / "product-readiness"


def test_load_domain_parses_closed_typed_records() -> None:
    # Given the canonical readiness files
    # When the domain is loaded
    domain = load_domain(READINESS_ROOT)

    # Then the intended tier is represented by the closed enum
    assert domain.use_cases[0].intended_tier is ReadinessTier.CUSTOMER_READY
    assert tuple(scenario.id for scenario in domain.scenarios) == (
        "dojotoday-active-unit-guidance",
        "dojotoday-read-only-boundary",
        "literacy-happy-path",
        "literacy-resume",
        "literacy-retry",
        "minitown-explore-only",
        "os-literacy-hosted-mission",
        "os-literacy-returning-device",
        "os-onboarding-track-choice",
        "os-renderer-accessibility-recovery",
        "os-returning-device",
        "os-returning-recovery",
        "os-verification-recovery",
        "os-voxel-hosted-missions",
        "os-voxel-returning-device",
        "pixelquest-encounter-evidence",
        "pixelquest-evidence-recovery",
        "voxel-accessible-renderer",
        "voxel-standalone-loop",
    )


def test_load_domain_rejects_unknown_inventory_fields(tmp_path: Path) -> None:
    # Given an inventory record with an undeclared field
    inventory = yaml.safe_load((READINESS_ROOT / "inventory.yaml").read_text(encoding="utf-8"))
    inventory["useCases"][0]["readinessGranted"] = True
    target = tmp_path / "product-readiness"
    target.mkdir()
    (target / "inventory.yaml").write_text(yaml.safe_dump(inventory), encoding="utf-8")
    (target / "policy.yaml").write_text(
        (READINESS_ROOT / "policy.yaml").read_text(encoding="utf-8"), encoding="utf-8"
    )
    (target / "scenarios").symlink_to(READINESS_ROOT / "scenarios", target_is_directory=True)

    # When the domain is loaded, then parsing fails closed
    with pytest.raises(DomainParseError, match="readinessGranted"):
        load_domain(target)
