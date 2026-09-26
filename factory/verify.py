"""Estação Provar: Verifier separado executa os checks e liga a prova ao SHA.

P2 — todo check aprovado tem prova (comando, exit code, digest do output);
perfil `standard` exige que TODAS as provas tenham sido produzidas pelo
contexto verificador (não pelo autor) e revalida os digests dos outputs.

P3 — autor e Verifier são contextos distintos; o gate recusa veredito do
mesmo contexto que assinou o build.
"""

from __future__ import annotations

import subprocess
from dataclasses import dataclass, field
from pathlib import Path

from .contract import Contract
from .model import Proof, sha256_text, utcnow


@dataclass
class VerifyResult:
    context_id: str
    sha: str
    untracked: list[str] = field(default_factory=list)
    proofs: list[Proof] = field(default_factory=list)

    @property
    def all_passed(self) -> bool:
        return bool(self.proofs) and all(p.passed for p in self.proofs)

    def proof_of(self, check_id: str) -> Proof | None:
        return next((p for p in self.proofs if p.check_id == check_id), None)


def run_checks(
    contract: Contract,
    worktree: Path,
    context_id: str,
    outputs_dir: Path,
) -> VerifyResult:
    """Executa cada check do contrato no worktree e grava a prova em disco."""
    from .gitwork import capture_tree_state

    outputs_dir.mkdir(parents=True, exist_ok=True)
    tree = capture_tree_state(worktree)
    sha, untracked = tree.sha, tree.untracked
    proofs: list[Proof] = []
    for check in contract.checks:
        started = utcnow()
        proc = subprocess.run(
            ["bash", "-c", check.cmd],
            cwd=str(worktree),
            capture_output=True,
            text=True,
            timeout=1800,
        )
        finished = utcnow()
        output = f"exit={proc.returncode}\n--- stdout ---\n{proc.stdout}\n--- stderr ---\n{proc.stderr}"
        out_name = f"{check.id}.output.txt"
        (outputs_dir / out_name).write_text(output, encoding="utf-8")
        proofs.append(
            Proof(
                check_id=check.id,
                cmd=check.cmd,
                exit_code=proc.returncode,
                output_sha256=sha256_text(output),
                started_at=started,
                finished_at=finished,
                context_id=context_id,
                output_path=str((outputs_dir / out_name)),
            )
        )
    return VerifyResult(context_id=context_id, sha=sha, untracked=untracked, proofs=proofs)


def revalidate_proofs(result: VerifyResult) -> list[str]:
    """Recomputa o digest de cada output arquivado (P2: prova sem output
    correspondente não conta como PASS)."""
    problems: list[str] = []
    for proof in result.proofs:
        path = Path(proof.output_path)
        if not path.exists():
            problems.append(f"{proof.check_id}: proof output file missing")
            continue
        if sha256_text(path.read_text(encoding="utf-8")) != proof.output_sha256:
            problems.append(f"{proof.check_id}: proof output digest mismatch")
    return problems


def standard_profile_gaps(contract: Contract, result: VerifyResult) -> list[str]:
    """Perfil standard: provas produzidas pelo contexto verificador (P2/P3)."""
    gaps: list[str] = []
    for check in contract.checks:
        if check.profile != "standard":
            continue
        proof = result.proof_of(check.id)
        if proof is None:
            gaps.append(f"{check.id}: standard check without proof")
        elif proof.context_id != result.context_id:
            gaps.append(
                f"{check.id}: standard check proof produced by {proof.context_id}, "
                f"not verifier {result.context_id}"
            )
    return gaps
