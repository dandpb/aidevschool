"""Regressões F6/F2 do stress AID-2700 (AID-2822).

F6 — prova examina árvore suja; commit promovido ≠ evidência selada:
`capture_tree_state` era `??`-only — rastreado modificado entre o commit do
build e o prove era invisível ao gate (repro do stress: sed flip
`Status: proposed → accepted` SEM commit; promote rc=0). Agora o porcelain
inteiro é fotografado (`dirty`), a auditoria de prove exige árvore limpa
(fail-closed) e mutação rastreada DURANTE os checks na clean-room é drift.
Complementa o clean-room verify (AID-2716/AID-2730), que já roda os checks em
worktree nova no `build_sha`.

F2 — `resume()` resetava risk="low" no retry: a retomada da MESMA decisão
medium/high dispensava a revisão humana (X5/AID-2719). Agora o retry herda o
risco de origem; risco indeterminável é fail-closed sem spawn.
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from factory.coordinator import Coordinator, CoordinatorError
from factory.gitwork import (
    TreeState,
    capture_tree_state,
    post_check_drift,
    tree_drift,
)
from factory.model import WorkEvent
from factory.tests.test_factory_poc import (
    AUTHOR, VERIFIER, make_product_repo, make_registry,
)

GIT_ENV = (
    "git config user.email a@a && git config user.name A && "
)


def setup_run(
    tmp: Path,
    event_id: str = "FE-F6",
    change_id: str = "f6-1",
    checks_cmd: str = "test -f feature.txt",
    risk: str = "low",
):
    repo = make_product_repo(tmp)
    registry = make_registry(repo, change_id, checks_cmd)
    home = tmp / "factory-home"
    coord = Coordinator(repo=repo, home=home, registry=registry)
    coord.intake(WorkEvent(id=event_id, origin="AID-2822", scope="stress-f6f2", risk=risk))
    coord.claim(event_id, AUTHOR)
    coord.freeze(f"run-{event_id}", change_id, AUTHOR)
    return coord, repo, home


def _git(repo: Path, *args: str) -> str:
    proc = subprocess.run(["git", "-C", str(repo), *args], capture_output=True, text=True)
    assert proc.returncode == 0, proc.stderr
    return proc.stdout


class TestF6CaptureTreeState:
    """O snapshot enxerga rastreado modificado (antes: só `??`)."""

    def test_porcelain_classifies_tracked_and_untracked(self, tmp_path):
        repo = make_product_repo(tmp_path)
        (repo / "stray.txt").write_text("x", encoding="utf-8")
        (repo / "app.txt").write_text("v2\n", encoding="utf-8")  # rastreado modificado
        snap = capture_tree_state(repo)
        assert snap.untracked == ["stray.txt"]
        assert snap.dirty == ["app.txt"]
        assert snap.to_dict()["dirty"] == ["app.txt"]

    def test_staged_change_is_dirty_and_commit_cleans(self, tmp_path):
        repo = make_product_repo(tmp_path)
        (repo / "app.txt").write_text("v2\n", encoding="utf-8")
        _git(repo, "add", "-A")
        assert capture_tree_state(repo).dirty == ["app.txt"]  # staged: índice ≠ HEAD
        _git(repo, "commit", "-qm", "v2")
        assert capture_tree_state(repo).dirty == []


class TestF6StressRepro:
    """Repro do stress AID-2700: flip rastreado SEM commit entre build e prove."""

    def test_tracked_modified_between_build_and_prove_blocks(self, tmp_path):
        coord, repo, home = setup_run(
            tmp_path, change_id="f6-repro-1",
            checks_cmd="grep -q accepted docs/decision.txt",
        )
        coord.build(
            "run-FE-F6", AUTHOR,
            GIT_ENV + "mkdir -p docs && printf 'Status: proposed\\n' "
            "> docs/decision.txt && git add -A && git commit -qm decision",
        )
        state = coord._load_state("run-FE-F6")
        worktree = Path(state["worktree"])
        # O sed do stress: NÃO move o SHA, NÃO cria untracked — era invisível.
        subprocess.run(
            ["sed", "-i", "s/proposed/accepted/", str(worktree / "docs" / "decision.txt")],
            check=True,
        )
        assert capture_tree_state(worktree).dirty == ["docs/decision.txt"]

        with pytest.raises(CoordinatorError, match="tracked modifications at prove time"):
            coord.prove("run-FE-F6", VERIFIER)

        # Fail-closed: sem transição verified, sem promote — evidência selada
        # (accepted) jamais substitui o commit promovido (proposed).
        assert coord._load_state("run-FE-F6")["station"] == "blocked"
        assert not coord._ledger("run-FE-F6").find("verified")
        blocked = coord._ledger("run-FE-F6").find("blocked")[0]
        assert blocked.actor_role == "verifier"
        assert blocked.detail["clean_room"] is True
        decision = coord.gate("run-FE-F6", "ctx-coordinator")
        assert decision.verdict == "block"
        assert any("tracked modifications at prove time" in r for r in decision.reasons)
        assert coord._ledger("run-FE-F6").verify_chain()


class TestF6TrackedMutationDuringChecks:
    """TOCTOU rastreado na clean-room: prova selou examined_sha do snapshot
    anterior; árvore que mudou no intervalo não é evidência do commit."""

    def test_check_mutating_tracked_file_is_drift(self, tmp_path):
        coord, repo, home = setup_run(
            tmp_path, change_id="f6-toctou-1",
            checks_cmd="echo hacked >> app.txt; test -f app.txt",
        )
        coord.build(
            "run-FE-F6", AUTHOR,
            GIT_ENV + "echo hi > feature.txt && git add -A && git commit -qm feat",
        )
        with pytest.raises(CoordinatorError, match="tree mutated while checks ran"):
            coord.prove("run-FE-F6", VERIFIER)
        state = coord._load_state("run-FE-F6")
        assert state["station"] == "blocked"
        assert any("app.txt" in r for r in state["prove_blockers"])
        assert coord.gate("run-FE-F6", "ctx-coordinator").verdict == "block"
        assert not coord._ledger("run-FE-F6").find("verified")


class TestF6DriftUnits:
    def test_tree_drift_blocks_verify_side_dirty(self):
        before = TreeState(sha="a" * 40, untracked=[])
        after = TreeState(sha="a" * 40, untracked=[], dirty=["docs/x.md"])
        assert any(
            "tracked files modified between build and verify" in r
            for r in tree_drift(before, after)
        )

    def test_tree_drift_clean_snapshots_still_pass(self):
        assert tree_drift(
            TreeState(sha="a" * 40, untracked=[]), TreeState(sha="a" * 40, untracked=[])
        ) == []

    def test_post_check_drift_blocks_tracked_mutation(self):
        assert any(
            "tracked files modified" in r
            for r in post_check_drift(
                TreeState(sha="a" * 40, untracked=[]),
                TreeState(sha="a" * 40, untracked=[], dirty=["app.txt"]),
            )
        )

    def test_post_check_drift_clean_snapshots_still_pass(self):
        assert post_check_drift(
            TreeState(sha="a" * 40, untracked=[]), TreeState(sha="a" * 40, untracked=[])
        ) == []


class TestF2RetryRiskInheritance:
    """Retry herda o risco da decisão de origem — X5 não degrada no retry."""

    def _blocked_medium_run(self, tmp: Path) -> Coordinator:
        coord, repo, home = setup_run(
            tmp, event_id="FE-F2", change_id="f2-1",
            checks_cmd="test -f missing.txt", risk="medium",
        )
        coord.build(
            "run-FE-F2", AUTHOR,
            GIT_ENV + "echo hi > feature.txt && git add -A && git commit -qm feat",
        )
        coord.prove("run-FE-F2", VERIFIER)
        assert coord.gate("run-FE-F2", "ctx-coordinator").verdict == "block"
        return coord

    def test_retry_event_inherits_medium_risk(self, tmp_path):
        coord = self._blocked_medium_run(tmp_path)
        assert coord._load_state("run-FE-F2")["risk"] == "medium"
        coord.resume("run-FE-F2")
        retry = [e for e in coord.queue.pending() if e.id.startswith("FE-F2-retry")]
        assert retry, "retry event should be pending"
        assert retry[0].risk == "medium"  # antes: hardcoded low (bypass X5)
        assert retry[0].origin == "factory:run-FE-F2"

    def test_retry_risk_survives_second_generation(self, tmp_path):
        coord = self._blocked_medium_run(tmp_path)
        coord.resume("run-FE-F2")
        # A run do retry congela o MESMO risco (freeze lê o evento herdado).
        coord.claim("FE-F2-retry1", AUTHOR)
        coord.freeze("run-FE-F2-retry1", "f2-1", AUTHOR)
        assert coord._load_state("run-FE-F2-retry1")["risk"] == "medium"
        coord.build(
            "run-FE-F2-retry1", AUTHOR,
            GIT_ENV + "echo hi > feature.txt && git add -A && git commit -qm feat",
        )
        coord.prove("run-FE-F2-retry1", VERIFIER)
        assert coord.gate("run-FE-F2-retry1", "ctx-coordinator").verdict == "block"
        coord.resume("run-FE-F2-retry1")
        assert coord.queue.get("FE-F2-retry1-retry1").risk == "medium"

    def test_resume_fails_closed_when_risk_undeterminable(self, tmp_path):
        coord = self._blocked_medium_run(tmp_path)
        # Run legada pré-X5 (sem risk no state) + evento de fila perdido:
        # risco indeterminável — spawnar low seria o próprio bypass F2.
        state = coord._load_state("run-FE-F2")
        state.pop("risk", None)
        coord._save_state("run-FE-F2", state)
        (coord.home / "queue" / "FE-F2.json").unlink()
        with pytest.raises(CoordinatorError, match="risk of the original decision"):
            coord.resume("run-FE-F2")
        assert coord.queue.pending() == []  # nenhum retry spawnado
        # fail-closed sem efeito colateral persistido
        assert coord._load_state("run-FE-F2")["attempts"] == 1
