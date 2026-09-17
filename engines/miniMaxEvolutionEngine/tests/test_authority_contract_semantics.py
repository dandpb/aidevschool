"""Required authority relationships, beyond vocabulary presence."""

from pathlib import Path
import json

import yaml

from engines.miniMaxEvolutionEngine.supervisor.__main__ import main

import pytest

ROOT = Path(__file__).resolve().parents[3]
CLAUDE = ROOT / "engines/miniMaxEvolutionEngine/.claude"


def _text(path: Path) -> str:
    return " ".join(path.read_text().split())


@pytest.mark.parametrize("agent,command", [
    ("curator", "spec"), ("dev-go", "implement"), ("dev-rust", "implement"),
    ("dev-node", "implement"), ("reviewer", "review"),
    ("benchmarker", "benchmark"), ("optimizer", "optimize"),
])
def test_producer_cannot_advance_without_orchestrator_and_independent_pass(agent, command) -> None:
    text = _text(CLAUDE / "agents" / f"{agent}.md")
    assert "proponha ao orquestrador o avanço" in text
    assert "Somente o orquestrador chama `save_status` após PASS independente" in text
    assert f"`grade=verified` e `advanced_by=/devschool-{command}`" in text
    assert "A entrega do produtor não autoriza avanço de fase por si só." in text
    assert "Ao terminar: atualize a máquina YAML" not in text
    assert "Ao terminar, atualize a máquina YAML" not in text


@pytest.mark.parametrize("command", ["spec", "implement", "review", "benchmark", "optimize", "cycle"])
def test_command_stamps_only_after_independent_pass(command) -> None:
    text = _text(CLAUDE / "commands/devschool" / f"{command}.md")
    assert "o orquestrador registra `grade=verified` e `advanced_by=/devschool-<command>` somente após PASS independente" in text
    assert "Ao alterar apenas blockers, preserve a procedência da fase atual" in text


def test_phase_runner_requires_independent_verifier_before_stamping() -> None:
    text = _text(CLAUDE / "commands/devschool/phaserunner.md")
    assert "Never write YAML machine state before the verifier returns PASS." in text
    assert 'On PASS, stamp `grade="verified"` and `advanced_by="/devschool-<command>"` before `save_status`' in text
    assert "Dispatch the verifier as a fresh Task with no hand-off from the producer except the artefact files themselves." in text
    assert "simulate e unspecified não substituem verified quando uma fase exige comprovação independente." in text
    assert "a produção do artefato sozinha não autoriza o avanço." in text


def test_mvp_result_does_not_confer_canonical_mastery() -> None:
    context = _text(ROOT / "CONTEXT-MAP.md")
    assert "MVP `MASTERED` is a verdict in the tutor's own ledger; it is not canonical mastery and has no automatic promotion path" in context
    assert "G1–G4 govern the MVP's 24-concept track; they are not aliases for the canonical gates" in context
    assert "MVP gap-ladder reviews and LiteracyDojo local skill reviews retain their own schedules; neither overwrites canonical FSRS" in context
    journey = _text(ROOT / "learner/CONTEXT.md")
    assert "It does not mean Canonical Mastered and does not confer a passing canonical Gate Outcome." in journey
    assert "distinct from the Learning Gate and Empirical Gate of this journey." in journey
    assert "distinct from both canonical FSRS reviews and local skill practice reviews in LiteracyDojo." in journey
    mvp = _text(ROOT / "engines/aiDevschoolMvp/README.md")
    assert "It does not update `learner/learning_state.yaml` or grant canonical mastery." in mvp
    assert "gap-ladder review scheduling is separate from canonical FSRS and from LiteracyDojo's local skill reviews." in mvp
    cycle = _text(ROOT / "engines/miniMaxEvolutionEngine/CONTEXT.md")
    assert "Only `verified` satisfies a verifier-backed prerequisite." in cycle
    assert "None of these grades grants learner mastery or MVP Mastery." in cycle


def test_status_preserves_mvp_runtime_and_canonical_data(tmp_path: Path, capsys) -> None:
    files = {
        "learner/pipeline_status.yaml": yaml.safe_dump({
            "cycle_id": "authority-test", "current_project": "curriculum/project",
            "phase": "spec", "blockers": [],
        }),
        "learner/learning_state.yaml": yaml.safe_dump({
            "active_unit": {"id": "unit", "project": "project", "state": "practicing"},
            "gate": {"implementation_blocked": False},
        }),
        "curriculum/project/docs/spec.md": "# Learner-owned project\n",
        "engines/aiDevschoolMvp/aidevschool/state.json": '{"mastery": "local"}\n',
    }
    for relative, content in files.items():
        path = tmp_path / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
    before = {p.relative_to(tmp_path): p.read_bytes() for p in tmp_path.rglob("*") if p.is_file()}

    assert main(["--repo-root", str(tmp_path), "status"]) == 0
    result = json.loads(capsys.readouterr().out)
    assert result["observed_phase"] == "spec"
    assert result["active_unit"] == "unit"
    assert result["pending_request"] is None
    assert before == {
        p.relative_to(tmp_path): p.read_bytes() for p in tmp_path.rglob("*") if p.is_file()
    }
