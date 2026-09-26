"""Gates de promoção — critérios de saída P1–P5 do piloto.

`evaluate` devolve (veredito, motivos). Fail-closed: qualquer regra sem
evidência bloqueia; exit 0 de processo isolado não significa PASS (HTML §03).
A promoção exige que contrato, build, prova e PR concordem sobre o MESMO SHA.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

from .contract import Contract
from .gitwork import TreeState, tree_drift
from .model import Receipt, evidence_digest, proof_evidence
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


def state_ledger_binding_gaps(
    state: dict | None, ledger_receipts: list[Receipt] | None
) -> list[str]:
    """AID-2719 (X4) — `state.json` não é autoridade.

    Os SHAs e o digest de contrato que o gate examina têm que bater com o
    último recibo verificável da respectiva estação no ledger encadeado
    (onde vivem os SHAs verdadeiros). Tarjar `build_sha`/`verify_sha` no
    state não re-liga provas: divergência ou ausência de recibo bloqueia.
    """
    if state is None or ledger_receipts is None:
        return [
            "P4: no state/ledger binding evidence — state.json alone is not "
            "authority and the ledger was not consulted (X4)"
        ]
    built = [r for r in ledger_receipts if r.station_to == "built"]
    verified = [r for r in ledger_receipts if r.station_to == "verified"]
    if not verified:
        return ["P4: no `verified` receipt in ledger — proofs cannot be re-linked (X4)"]
    reasons: list[str] = []
    if not built:
        reasons.append("P4: no `built` receipt in ledger — build SHA is unattested (X4)")
    v = verified[-1]
    if state.get("verify_sha") != v.sha:
        reasons.append(
            f"P4: state verify_sha {state.get('verify_sha')} != ledger verified "
            f"receipt sha {v.sha} (X4)"
        )
    if built and state.get("build_sha") != built[-1].sha:
        reasons.append(
            f"P4: state build_sha {state.get('build_sha')} != ledger built "
            f"receipt sha {built[-1].sha} (X4)"
        )
    if state.get("contract_digest") != v.contract_digest:
        reasons.append(
            f"P4: state contract_digest {state.get('contract_digest')} != ledger "
            f"verified receipt contract_digest {v.contract_digest} (X4)"
        )
    return reasons


def ledger_head_anchor_gaps(
    state: dict | None, ledger_receipts: list[Receipt] | None
) -> list[str]:
    """AID-2719 (X6) — âncora externa do head do ledger.

    O hash do último recibo é persistido FORA do ledger (`state.ledger_head`,
    atualizado a cada append, e `receipt.summary.json`, que reflui ao registro
    versionado). Sem âncora, ou com head divergente (sufixo truncado/rewrite),
    o gate bloqueia — a cadeia só como prefixo não detecta perda de sufixo.
    """
    if state is None or ledger_receipts is None:
        return [
            "P4: no ledger head anchor evidence — suffix truncation would be "
            "undetectable (X6)"
        ]
    anchored = state.get("ledger_head")
    if not anchored:
        return ["P4: state has no ledger_head anchor — cannot detect truncation (X6)"]
    if not ledger_receipts:
        return ["P4: ledger is empty but state anchors head " f"{anchored} (X6)"]
    head = ledger_receipts[-1].hash
    if head != anchored:
        return [
            f"P4: ledger head {head} != state anchor {anchored} — suffix "
            "truncated or rewritten (X6)"
        ]
    return []


def minimum_profile_gaps(
    contract: Contract,
    event_risk: Optional[str],
    human_review: dict | None,
    author_context: Optional[str],
    verifier_context: Optional[str],
) -> list[str]:
    """AID-2719 (X5) — perfil mínimo: all-cheap não promove sozinho.

    Contrato sem NENHUM check `profile=standard` reduz a independência (P3)
    a comparação de strings. Para risco ≥ medium, exige revisão humana
    explícita registrada, por revisor distinto do autor e do verificador.
    Risco ausente (run legada) conta como desconhecido — fail-closed.
    """
    if any(c.profile == "standard" for c in contract.checks):
        return []
    risk = event_risk or "unknown"
    review = human_review or {}
    reviewer = review.get("reviewer_context")
    review_ok = bool(
        review.get("approved")
        and reviewer
        and reviewer != author_context
        and reviewer != verifier_context
    )
    if risk in ("medium", "high", "unknown") and not review_ok:
        return [
            "P2/P3: contract has no profile=standard check and no explicit "
            f"human review (risk={risk}) — all-cheap cannot promote alone (X5)"
        ]
    return []


def proof_sha_binding_gaps(verify: VerifyResult) -> list[str]:
    """AID-2719 — a prova carrega o SHA examinado e ele bate com o verificado."""
    reasons: list[str] = []
    for proof in verify.proofs:
        if proof.examined_sha is None:
            reasons.append(
                f"P4: proof {proof.check_id} predates examined-SHA binding — "
                "re-prove required"
            )
        elif proof.examined_sha != verify.sha:
            reasons.append(
                f"P4: proof {proof.check_id} examined sha {proof.examined_sha} "
                f"!= verified sha {verify.sha}"
            )
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
    state: dict | None = None,
    ledger_receipts: list[Receipt] | None = None,
    event_risk: str | None = None,
    human_review: dict | None = None,
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

    # AID-2719 — state ⇄ ledger ⇄ proofs amarrados no gate.
    reasons.extend(state_ledger_binding_gaps(state, ledger_receipts))
    reasons.extend(ledger_head_anchor_gaps(state, ledger_receipts))
    reasons.extend(proof_sha_binding_gaps(verify))
    reasons.extend(
        minimum_profile_gaps(contract, event_risk, human_review,
                             author_context, verify.context_id)
    )

    # P5 — PR e CI concordam sobre o head: o head do PR é exatamente o SHA provado.
    if pr_head_sha is not None and pr_head_sha != verify.sha:
        reasons.append(f"P5: PR head {pr_head_sha} != verified sha {verify.sha}")

    if not verify.all_passed and not reasons:
        reasons.append("P2: no passing proofs recorded")

    return GateDecision(verdict="promote" if not reasons else "block", reasons=reasons)
