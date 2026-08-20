from dataclasses import replace
from pathlib import Path

from readiness_test_support import register_tools_package


register_tools_package()

from product_readiness_tools.load import load_domain
from product_readiness_tools.models import ManualRefs, ScenarioId
from product_readiness_tools.validate import validate_domain


REPO_ROOT = Path(__file__).resolve().parents[3]
READINESS_ROOT = REPO_ROOT / "docs" / "product-readiness"


def test_validate_domain_accepts_standalone_literacy_slice() -> None:
    # Given the canonical standalone LiteracyDojo slice
    domain = load_domain(READINESS_ROOT)

    # When it is validated, then no semantic errors are reported
    assert validate_domain(domain, REPO_ROOT) == ()


def test_validate_domain_rejects_dangling_scenario_ids() -> None:
    # Given a use case that references an unknown scenario
    domain = load_domain(READINESS_ROOT)
    invalid_use_case = replace(
        domain.use_cases[0],
        scenario_ids=domain.use_cases[0].scenario_ids + (ScenarioId("missing-scenario"),),
    )

    # When it is validated
    errors = validate_domain(replace(domain, use_cases=(invalid_use_case,)), REPO_ROOT)

    # Then the dangling identifier is rejected
    assert any("missing-scenario" in error for error in errors)


def test_validate_domain_rejects_scenario_owned_by_another_use_case() -> None:
    domain = load_domain(READINESS_ROOT)
    invalid_use_case = replace(
        domain.use_cases[1],
        scenario_ids=domain.use_cases[1].scenario_ids + (ScenarioId("os-onboarding-track-choice"),),
    )

    errors = validate_domain(
        replace(domain, use_cases=(domain.use_cases[0], invalid_use_case, *domain.use_cases[2:])),
        REPO_ROOT,
    )

    assert any("belongs to os-returning-learner" in error for error in errors)


def test_validate_domain_rejects_missing_manual_anchor() -> None:
    # Given a manual reference whose anchor does not exist
    domain = load_domain(READINESS_ROOT)
    invalid_use_case = replace(
        domain.use_cases[0],
        manual_refs=ManualRefs(
            student="student-guide.md#missing-anchor",
            facilitator=domain.use_cases[0].manual_refs.facilitator,
        ),
    )

    # When it is validated
    errors = validate_domain(replace(domain, use_cases=(invalid_use_case,)), REPO_ROOT)

    # Then the missing anchor is rejected
    assert any("missing-anchor" in error for error in errors)
