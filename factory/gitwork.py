"""Estação Construir: worktree isolado, SHA pinado, estado de árvore (P4).

- O worktree parte da base acordada (contrato), nunca do checkout sujo.
- O recibo de build grava o SHA resultante e o snapshot da árvore
  (arquivos rastreados + não-rastreados) — a promoção compara os snapshots
  de build e verify: SHA divergente ou arquivo não-rastreado novo bloqueia.
"""

from __future__ import annotations

import subprocess
from dataclasses import dataclass
from pathlib import Path


class GitError(RuntimeError):
    pass


def _git(repo: Path, *args: str, check: bool = True) -> subprocess.CompletedProcess:
    proc = subprocess.run(
        ["git", "-C", str(repo), *args],
        capture_output=True,
        text=True,
        timeout=300,
    )
    if check and proc.returncode != 0:
        raise GitError(f"git {' '.join(args)} failed: {proc.stderr.strip()}")
    return proc


@dataclass
class TreeState:
    sha: str
    untracked: list[str]

    def to_dict(self) -> dict:
        return {"sha": self.sha, "untracked": sorted(self.untracked)}


def capture_tree_state(worktree: Path) -> TreeState:
    sha = _git(worktree, "rev-parse", "HEAD").stdout.strip()
    status = _git(worktree, "status", "--porcelain").stdout
    untracked = [
        line[3:].strip().strip('"')
        for line in status.splitlines()
        if line.startswith("??")
    ]
    return TreeState(sha=sha, untracked=untracked)


def create_worktree(repo: Path, base_sha: str, worktree_path: Path) -> Path:
    """Cria worktree isolado exatamente no SHA da base acordada."""
    _git(repo, "cat-file", "-e", f"{base_sha}^{{commit}}")
    worktree_path.parent.mkdir(parents=True, exist_ok=True)
    _git(repo, "worktree", "add", "--detach", str(worktree_path), base_sha)
    return worktree_path


def remove_worktree(repo: Path, worktree_path: Path) -> None:
    _git(repo, "worktree", "remove", "--force", str(worktree_path), check=False)


def commit_all(worktree: Path, message: str) -> str:
    _git(worktree, "add", "-A")
    _git(worktree, "commit", "-m", message)
    return _git(worktree, "rev-parse", "HEAD").stdout.strip()


def tree_drift(before: TreeState, after: TreeState) -> list[str]:
    """Drift relevante entre dois snapshots (P4).

    - mesmo SHA exigido;
    - arquivo não-rastreado novo entre build e verify = drift.
    """
    reasons: list[str] = []
    if before.sha != after.sha:
        reasons.append(f"P4: sha drifted — build {before.sha} vs verify {after.sha}")
    new_untracked = sorted(set(after.untracked) - set(before.untracked))
    if new_untracked:
        reasons.append(f"P4: untracked files changed after build: {new_untracked}")
    return reasons
