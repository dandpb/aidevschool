#!/usr/bin/env python3
"""Validate the PhaseRunner seam in miniMaxEvolutionEngine slash commands."""

import re
import sys
from pathlib import Path

import yaml

COMMANDS_DIR = Path(__file__).resolve().parent.parent
REQUIRED_SPEC_FIELDS = {
    "phase",
    "producer",
    "verifier_phase",
    "next_status",
}
OPTIONAL_SPEC_FIELDS = {
    "pre_condition",
    "parallel",
    "learning_gate_check",
    "artefact",
}
PHASE_COMMANDS = ("spec.md", "implement.md", "review.md", "benchmark.md", "optimize.md")


def parse_frontmatter_and_body(path: Path) -> tuple[dict, str]:
    text = path.read_text(encoding="utf-8")
    if not text.startswith("---"):
        raise ValueError(f"{path.name}: missing YAML frontmatter")
    _, rest = text.split("---", 1)
    parts = rest.split("---", 1)
    if len(parts) != 2:
        raise ValueError(f"{path.name}: malformed frontmatter")
    fm_text, body = parts
    frontmatter: dict[str, str] = {}
    for line in fm_text.strip().splitlines():
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        frontmatter[key.strip()] = value.strip()
    return frontmatter, body


def test_phaserunner_interface() -> None:
    path = COMMANDS_DIR / "phaserunner.md"
    assert path.exists(), "phaserunner.md must exist"
    fm, body = parse_frontmatter_and_body(path)
    assert "description" in fm, "phaserunner.md must have description"
    assert "run_phase(spec)" in body, "phaserunner.md must define run_phase(spec)"
    for section in ("Interface", "Inputs", "Invariants", "Steps"):
        assert section in body, f"phaserunner.md must have section: {section}"
    for field in REQUIRED_SPEC_FIELDS:
        assert field in body, f"phaserunner.md must document spec field: {field}"


def extract_spec_block(body: str) -> dict:
    match = re.search(r"```yaml(.*?)```", body, re.DOTALL)
    assert match, "phase command must contain a yaml spec block"
    raw = match.group(1).strip()
    return yaml.safe_load(raw) or {}


def test_phase_commands_use_phaserunner() -> None:
    for name in PHASE_COMMANDS:
        path = COMMANDS_DIR / name
        assert path.exists(), f"{name} must exist"
        fm, body = parse_frontmatter_and_body(path)
        assert "description" in fm, f"{name} must have frontmatter description"
        assert "run_phase(spec)" in body, f"{name} must invoke run_phase(spec)"
        spec = extract_spec_block(body)
        missing = REQUIRED_SPEC_FIELDS - set(spec.keys())
        assert not missing, f"{name} spec missing fields: {missing}"


def test_implement_phase_is_parallel_with_gate() -> None:
    _, body = parse_frontmatter_and_body(COMMANDS_DIR / "implement.md")
    spec = extract_spec_block(body)
    assert spec.get("parallel") is True, "implement must run producers in parallel"
    assert spec.get("learning_gate_check") is True, "implement must check learning gate"
    assert isinstance(spec.get("producer"), list), "implement producer must be a list"
    assert set(spec["producer"]) == {"dev-go", "dev-rust", "dev-node"}


def test_cycle_enumerates_all_phases() -> None:
    _, body = parse_frontmatter_and_body(COMMANDS_DIR / "cycle.md")
    for phase in ("spec", "impl", "review", "benchmark", "optimize"):
        assert f"phase: {phase}" in body, f"cycle.md must reference phase {phase}"
    assert "run_phase(spec)" in body, "cycle.md must invoke run_phase(spec)"


def test_verify_references_phaserunner_discipline() -> None:
    _, body = parse_frontmatter_and_body(COMMANDS_DIR / "verify.md")
    assert "PhaseRunner" in body, "verify.md must reference PhaseRunner"
    assert "phaserunner.md" in body, "verify.md must reference phaserunner.md"


def test_no_inline_orchestration_duplication() -> None:
    """Phase commands must not repeat the full PhaseRunner step sequence inline."""
    orchestration_steps = [
        "read-state",
        "check-gate",
        "dispatch producer",
        "dispatch verifier",
        "update status",
        "retry",
    ]
    for name in PHASE_COMMANDS:
        _, body = parse_frontmatter_and_body(COMMANDS_DIR / name)
        steps_found = sum(1 for step in orchestration_steps if step in body.lower())
        assert steps_found < 3, (
            f"{name} should not duplicate PhaseRunner orchestration steps inline "
            f"(found {steps_found})"
        )


def main() -> int:
    tests = [
        test_phaserunner_interface,
        test_phase_commands_use_phaserunner,
        test_implement_phase_is_parallel_with_gate,
        test_cycle_enumerates_all_phases,
        test_verify_references_phaserunner_discipline,
        test_no_inline_orchestration_duplication,
    ]
    failures = 0
    for test in tests:
        try:
            test()
            print(f"PASS {test.__name__}")
        except AssertionError as exc:
            print(f"FAIL {test.__name__}: {exc}")
            failures += 1
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
