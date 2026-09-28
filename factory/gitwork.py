"""Estação Construir: worktree isolado, SHA pinado, estado de árvore (P4).

- O worktree parte da base acordada (contrato), nunca do checkout sujo.
- O recibo de build grava o SHA resultante e o snapshot da árvore
  (arquivos rastreados + não-rastreados) — a promoção compara os snapshots
  de build e verify: SHA divergente ou arquivo não-rastreado novo bloqueia.
"""

from __future__ import annotations

import shutil
import subprocess
from dataclasses import dataclass, field
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
    # AID-2822 (F6): rastreados com estado ≠ HEAD (modificado/staged/
    # deletado/renomeado). Default vazio mantém snapshots legados líveis.
    dirty: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "sha": self.sha,
            "untracked": sorted(self.untracked),
            "dirty": sorted(self.dirty),
        }


def capture_tree_state(worktree: Path) -> TreeState:
    """Fotografa TODA linha do porcelain (AID-2822 F6).

    `??` → untracked; qualquer outra linha (índice/worktree ≠ HEAD) → dirty.
    O snapshot `??`-only tornava rastreado modificado invisível ao gate —
    a prova podia examinar árvore diferente da árvore do commit promovido.
    """
    sha = _git(worktree, "rev-parse", "HEAD").stdout.strip()
    status = _git(worktree, "status", "--porcelain").stdout
    untracked: list[str] = []
    dirty: list[str] = []
    for line in status.splitlines():
        path = line[3:].strip().strip('"')
        if line.startswith("??"):
            untracked.append(path)
        else:
            dirty.append(path)
    return TreeState(sha=sha, untracked=untracked, dirty=dirty)


def _worktree_registered(repo: Path, worktree_path: Path) -> bool:
    out = _git(repo, "worktree", "list", "--porcelain").stdout
    target = Path(worktree_path).resolve()
    return any(
        line.startswith("worktree ") and Path(line.split(" ", 1)[1]).resolve() == target
        for line in out.splitlines()
    )


def reclaim_worktree(repo: Path, worktree_path: Path) -> None:
    """S1b (AID-2726): devolve o worktree de uma tentativa morta ao estado
    neutro — remove o registro (`worktree remove --force` + `prune`) e o
    diretório — para que recriar no mesmo caminho seja idempotente. Nunca é
    passo manual do operador."""
    _git(repo, "worktree", "remove", "--force", str(worktree_path), check=False)
    _git(repo, "worktree", "prune", check=False)
    if worktree_path.exists():
        shutil.rmtree(worktree_path, ignore_errors=True)


def create_worktree(repo: Path, base_sha: str, worktree_path: Path) -> Path:
    """Cria worktree isolado exatamente no SHA da base acordada.

    S1b (AID-2726): idempotente por estação — worktree existente (diretório
    ou registro stale) de tentativa morta é reclamado antes de recriar; kill
    durante o build não deixa órfão que trave o retry com GitError."""
    _git(repo, "cat-file", "-e", f"{base_sha}^{{commit}}")
    worktree_path.parent.mkdir(parents=True, exist_ok=True)
    if worktree_path.exists() or _worktree_registered(repo, worktree_path):
        reclaim_worktree(repo, worktree_path)
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
    - arquivo não-rastreado novo entre build e verify = drift;
    - AID-2822 (F6): rastreado modificado no snapshot do verify = drift —
      prova sobre árvore suja é evidência ≠ commit.
    """
    reasons: list[str] = []
    if before.sha != after.sha:
        reasons.append(f"P4: sha drifted — build {before.sha} vs verify {after.sha}")
    new_untracked = sorted(set(after.untracked) - set(before.untracked))
    if new_untracked:
        reasons.append(f"P4: untracked files changed after build: {new_untracked}")
    if after.dirty:
        reasons.append(
            f"P4: tracked files modified between build and verify: {sorted(after.dirty)}"
        )
    return reasons


# Artefatos gerados pelas próprias ferramentas de check (bytecode, caches).
# Não podem alterar a semântica de importação/execução dos checks e são
# excluídos da contabilidade de drift pós-checks (AID-2716/AID-2730).
GENERATED_ARTIFACT_DIRS = frozenset({"__pycache__", ".pytest_cache"})
GENERATED_ARTIFACT_SUFFIXES = frozenset({".pyc", ".pyo"})
GENERATED_ARTIFACT_NAMES = frozenset({".coverage"})


def is_generated_artifact(path: str) -> bool:
    clean = path.strip().strip('"')
    parts = Path(clean).parts
    if any(part in GENERATED_ARTIFACT_DIRS for part in parts):
        return True
    if clean in GENERATED_ARTIFACT_NAMES or parts[-1] in GENERATED_ARTIFACT_NAMES:
        return True
    return Path(clean).suffix in GENERATED_ARTIFACT_SUFFIXES


def meaningful_untracked(untracked: list[str]) -> list[str]:
    """Não-rastreados que importam para a prova (exclui artefatos gerados)."""
    return sorted(p for p in untracked if not is_generated_artifact(p))


def post_check_drift(before: TreeState, after: TreeState) -> list[str]:
    """Drift DURANTE a execução dos checks (TOCTOU da mesma raiz — AID-2716).

    Snapshot re-capturado após os checks: SHA movido (commit/reset concorrente),
    arquivo não-rastreado novo (mutação da árvore provada) ou rastreado
    modificado (AID-2822 F6 — `??`-only não via esta mutação) é drift
    bloqueante; artefatos gerados pelas ferramentas não são.
    """
    reasons: list[str] = []
    if before.sha != after.sha:
        reasons.append(
            f"P4: sha drifted while checks ran — {before.sha} -> {after.sha}"
        )
    new_untracked = sorted(
        p
        for p in set(after.untracked) - set(before.untracked)
        if not is_generated_artifact(p)
    )
    if new_untracked:
        reasons.append(
            f"P4: tree mutated while checks ran (new untracked): {new_untracked}"
        )
    if after.dirty:
        reasons.append(
            "P4: tree mutated while checks ran (tracked files modified): "
            f"{sorted(after.dirty)}"
        )
    return reasons
