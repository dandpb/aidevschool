"""Regressões P4 de clean-room verify (AID-2716 / AID-2730).

S6 (stress AID-2686, confirmado first-hand pelo SM na base `43dd3e2e`):
o Verifier rodava os checks na MESMA worktree suja do autor — um
`conftest.py` untracked com `raise SystemExit(0)` mascarava uma regressão
real commitada e o gate promovia. Correção (proposta 3/AID-2686): checks em
worktree NOVA criada no `build_sha`; auditoria fail-closed da árvore do
autor em prove; `capture_tree_state` re-executado APÓS os checks fecha o
TOCTOU da mesma raiz. Efeito colateral declarado: fecha também o vetor
S3b (AID-2683) de verify sobre árvore suja tracked.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from factory.coordinator import Coordinator, CoordinatorError
from factory.model import WorkEvent
from factory.tests.test_factory_poc import (
    AUTHOR, VERIFIER, make_product_repo, make_registry,
)

GIT_ENV = (
    "git config user.email a@a && git config user.name A && "
)


def decision_ok(coord: Coordinator) -> bool:
    decision = coord.gate("run-FE-S6", "ctx-coordinator")
    assert decision.ok, decision.reasons
    assert coord._load_state("run-FE-S6")["station"] == "promoted"
    return True


def setup_cleanroom_run(tmp: Path, change_id: str = "s6-1", checks_cmd: str = "test -f feature.txt"):
    repo = make_product_repo(tmp)
    registry = make_registry(repo, change_id, checks_cmd)
    home = tmp / "factory-home"
    coord = Coordinator(repo=repo, home=home, registry=registry)
    coord.intake(WorkEvent(id="FE-S6", origin="AID-2716", scope="stress", risk="low"))
    coord.claim("FE-S6", AUTHOR)
    coord.freeze("run-FE-S6", change_id, AUTHOR)
    return coord, repo, home


class TestS6UntrackedPoisonDoesNotPromote:
    """Veneno untracked presente em build E verify NÃO promove (aceite 3)."""

    def test_untracked_poison_blocks_at_prove_with_reason(self, tmp_path):
        coord, repo, home = setup_cleanroom_run(tmp_path)
        # Autor commita um commit vazio (a "regressão": feature.txt fora do
        # commit) e deixa o satisfator do check como untracked — o veneno S6.
        coord.build(
            "run-FE-S6", AUTHOR,
            GIT_ENV + "echo poison > feature.txt && git commit -q --allow-empty -m feat",
        )
        state = coord._load_state("run-FE-S6")
        assert state["build_untracked"] == ["feature.txt"]  # veneno presente no build

        with pytest.raises(CoordinatorError, match="untracked files at prove time"):
            coord.prove("run-FE-S6", VERIFIER)

        # Fail-closed: sem transição verified no ledger, sem promote.
        assert coord._load_state("run-FE-S6")["station"] == "blocked"
        assert not coord._ledger("run-FE-S6").find("verified")
        decision = coord.gate("run-FE-S6", "ctx-coordinator")
        assert decision.verdict == "block"
        assert any("untracked files at prove time" in r for r in decision.reasons)
        prove_receipt = coord._ledger("run-FE-S6").find("blocked")[0]
        assert prove_receipt.actor_role == "verifier"
        assert prove_receipt.detail["clean_room"] is True
        assert prove_receipt.detail["reasons"]
        assert coord._ledger("run-FE-S6").verify_chain()


class TestCleanRoomExecution:
    """Checks rodam em worktree nova no build_sha (aceite 1)."""

    def test_prove_uses_dedicated_cleanroom_and_promotes(self, tmp_path):
        coord, repo, home = setup_cleanroom_run(tmp_path)
        coord.build(
            "run-FE-S6", AUTHOR,
            GIT_ENV + "echo hi > feature.txt && git add -A && git commit -qm feat",
        )
        state = coord._load_state("run-FE-S6")
        result = coord.prove("run-FE-S6", VERIFIER)
        after = coord._load_state("run-FE-S6")

        cleanroom = Path(after["verify_worktree"])
        assert cleanroom != Path(state["worktree"])
        assert cleanroom == home / "worktrees" / "run-FE-S6-cleanroom"
        assert cleanroom.exists()
        assert after["verify_sha"] == state["build_sha"]  # checks no SHA provado
        assert result.all_passed
        assert decision_ok(coord)

    def test_tracked_dirty_author_tree_cannot_mask_regression(self, tmp_path):
        """S3b (AID-2683) / F6 (AID-2822): conserto local NÃO commitado não
        engana a proof — desde AID-2822 a auditoria de prove é fail-closed:
        rastreado modificado na worktree do autor bloqueia ANTES de qualquer
        check (antes o check rodava na clean-room via `??`-only cego ao dirty;
        agora a run nem chega a `verified`)."""
        coord, repo, home = setup_cleanroom_run(
            tmp_path, change_id="s3b-1", checks_cmd='test "$(cat app.txt)" = v2',
        )
        # Commit carrega v2-broken (regressão); a worktree do autor ganha o
        # conserto v2 só localmente (tracked dirty, sem untracked).
        coord.build(
            "run-FE-S6", AUTHOR,
            GIT_ENV + "echo v2-broken > app.txt && git add -A && git commit -qm feat "
            "&& echo v2 > app.txt",
        )
        with pytest.raises(CoordinatorError, match="tracked modifications at prove time"):
            coord.prove("run-FE-S6", VERIFIER)
        # Fail-closed: sem transição verified no ledger, sem promote.
        assert coord._load_state("run-FE-S6")["station"] == "blocked"
        assert not coord._ledger("run-FE-S6").find("verified")
        decision = coord.gate("run-FE-S6", "ctx-coordinator")
        assert decision.verdict == "block"
        assert any("tracked modifications at prove time" in r for r in decision.reasons)


class TestToctouDuringChecks:
    """capture_tree_state re-executado APÓS os checks (aceite 2)."""

    def test_tree_mutation_during_checks_is_blocking_drift(self, tmp_path):
        coord, repo, home = setup_cleanroom_run(
            tmp_path, change_id="toctou-1", checks_cmd="touch evil.txt; test -f app.txt",
        )
        coord.build(
            "run-FE-S6", AUTHOR,
            GIT_ENV + "echo hi > feature.txt && git add -A && git commit -qm feat",
        )
        with pytest.raises(CoordinatorError, match="tree mutated while checks ran"):
            coord.prove("run-FE-S6", VERIFIER)
        state = coord._load_state("run-FE-S6")
        assert state["station"] == "blocked"
        assert not coord._ledger("run-FE-S6").find("verified")
        assert any("evil.txt" in r for r in state["prove_blockers"])
        decision = coord.gate("run-FE-S6", "ctx-coordinator")
        assert decision.verdict == "block"

    def test_generated_artifacts_do_not_block(self, tmp_path):
        """Bytools (caches/bytecode) gerados pelos checks não são drift."""
        coord, repo, home = setup_cleanroom_run(
            tmp_path, change_id="gen-1",
            checks_cmd="mkdir -p .pytest_cache __pycache__ && "
                       "echo x > .pytest_cache/lastfailed && "
                       "echo x > __pycache__/m.cpython-311.pyc && "
                       "echo x > .coverage && "
                       "test -f app.txt",
        )
        coord.build(
            "run-FE-S6", AUTHOR,
            GIT_ENV + "echo hi > feature.txt && git add -A && git commit -qm feat",
        )
        result = coord.prove("run-FE-S6", VERIFIER)
        assert result.all_passed
        state = coord._load_state("run-FE-S6")
        assert state["verify_untracked"] == []  # significativo permanece vazio
        assert state["verify_generated_untracked"]
        assert all(
            "__pycache__" in p or ".pytest_cache" in p or p.endswith(".coverage")
            for p in state["verify_generated_untracked"]
        )
        assert decision_ok(coord)

