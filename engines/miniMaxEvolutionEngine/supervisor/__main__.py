"""Command-line surface for the one-shot school supervisor."""

from __future__ import annotations

import argparse
import json
import os
import signal
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path

from .autonomous import execute_request
from .config import ConfigError, load_config
from .lease import acquire, read_lease, recover
from .ledger import read_ledger
from .lifecycle import decide
from .models import RuntimeSnapshot, SupervisorPaths
from .poll import run_poll
from .reconcile import (
    abandon_unpublished_request,
    pending_request,
    pending_request_document,
    reconcile,
    resolve_request,
    resume_operations,
    runtime_state,
)
from .state import InvalidStateError, load_canonical
from .tick import tick


def _default_paths(root: Path) -> SupervisorPaths:
    return SupervisorPaths(
        root,
        root / "learner/pipeline_status.yaml",
        root / "learner/learning_state.yaml",
        root / "curriculum",
        root / ".mavis/school-supervisor",
    )


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _new_id() -> str:
    return uuid.uuid4().hex


def _render(decision) -> dict:
    return {
        "action": decision.action.value,
        "reason": decision.reason,
        "project": decision.project,
        "observed_phase": decision.observed_phase.value if decision.observed_phase else None,
        "phase": decision.plan.name if decision.plan else None,
    }


def _acquire_cli_lease(paths: SupervisorPaths, now: str):
    return acquire(paths.lease, _new_id(), now, os.getpid())


def _status(paths: SupervisorPaths) -> dict:
    pipeline, learner = load_canonical(paths.pipeline, paths.learner, paths.curriculum)
    marker = pending_request(paths)
    pending = pending_request_document(paths) if marker is not None else None
    failures, blocker = runtime_state(
        paths,
        pipeline.cycle_id,
        pipeline.project,
        pipeline.phase.value,
    )
    held = read_lease(paths.lease) if paths.lease.exists() else None
    runtime = RuntimeSnapshot(
        lease_held=held is not None,
        pending_request=pending,
        failed_attempts=failures,
        operational_blocker=blocker,
    )
    decision = decide(pipeline, learner, runtime)
    events = read_ledger(paths.ledger)
    latest = events[-1] if events else None
    return _render(decision) | {
        "active_unit": learner.unit_id,
        "pending_request": (
            {
                "request_id": pending["request_id"],
                "attempt": pending["attempt"],
                "command": pending["command"],
            }
            if pending is not None
            else None
        ),
        "lease": held,
        "failed_attempts": failures,
        "operational_blocker": blocker,
        "latest_ledger_event": latest["event"] if latest else None,
        "latest_ledger_result": latest.get("result") if latest else None,
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="school-supervisor")
    parser.add_argument("--repo-root", type=Path, default=Path(__file__).resolve().parents[3])
    parser.add_argument("--operations", type=Path)
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("tick")
    sub.add_parser("status")
    sub.add_parser("reconcile")
    complete = sub.add_parser("complete")
    complete.add_argument("request_id")
    fail = sub.add_parser("fail")
    fail.add_argument("request_id")
    fail.add_argument("--summary", required=True)
    block = sub.add_parser("block")
    block.add_argument("request_id")
    block.add_argument("--reason", required=True)
    abandon = sub.add_parser("abandon")
    abandon.add_argument("request_id")
    abandon.add_argument("--reason", required=True)
    sub.add_parser("resume")
    sub.add_parser("recover-lease")
    execute = sub.add_parser("execute")
    execute.add_argument("request_id")
    execute.add_argument("--config", type=Path)
    autonomous_status = sub.add_parser("autonomous-status")
    autonomous_status.add_argument("--config", type=Path)
    poll = sub.add_parser("poll")
    poll.add_argument("--interval-seconds", type=float, default=5)
    poll.add_argument("--max-interval-seconds", type=float, default=60)
    poll.add_argument("--backoff-factor", type=float, default=2)
    poll.add_argument("--max-ticks", type=int)
    poll.add_argument("--autonomous", action="store_true")
    poll.add_argument("--config", type=Path)
    args = parser.parse_args(argv)

    paths = _default_paths(args.repo_root.resolve())
    if args.operations:
        paths = SupervisorPaths(
            paths.repo_root,
            paths.pipeline,
            paths.learner,
            paths.curriculum,
            args.operations.resolve(),
        )

    try:
        paths.validate()
        if args.command == "poll":
            if args.config is not None and not args.autonomous:
                raise ValueError("--config requires --autonomous")
            if args.interval_seconds <= 0 or args.max_interval_seconds <= 0 or args.backoff_factor < 1:
                raise ValueError("poll intervals must be positive and backoff-factor must be at least 1")
            if args.interval_seconds > args.max_interval_seconds:
                raise ValueError("interval-seconds may not exceed max-interval-seconds")
            if args.max_ticks is not None and args.max_ticks <= 0:
                raise ValueError("max-ticks must be positive")
            stopped = threading.Event()
            received: list[int] = []
            previous_handlers = {}

            def stop(signum, _frame):
                received.append(signum)
                stopped.set()

            try:
                for signum in (signal.SIGINT, signal.SIGTERM):
                    previous_handlers[signum] = signal.getsignal(signum)
                    signal.signal(signum, stop)
                outcome = run_poll(
                    paths, clock=_now, id_provider=_new_id, wait=stopped.wait,
                    interval_seconds=args.interval_seconds,
                    max_interval_seconds=args.max_interval_seconds,
                    backoff_factor=args.backoff_factor, max_ticks=args.max_ticks,
                    autonomous=args.autonomous, config_path=args.config,
                    cancellation=stopped.is_set,
                    emit=lambda event: print(json.dumps(event, sort_keys=True), flush=True),
                )
            finally:
                for signum, handler in previous_handlers.items():
                    signal.signal(signum, handler)
            if received:
                return 130 if received[-1] == signal.SIGINT else 143
            if outcome.status == "autonomous_disabled":
                return 2
            return 0
        elif args.command == "tick":
            result = _render(tick(paths, clock=_now, id_provider=_new_id))
        elif args.command == "status":
            result = _status(paths)
        elif args.command == "autonomous-status":
            events = read_ledger(paths.ledger)
            finished = {(event["request_id"], event["role"], event["context_id"])
                        for event in events if event["event"] == "execution_finished"}
            interrupted = [event for event in events if event["event"] == "execution_started"
                           and (event["request_id"], event["role"], event["context_id"]) not in finished]
            try:
                config = load_config(
                    paths.repo_root,
                    args.config or paths.operations / "autonomous.yaml",
                )
            except ConfigError as exc:
                result = {
                    "status": "disabled",
                    "reason": str(exc),
                    "interrupted_executions": len(interrupted),
                }
            else:
                result = {"status": "enabled", "model": config.model,
                          "interrupted_executions": len(interrupted)}
        elif args.command == "recover-lease":
            if not paths.lease.exists():
                raise ValueError("no supervisor lease exists")
            result = {"status": "recovered", "owner": recover(paths.lease, _now())}
        else:
            now = _now()
            lease = _acquire_cli_lease(paths, now)
            try:
                pipeline, learner = load_canonical(paths.pipeline, paths.learner, paths.curriculum)
                if args.command == "execute":
                    result = execute_request(paths, args.request_id, config_path=args.config)
                elif args.command == "reconcile":
                    outcome = reconcile(paths, pipeline, now)
                    result = {"status": outcome.status, "reason": outcome.reason}
                elif args.command == "resume":
                    if pending_request(paths) is not None:
                        raise ValueError("cannot resume while a phase request is pending")
                    resume_operations(paths, pipeline, lease.owner, now)
                    result = {"status": "resumed", "project": pipeline.project, "phase": pipeline.phase.value}
                elif args.command == "abandon":
                    outcome = abandon_unpublished_request(
                        paths,
                        args.request_id,
                        args.reason,
                        now,
                        pipeline,
                        learner,
                    )
                    result = {"status": outcome.status, "reason": outcome.reason}
                else:
                    kind = {
                        "complete": "completed",
                        "fail": "failed",
                        "block": "blocked",
                    }[args.command]
                    detail = getattr(args, "summary", getattr(args, "reason", ""))
                    outcome = resolve_request(
                        paths,
                        args.request_id,
                        kind,
                        now,
                        pipeline,
                        learner,
                        detail=detail,
                    )
                    result = {"status": outcome.status, "reason": outcome.reason}
            finally:
                lease.release()
    except (InvalidStateError, RuntimeError, OSError, ValueError) as exc:
        result = {"action": "invalid_state", "reason": str(exc)}
        print(json.dumps(result, sort_keys=True))
        return 2
    except Exception as exc:
        print(json.dumps({"action": "internal_error", "reason": str(exc)}, sort_keys=True))
        return 1

    print(json.dumps(result, sort_keys=True))
    return 0 if result.get("action") != "invalid_state" else 2


if __name__ == "__main__":
    raise SystemExit(main())
