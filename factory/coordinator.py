"""Coordenador local da fábrica (MOTOR, HTML §05-01).

Recebe o evento, reserva o item (lease), congela o contrato, abre worktree,
aciona autor e Verifier distintos, registra transições no ledger e retoma
após interrupção (`resume`). Uma tarefa em voo por vez no piloto.

Runtime home (fora do Git): `.scratch/factory/`::

    .scratch/factory/
    ├── queue/<event-id>.json
    ├── leases/<event-id>.json
    ├── runs/<run-id>/
    │   ├── state.json
    │   ├── contract/…            # cópia congelada + contract.lock.json
    │   ├── proofs/<check>.output.txt
    │   └── receipt.summary.json
    └── ledger/<run-id>.jsonl     # recibos append-only encadeados
"""

from __future__ import annotations

import json
import os
import subprocess
from pathlib import Path

from . import gitwork
from .contract import Contract, load_from_registry
from .gate import GateDecision, evaluate
from .ledger import RunLedger
from .model import (
    Receipt,
    WorkEvent,
    digest_obj,
    evidence_digest,
    proof_evidence,
    utcnow,
)
from .queue import EventQueue, FactoryError, LeaseHeldError, Lease
from .verify import VerifyResult, run_checks

DEFAULT_HOME = ".scratch/factory"


class CoordinatorError(RuntimeError):
    pass


def factory_home(root: Path | None = None) -> Path:
    base = Path(root) if root else Path(os.environ.get("FACTORY_HOME", DEFAULT_HOME))
    base.mkdir(parents=True, exist_ok=True)
    return base


class Coordinator:
    def __init__(self, repo: Path, home: Path | None = None, registry: Path | None = None) -> None:
        self.repo = Path(repo)
        self.home = factory_home(home)
        self.registry = Path(registry) if registry else self.repo / "intent"
        self.queue = EventQueue(self.home)

    # -- stations ---------------------------------------------------------

    def intake(self, event: WorkEvent) -> WorkEvent:
        return self.queue.submit(event)

    def claim(self, event_id: str, context_id: str) -> str:
        self.queue.claim(event_id, holder=context_id)
        run_id = f"run-{event_id}"
        return run_id

    def _run_dir(self, run_id: str) -> Path:
        return self.home / "runs" / run_id

    def _fence(self, run_id: str, state: dict | None = None,
               acting_context: str | None = None) -> Lease:
        """P1 fencing (AID-2718/AID-2721): nenhuma estação transiciona uma run
        cujo lease esteja ausente, expirado, nas mãos de outro holder ou em
        época posterior à do congelamento. Fail-closed: `CoordinatorError`
        antes de qualquer mutação de state ou ledger."""
        event_id = run_id.removeprefix("run-")
        try:
            lease = self.queue.lease_of(event_id)
        except FactoryError as exc:
            raise CoordinatorError(
                f"P1 fence: run {run_id} cannot transition — {exc}"
            ) from exc
        if self.queue.lease_expired(event_id):
            raise CoordinatorError(
                f"P1 fence: lease for {event_id} expired (holder {lease.holder})"
            )
        expected_holder = (state or {}).get("lease_holder")
        if state is not None and not expected_holder:
            # run congelada sem holder registrado (estado legado/pré-fencing):
            # não atribuível a nenhum lease — fail-closed (AID-2721 O2).
            raise CoordinatorError(
                f"P1 fence: run {run_id} state has no lease_holder — "
                "unattributable run cannot transition"
            )
        if expected_holder is None:
            expected_holder = acting_context  # freeze: primeira estação pós-claim
        if expected_holder is not None and lease.holder != expected_holder:
            raise CoordinatorError(
                f"P1 fence: lease for {event_id} is held by {lease.holder}, "
                f"expected {expected_holder} — obsolete writers are fenced"
            )
        expected_epoch = (state or {}).get("lease_epoch")
        if expected_epoch is not None and lease.epoch != expected_epoch:
            raise CoordinatorError(
                f"P1 fence: lease epoch for {event_id} moved to {lease.epoch} "
                f"(run froze epoch {expected_epoch}) — obsolete writers are fenced"
            )
        return lease

    def _ledger(self, run_id: str) -> RunLedger:
        return RunLedger(self.home / "ledger" / f"{run_id}.jsonl")

    def _state_path(self, run_id: str) -> Path:
        return self._run_dir(run_id) / "state.json"

    def _load_state(self, run_id: str) -> dict:
        path = self._state_path(run_id)
        if not path.exists():
            raise CoordinatorError(f"no run state for {run_id}")
        return json.loads(path.read_text(encoding="utf-8"))

    def _save_state(self, run_id: str, state: dict) -> None:
        path = self._state_path(run_id)
        path.parent.mkdir(parents=True, exist_ok=True)
        tmp = path.with_suffix(".tmp")
        tmp.write_text(json.dumps(state, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        os.replace(tmp, path)

    def _append(self, run_id: str, *, station_from: str, station_to: str, actor_role: str,
                context_id: str, **extra) -> Receipt:
        ledger = self._ledger(run_id)
        last = ledger.last()
        receipt = Receipt(
            seq=(last.seq + 1) if last else 1,
            run_id=run_id,
            station_from=station_from,
            station_to=station_to,
            actor_role=actor_role,
            context_id=context_id,
            **extra,
        )
        return ledger.append(receipt)

    def freeze(self, run_id: str, change_id: str, context_id: str,
               base_sha: str | None = None) -> Contract:
        event_id = run_id.removeprefix("run-")
        lease = self._fence(run_id, acting_context=context_id)
        station_from = "queued"
        base = base_sha or gitwork._git(self.repo, "rev-parse", "HEAD").stdout.strip()
        contract = load_from_registry(self.registry, change_id, base)
        run_dir = self._run_dir(run_id)
        contract.freeze(run_dir)
        state = {
            "run_id": run_id,
            "event_id": event_id,
            "change_id": change_id,
            "station": "contracted",
            "base_sha": base,
            "contract_digest": contract.digest,
            "lease_holder": lease.holder,
            "lease_epoch": lease.epoch,
            "author_context": None,
            "verifier_context": None,
            "attempts": 1,
            "updated_at": utcnow(),
        }
        self._save_state(run_id, state)
        self._append(
            run_id, station_from=station_from, station_to="contracted",
            actor_role="coordinator", context_id=context_id,
            contract_digest=contract.digest, sha=base,
        )
        return contract

    def build(self, run_id: str, author_context: str, author_cmd: str) -> dict:
        state = self._load_state(run_id)
        if state["station"] != "contracted":
            raise CoordinatorError(f"run {run_id} is at {state['station']}, not contracted")
        self._fence(run_id, state, acting_context=author_context)
        contract = Contract.load_frozen(self._run_dir(run_id))
        worktree = self.home / "worktrees" / run_id
        gitwork.create_worktree(self.repo, contract.base_sha, worktree)
        proc = subprocess.run(
            ["bash", "-c", author_cmd],
            cwd=str(worktree), capture_output=True, text=True, timeout=3600,
        )
        if proc.returncode != 0:
            state["station"] = "blocked"
            state["updated_at"] = utcnow()
            self._save_state(run_id, state)
            self._append(
                run_id, station_from="contracted", station_to="blocked",
                actor_role="author", context_id=author_context,
                sha=contract.base_sha, contract_digest=contract.digest,
                detail={"author_cmd_rc": proc.returncode, "stderr_tail": proc.stderr[-2000:]},
            )
            raise CoordinatorError(f"author command failed rc={proc.returncode}: {proc.stderr[-500:]}")
        tree = gitwork.capture_tree_state(worktree)
        if tree.sha == contract.base_sha:
            raise CoordinatorError(
                "author produced no commit; a build without a commit has no SHA to prove"
            )
        state.update(
            station="built", author_context=author_context, build_sha=tree.sha,
            worktree=str(worktree), build_untracked=tree.to_dict()["untracked"],
            updated_at=utcnow(),
        )
        self._save_state(run_id, state)
        self._append(
            run_id, station_from="contracted", station_to="built",
            actor_role="author", context_id=author_context, sha=tree.sha,
            contract_digest=contract.digest,
        )
        return state

    def prove(self, run_id: str, verifier_context: str) -> VerifyResult:
        """Estação Provar em clean-room (AID-2716/AID-2730).

        Os checks NUNCA rodam na worktree do autor: primeiro a árvore do autor
        é auditada (SHA pinado no recibo de build + sem não-rastreados);
        fail-closed bloqueia a run antes de qualquer transição `verified`.
        Aprovada a auditoria, os checks rodam em worktree NOVA criada
        exatamente no `build_sha`, com o estado da árvore re-capturado após
        os checks (mutação durante a execução = drift bloqueante).
        """
        state = self._load_state(run_id)
        if state["station"] != "built":
            raise CoordinatorError(f"run {run_id} is at {state['station']}, not built")
        self._fence(run_id, state)
        contract = Contract.load_frozen(self._run_dir(run_id))
        author_worktree = Path(state["worktree"])
        author_tree = gitwork.capture_tree_state(author_worktree)
        blockers: list[str] = []
        if author_tree.sha != state["build_sha"]:
            blockers.append(
                "P4 clean-room: author worktree moved to "
                f"{author_tree.sha}, build receipt pinned {state['build_sha']}"
            )
        meaningful = gitwork.meaningful_untracked(author_tree.untracked)
        if meaningful:
            blockers.append(
                "P4 clean-room: author worktree has untracked files at prove "
                f"time: {meaningful}"
            )
        if blockers:
            state.update(
                station="blocked", prove_blockers=blockers, updated_at=utcnow(),
            )
            self._save_state(run_id, state)
            self._append(
                run_id, station_from="built", station_to="blocked",
                actor_role="verifier", context_id=verifier_context,
                sha=author_tree.sha, contract_digest=contract.digest,
                detail={"reasons": blockers, "clean_room": True},
            )
            raise CoordinatorError(
                f"prove blocked (clean-room policy) for {run_id}: "
                + "; ".join(blockers)
            )
        cleanroom = self.home / "worktrees" / f"{run_id}-cleanroom"
        if cleanroom.exists():
            gitwork.remove_worktree(self.repo, cleanroom)
        gitwork.create_worktree(self.repo, state["build_sha"], cleanroom)
        result = run_checks(
            contract, cleanroom, verifier_context, self._run_dir(run_id) / "proofs"
        )
        self.persist_proofs_meta(run_id, result)
        if result.drift_reasons:
            state.update(
                station="blocked", prove_blockers=result.drift_reasons,
                verify_worktree=str(cleanroom), updated_at=utcnow(),
            )
            self._save_state(run_id, state)
            self._append(
                run_id, station_from="built", station_to="blocked",
                actor_role="verifier", context_id=verifier_context,
                sha=result.sha, contract_digest=contract.digest,
                proof_refs=[p.check_id for p in result.proofs],
                detail={"reasons": result.drift_reasons, "clean_room": True},
            )
            raise CoordinatorError(
                f"prove blocked (tree mutated while checks ran) for {run_id}: "
                + "; ".join(result.drift_reasons)
            )
        state.update(station="verified", verifier_context=verifier_context,
                     verify_sha=result.sha, verify_untracked=result.untracked,
                     verify_worktree=str(cleanroom),
                     verify_generated_untracked=result.generated_untracked,
                     updated_at=utcnow())
        self._save_state(run_id, state)
        # AID-2715 — a âncora da prova (check, cmd, exit, digest do output)
        # viaja DENTRO do recibo selado; digests no runtime são só cache.
        evidence = [proof_evidence(p) for p in result.proofs]
        self._append(
            run_id, station_from="built", station_to="verified",
            actor_role="verifier", context_id=verifier_context, sha=result.sha,
            contract_digest=contract.digest,
            proof_refs=[p.check_id for p in result.proofs],
            proof_digests=[evidence_digest(e) for e in evidence],
            detail={"proof_evidence": evidence},
        )
        return result

    def gate(self, run_id: str, context_id: str, pr_head_sha: str | None = None) -> GateDecision:
        state = self._load_state(run_id)
        if state["station"] not in ("verified", "blocked"):
            raise CoordinatorError(f"run {run_id} is at {state['station']}, not verified")
        self._fence(run_id, state)
        # Run bloqueada na estação Provar (política clean-room, AID-2716/AID-2730):
        # não existe estado verificado a promover — fail-closed com os motivos.
        if state["station"] == "blocked" and "verify_sha" not in state:
            reasons = [
                "P4 clean-room: run blocked at prove — no verified evidence to promote"
            ] + list(state.get("prove_blockers", []))
            decision = GateDecision(verdict="block", reasons=reasons)
            self._append(
                run_id, station_from="blocked", station_to="blocked",
                actor_role="coordinator", context_id=context_id,
                sha=state.get("build_sha"), contract_digest=state.get("contract_digest"),
                detail={"reasons": reasons},
            )
            self._write_receipt_summary(run_id, decision)
            return decision
        frozen = Contract.load_frozen(self._run_dir(run_id))
        # O registro versionado é a autoridade: se mudou após o congelamento,
        # a run está velha e a promoção fica bloqueada (P4).
        try:
            registry_contract = load_from_registry(
                self.registry, state["change_id"], state["base_sha"]
            )
            registry_digest = registry_contract.digest
        except Exception as exc:  # noqa: BLE001 - fail-closed com motivo
            registry_digest = f"unreadable:{exc}"
        build = gitwork.TreeState(sha=state["build_sha"], untracked=state.get("build_untracked", []))
        verify = VerifyResult(
            context_id=state["verifier_context"], sha=state["verify_sha"],
            untracked=state.get("verify_untracked", []),
            proofs=self._load_proofs(run_id),
        )
        decision = evaluate(
            contract=frozen,
            frozen_digest=registry_digest,
            build=build,
            verify=verify,
            author_context=state["author_context"],
            pr_head_sha=pr_head_sha,
            anchored_evidence=self._proof_anchor(run_id),
        )
        station_to = "promoted" if decision.ok else "blocked"
        state.update(station=station_to, updated_at=utcnow())
        self._save_state(run_id, state)
        self._append(
            run_id, station_from="verified", station_to=station_to,
            actor_role="coordinator", context_id=context_id, sha=state["verify_sha"],
            contract_digest=registry_digest,
            detail={"reasons": decision.reasons} if decision.reasons else {"pr_head": pr_head_sha},
        )
        self._write_receipt_summary(run_id, decision)
        return decision

    def _load_proofs(self, run_id: str) -> list:
        from .model import Proof

        meta = json.loads(
            (self._run_dir(run_id) / "proofs" / "proofs.json").read_text(encoding="utf-8")
        )
        return [Proof(**item) for item in meta]

    def _proof_anchor(self, run_id: str) -> dict[str, str] | None:
        """Âncora de evidência do último recibo `verified` (AID-2715).

        Falha fechado: sem recibo, ou com detalhe/digests inconsistentes,
        devolve None e o gate recusa provas auto-atestadas.
        """
        receipts = self._ledger(run_id).find("verified")
        if not receipts:
            return None
        receipt = receipts[-1]
        evidence = receipt.detail.get("proof_evidence") or []
        if len(evidence) != len(receipt.proof_digests):
            return None
        return {e["check_id"]: d for e, d in zip(evidence, receipt.proof_digests)}

    def _write_receipt_summary(self, run_id: str, decision: GateDecision) -> None:
        state = self._load_state(run_id)
        summary = {
            "run_id": run_id,
            "change_id": state["change_id"],
            "event_id": state["event_id"],
            "verdict": decision.verdict,
            "reasons": decision.reasons,
            "sha": state.get("verify_sha"),
            "contract_digest": state["contract_digest"],
            "author_context": state.get("author_context"),
            "verifier_context": state.get("verifier_context"),
            "proof_anchor": self._proof_anchor(run_id),
            "generated_at": utcnow(),
        }
        (self._run_dir(run_id) / "receipt.summary.json").write_text(
            json.dumps(summary, indent=2, sort_keys=True) + "\n", encoding="utf-8"
        )

    def persist_proofs_meta(self, run_id: str, result: VerifyResult) -> None:
        from dataclasses import asdict

        path = self._run_dir(run_id) / "proofs" / "proofs.json"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps([asdict(p) for p in result.proofs], indent=2) + "\n",
                        encoding="utf-8")

    # -- resumo / retomada --------------------------------------------------

    def status(self, run_id: str) -> dict:
        state = self._load_state(run_id)
        snap = self._ledger(run_id).snapshot()
        return {"state": state, "ledger": snap}

    def resume(self, run_id: str) -> str:
        """Retoma após interrupção: retorna a estação corrente sem reexecutar
        estações já registradas (falha e retry não apagam o histórico)."""
        state = self._load_state(run_id)
        station = state["station"]
        if station in ("promoted",):
            return station
        state["attempts"] = state.get("attempts", 1) + 1
        state["updated_at"] = utcnow()
        if station == "blocked":
            # Um resultado bloqueado volta ao início como novo trabalho (HTML §02);
            # o recibo anterior permanece.
            event = WorkEvent(
                id=f"{state['event_id']}-retry{state['attempts'] - 1}",
                origin=f"factory:{run_id}", scope="retry after blocked", risk="low",
            )
            self.intake(event)
        self._save_state(run_id, state)
        return station
