"""Gates de promoção — critérios de saída P1–P5 do piloto.

`evaluate` devolve (veredito, motivos). Fail-closed: qualquer regra sem
evidência bloqueia; exit 0 de processo isolado não significa PASS (HTML §03).
A promoção exige que contrato, build, prova e PR concordem sobre o MESMO SHA.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from .contract import Contract
from .gitwork import TreeState, tree_drift
from .model import evidence_digest, proof_evidence
from .verify import VerifyResult, revalidate_proofs, standard_profile_gaps


@dataclass
class GateDecision:
    verdict: str  # "promote" | "block"
    reasons: list[str] = field(default_factory=list)

    @property
    def ok(self) -> bool:
        return self.verdict == "promote"


def evidence_anchor_gaps(
    verify: VerifyResult, anchored: dict[str, str] | None
) -> list[str]:
    """AID-2715 — prova auto-atestada não é evidência.

    Os digests recalculados a partir do runtime (proofs.json + outputs) têm
    que bater com a âncora selada no recibo `verified` do ledger (cadeia de
    hashes). Sem âncora, ou com divergência, bloqueia — fail-closed.
    """
    if anchored is None:
        return ["P2: proof evidence has no ledger anchor (self-attested proofs refused)"]
    reasons: list[str] = []
    current: dict[str, str] = {}
    for proof in verify.proofs:
        digest = evidence_digest(proof_evidence(proof))
        current[proof.check_id] = digest
        if proof.check_id not in anchored:
            reasons.append(f"P2: {proof.check_id}: proof missing from ledger anchor")
        elif anchored[proof.check_id] != digest:
            reasons.append(
                f"P2: {proof.check_id}: proof evidence diverges from ledger anchor "
                "(tampered output and/or forged proofs.json)"
            )
    for check_id in anchored:
        if check_id not in current:
            reasons.append(f"P2: {check_id}: anchored proof missing from runtime proofs")
    return reasons


def evaluate(
    *,
    contract: Contract,
    frozen_digest: str,
    build: TreeState,
    verify: VerifyResult,
    author_context: str,
    pr_head_sha: str | None = None,
    anchored_evidence: dict[str, str] | None = None,
) -> GateDecision:
    reasons: list[str] = []

    # P4 — contrato congelado é o mesmo que o registro versionado espera.
    if contract.digest != frozen_digest:
        reasons.append(
            f"contract digest drifted: frozen {frozen_digest} vs registry {contract.digest}"
        )

    # P3 — autor e Verifier são execuções/contextos distintos.
    if verify.context_id == author_context:
        reasons.append(
            "P3: author and verifier are the same context "
            f"({author_context}) — producer never verifies its own work"
        )

    # P4 — SHA e árvore examinados: build e verify viram o mesmo commit,
    # sem arquivo não-rastreado novo no meio do caminho.
    verify_tree = TreeState(sha=verify.sha, untracked=verify.untracked)
    reasons.extend(tree_drift(build, verify_tree))

    # P2 — todos os checks com prova válida; perfil standard pelo verificador.
    covered = {p.check_id for p in verify.proofs}
    for check in contract.checks:
        if check.required and check.id not in covered:
            reasons.append(f"P2: check {check.id} has no proof")
    for proof in verify.proofs:
        if not proof.passed:
            reasons.append(f"P2: check {proof.check_id} failed (exit={proof.exit_code})")
    reasons.extend(revalidate_proofs(verify))
    reasons.extend(standard_profile_gaps(contract, verify))
    reasons.extend(evidence_anchor_gaps(verify, anchored_evidence))

    # P5 — PR e CI concordam sobre o head: o head do PR é exatamente o SHA provado.
    if pr_head_sha is not None and pr_head_sha != verify.sha:
        reasons.append(f"P5: PR head {pr_head_sha} != verified sha {verify.sha}")

    if not verify.all_passed and not reasons:
        reasons.append("P2: no passing proofs recorded")

    return GateDecision(verdict="promote" if not reasons else "block", reasons=reasons)
