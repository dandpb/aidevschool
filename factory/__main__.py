"""CLI da fábrica agente — `python3 -m factory <comando>`.

Estações: intake → claim → freeze → build → prove → gate → (PR humano).
Toda transição appenda recibo no ledger da run; `resume` retoma sem apagar
histórico; `ledger --verify` revalida a cadeia de hashes.

Contrato de saída (AID-2728/AID-2737): exceções do domínio nunca derrubam
traceback — viram JSON com motivo na stderr + exit 2; vereditos estruturados
(block / chain_ok:false) saem como JSON na stdout + exit 2.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from .contract import ContractError
from .coordinator import Coordinator, CoordinatorError, factory_home
from .ledger import LedgerError, RunLedger, load_raw
from .model import WorkEvent
from .queue import FactoryError, LeaseHeldError

# Exceções que o CLI converte em JSON de motivo + exit 2 (AID-2728 S6a).
DOMAIN_ERRORS = (ContractError, CoordinatorError, LedgerError, FactoryError)


def _coord(args: argparse.Namespace) -> Coordinator:
    return Coordinator(repo=Path(args.repo), home=Path(args.home) if args.home else None)


def cmd_intake(args: argparse.Namespace) -> int:
    coord = _coord(args)
    event = WorkEvent(id=args.event_id, origin=args.origin, scope=args.scope, risk=args.risk)
    coord.intake(event)
    print(event.to_json())
    return 0


def cmd_claim(args: argparse.Namespace) -> int:
    coord = _coord(args)
    try:
        run_id = coord.claim(args.event_id, args.context)
    except LeaseHeldError as exc:
        print(f"BLOCKED (P1): {exc}", file=sys.stderr)
        return 2
    print(run_id)
    return 0


def cmd_freeze(args: argparse.Namespace) -> int:
    coord = _coord(args)
    contract = coord.freeze(f"run-{args.event_id}", args.change_id, args.context, args.base_sha)
    print(json.dumps({"change_id": contract.change_id, "digest": contract.digest,
                      "base_sha": contract.base_sha,
                      "checks": [c.id for c in contract.checks]}, indent=2))
    return 0


def cmd_build(args: argparse.Namespace) -> int:
    coord = _coord(args)
    try:
        state = coord.build(f"run-{args.event_id}", args.context, args.cmd)
    except CoordinatorError as exc:
        print(f"BLOCKED: {exc}", file=sys.stderr)
        return 2
    print(json.dumps({"station": state["station"], "build_sha": state["build_sha"]}))
    return 0


def cmd_prove(args: argparse.Namespace) -> int:
    coord = _coord(args)
    result = coord.prove(f"run-{args.event_id}", args.context)
    print(json.dumps({"sha": result.sha, "all_passed": result.all_passed,
                      "proofs": [p.check_id for p in result.proofs]}))
    return 0


def cmd_gate(args: argparse.Namespace) -> int:
    coord = _coord(args)
    decision = coord.gate(f"run-{args.event_id}", args.context, args.pr_head)
    print(json.dumps({"verdict": decision.verdict, "reasons": decision.reasons}, indent=2))
    return 0 if decision.ok else 2


def cmd_status(args: argparse.Namespace) -> int:
    coord = _coord(args)
    print(json.dumps(coord.status(f"run-{args.event_id}"), indent=2))
    return 0


def cmd_resume(args: argparse.Namespace) -> int:
    coord = _coord(args)
    print(coord.resume(f"run-{args.event_id}"))
    return 0


def cmd_ledger(args: argparse.Namespace) -> int:
    home = factory_home(Path(args.home) if args.home else None)
    path = home / "ledger" / f"run-{args.event_id}.jsonl"
    if args.verify:
        # AID-2728 S5b: veredito estruturado — linha malformada vira
        # {"chain_ok": false, "error": {"line", "reason"}} + exit 2.
        report = RunLedger(path).verify_report()
        print(json.dumps(report))
        return 0 if (report["hashes_ok"] and report["chain_ok"]) else 2
    for e in load_raw(path):
        print(json.dumps(e))
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="factory", description=__doc__)
    parser.add_argument("--repo", default=".", help="repo raiz (default: cwd)")
    parser.add_argument("--home", default=None, help="runtime home (default: $FACTORY_HOME ou .scratch/factory)")
    sub = parser.add_subparsers(dest="cmd", required=True)

    p = sub.add_parser("intake", help="cria evento (ID, origem, escopo, risco)")
    p.add_argument("--event-id", required=True)
    p.add_argument("--origin", required=True)
    p.add_argument("--scope", default="")
    p.add_argument("--risk", default="low", choices=["low", "medium", "high"])
    p.set_defaults(func=cmd_intake)

    p = sub.add_parser("claim", help="reserva o item (fila + lease)")
    p.add_argument("event_id")
    p.add_argument("--context", required=True)
    p.set_defaults(func=cmd_claim)

    p = sub.add_parser("freeze", help="congela contrato a partir de intent/<change-id>/")
    p.add_argument("event_id")
    p.add_argument("--change-id", required=True)
    p.add_argument("--context", required=True)
    p.add_argument("--base-sha", default=None)
    p.set_defaults(func=cmd_freeze)

    p = sub.add_parser("build", help="worktree isolado + autor commita")
    p.add_argument("event_id")
    p.add_argument("--context", required=True)
    p.add_argument("--cmd", required=True)
    p.set_defaults(func=cmd_build)

    p = sub.add_parser("prove", help="verificador independente roda os checks")
    p.add_argument("event_id")
    p.add_argument("--context", required=True)
    p.set_defaults(func=cmd_prove)

    p = sub.add_parser("gate", help="avalia promoção (P1–P5); fail-closed")
    p.add_argument("event_id")
    p.add_argument("--context", required=True)
    p.add_argument("--pr-head", default=None)
    p.set_defaults(func=cmd_gate)

    p = sub.add_parser("status", help="estado da run + ledger")
    p.add_argument("event_id")
    p.set_defaults(func=cmd_status)

    p = sub.add_parser("resume", help="retoma após interrupção")
    p.add_argument("event_id")
    p.set_defaults(func=cmd_resume)

    p = sub.add_parser("ledger", help="recibos da run (--verify revalida a cadeia)")
    p.add_argument("event_id")
    p.add_argument("--verify", action="store_true")
    p.set_defaults(func=cmd_ledger)

    args = parser.parse_args(argv)
    try:
        return args.func(args)
    except DOMAIN_ERRORS as exc:
        # AID-2728 S6a: exceção de estação vira JSON com motivo + exit 2 —
        # nunca traceback cru. (Claim/build já tratam seus blocks antes.)
        print(json.dumps({"error": type(exc).__name__, "reason": str(exc)}),
              file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
