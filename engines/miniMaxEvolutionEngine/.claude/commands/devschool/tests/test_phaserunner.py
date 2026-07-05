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

# Tutor-core commands (added 2026-06-21) — each one is a thin invocation of a subagent
# that backs a specific Ágora Continuum role. They don't go through the PhaseRunner
# (they're not phase producers), but they share the same frontmatter discipline and
# must reference the canonical subagent prompt under `engines/miniMaxEvolutionEngine/.claude/agents/`.
TUTOR_CORE_COMMANDS = {
    "socratic.md": "socrates",
    "recall.md": "mneme",
    "mnemosyne-compact.md": "mnemosyne",
    "decide.md": "seneca",
    "audit.md": "verifier-haiku",
    "cron-list.md": "cronos",
}
TUTOR_CORE_AGENTS_DIR = COMMANDS_DIR.parent.parent / "agents"


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


def test_review_command_is_runnable() -> None:
    """Fase 3: pre-condition, artefacts, evidence rule, verifier gate, transition."""
    _, body = parse_frontmatter_and_body(COMMANDS_DIR / "review.md")
    for anchor in (
        "code_review.md",
        "learning_notes.md",
        "quiz.md",
        "impl-done",
        "review-done",
        "verifier",
        "arquivo:linha",  # no claims without file:line evidence
    ):
        assert anchor in body, f"review.md must reference: {anchor}"
    spec = extract_spec_block(body)
    assert spec["pre_condition"] == "impl-done"
    assert spec["next_status"] == "review-done"


def test_benchmark_command_uses_native_harness() -> None:
    """Fase 4: native no-Docker harness, N>=3 raw runs, median+stdev honesty."""
    _, body = parse_frontmatter_and_body(COMMANDS_DIR / "benchmark.md")
    for anchor in (
        "native_runner.sh",
        "N≥3",
        "benchmarks/results/native/",
        "benchmark_results.md",
        "mediana",
        "benchmark-done",
    ):
        assert anchor in body, f"benchmark.md must reference: {anchor}"
    assert "docker build" not in body.lower(), (
        "benchmark.md must not mandate Docker builds (native harness is the default)"
    )
    spec = extract_spec_block(body)
    assert spec["pre_condition"] == "review-done"
    assert spec["next_status"] == "benchmark-done"


def test_optimize_command_closes_cycle() -> None:
    """Fase 5: consumes review+benchmark evidence, re-measures, closes the cycle."""
    _, body = parse_frontmatter_and_body(COMMANDS_DIR / "optimize.md")
    for anchor in (
        "evolution_report.md",
        "code_review.md",
        "benchmark_results.md",
        "native_runner.sh",  # re-measure with the SAME harness
        "N≥3",
        "rejeitada",
        "cycle-complete",
        "/devschool-next",
    ):
        assert anchor in body, f"optimize.md must reference: {anchor}"
    spec = extract_spec_block(body)
    assert spec["pre_condition"] == "benchmark-done"
    assert spec["next_status"] == "cycle-complete"


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


def test_tutor_core_commands_have_frontmatter() -> None:
    """Every tutor-core command (added 2026-06-21) must declare its `description`
    and `argument-hint` (when applicable), and reference the canonical subagent
    prompt file under `engines/miniMaxEvolutionEngine/.claude/agents/`.
    """
    for name, subagent in TUTOR_CORE_COMMANDS.items():
        path = COMMANDS_DIR / name
        assert path.exists(), f"tutor-core command missing: {name}"
        fm, body = parse_frontmatter_and_body(path)
        assert "description" in fm, f"{name} must have frontmatter description"
        # The command body must dispatch the named subagent via the Task tool.
        assert f"`{subagent}`" in body, (
            f"{name} must dispatch the `{subagent}` subagent"
        )
        # The canonical subagent prompt must exist.
        agent_path = TUTOR_CORE_AGENTS_DIR / f"{subagent}.md"
        assert agent_path.exists(), (
            f"{name} dispatches `{subagent}` but no agent file at {agent_path}"
        )


def test_tutor_core_commands_do_not_invoke_phaserunner() -> None:
    """Tutor-core commands route through subagents, not the PhaseRunner seam.
    They are not phase producers; they sit outside the 5-phase cycle.
    """
    for name in TUTOR_CORE_COMMANDS:
        _, body = parse_frontmatter_and_body(COMMANDS_DIR / name)
        assert "run_phase(spec)" not in body, (
            f"{name} is a tutor-core command; it must not invoke the PhaseRunner"
        )


def test_diagnose_references_canonical_sonda_prompt() -> None:
    """The diagnose command is the entry point for the learning gate. It must
    read the canonical Sonda prompt (not inline the protocol).
    """
    _, body = parse_frontmatter_and_body(COMMANDS_DIR / "diagnose.md")
    assert "sonda" in body, "diagnose.md must dispatch sonda"
    assert (
        "learning_state.yaml" in body
    ), "diagnose.md must read learner/learning_state.yaml"
    assert (
        "diagnostic" in body.lower()
    ), "diagnose.md must reference the diagnostic file"


def main() -> int:
    tests = [
        test_phaserunner_interface,
        test_phase_commands_use_phaserunner,
        test_implement_phase_is_parallel_with_gate,
        test_review_command_is_runnable,
        test_benchmark_command_uses_native_harness,
        test_optimize_command_closes_cycle,
        test_cycle_enumerates_all_phases,
        test_verify_references_phaserunner_discipline,
        test_no_inline_orchestration_duplication,
        test_tutor_core_commands_have_frontmatter,
        test_tutor_core_commands_do_not_invoke_phaserunner,
        test_diagnose_references_canonical_sonda_prompt,
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
