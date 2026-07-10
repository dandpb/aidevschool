"""CLI entrypoint for the OpenClaw checklist runner."""

from __future__ import annotations

import argparse
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import assert_never

from engines.openclaw import config as cfg
from engines.openclaw.errors import OpenclawError
from engines.openclaw.runner.checklist import evaluate
from engines.openclaw.runner.pipeline_status import Phase, yaml_path_for
from engines.openclaw.runner.scheduler import Scheduler


@dataclass(frozen=True, slots=True)
class ChecklistPreview:
    """Read-only outcome of evaluating the current OpenClaw checklist step."""

    project: str
    phase: Phase
    passed: bool
    detail: str
    next_phase: Phase | None
    source: str


def preview_checklist(scheduler: Scheduler) -> ChecklistPreview:
    """Evaluate the current scheduler step without calling its write path."""
    status = scheduler.read_status()
    project = status.current_project or cfg.DEFAULT_PROJECT
    yaml_path = yaml_path_for(scheduler.status_path)
    source = (
        yaml_path.relative_to(scheduler.root).as_posix()
        if yaml_path.exists()
        else scheduler.status_path.relative_to(scheduler.root).as_posix()
        if scheduler.status_path.exists()
        else "default-empty-state"
    )

    match status.phase:
        case Phase.CYCLE_COMPLETE:
            return ChecklistPreview(project, status.phase, True, "cycle complete", None, source)
        case (
            Phase.SPEC
            | Phase.SPEC_DONE
            | Phase.IMPL_DONE
            | Phase.REVIEW_DONE
            | Phase.BENCHMARK_DONE
        ):
            if status.blockers:
                return ChecklistPreview(
                    project,
                    status.phase,
                    False,
                    f"blockers present: {status.blockers}",
                    None,
                    source,
                )
            blocked, reason = scheduler.check_gate()
            if blocked:
                return ChecklistPreview(project, status.phase, False, reason, None, source)
            passed, detail, next_phase = evaluate(
                scheduler.root,
                project,
                status.phase,
                scheduler.config,
            )
            return ChecklistPreview(project, status.phase, passed, detail, next_phase, source)
        case unreachable:
            assert_never(unreachable)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="OpenClaw checklist runner (simulate)")
    parser.add_argument(
        "--project",
        default="curriculum/01_rate_limiter",
        help="Project slug (default: curriculum/01_rate_limiter)",
    )
    parser.add_argument(
        "--mode",
        default="simulate",
        choices=["simulate"],
        help="Only simulate is supported (path checklist)",
    )
    parser.add_argument(
        "--phase",
        default=None,
        choices=[p.value for p in Phase],
        help="Override starting phase",
    )
    parser.add_argument(
        "--max-events",
        type=int,
        default=50,
        help="Maximum checklist steps (default: 50)",
    )
    # --reset kept as no-op for CLI compatibility
    parser.add_argument("--reset", action="store_true", help="(no-op) former Hermes reset")
    parser.add_argument(
        "--preview",
        action="store_true",
        help="Evaluate the current checklist without writing pipeline state",
    )
    args = parser.parse_args(argv)

    root = Path(__file__).resolve().parent.parent.parent
    scheduler = Scheduler(root=root)

    if args.preview:
        preview = preview_checklist(scheduler)
        next_phase = preview.next_phase.value if preview.next_phase is not None else "-"
        print("OpenClaw checklist preview (read-only)")
        print(f"  source: {preview.source}")
        print(f"  project: {preview.project}")
        print(f"  phase: {preview.phase.value}")
        print(f"  result: {'PASS' if preview.passed else 'HALT'} — {preview.detail}")
        print(f"  next phase: {next_phase}")
        return 0 if preview.passed else 1

    try:
        if args.phase:
            status = scheduler.read_status()
            status.phase = Phase(args.phase)
            status.current_project = args.project
            status.blockers = []
            scheduler.write_status(status)

        status = scheduler.read_status()
        print(f"OpenClaw checklist: project={args.project} mode={args.mode}")
        print(f"  current phase: {status.phase.value}")
        print(f"  current project: {status.current_project}")
        print()

        results = scheduler.run(max_events=args.max_events)
    except OpenclawError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2

    for i, result in enumerate(results, 1):
        marker = "HALT" if result.halted else "STEP"
        after = result.phase_after.value if result.phase_after else "-"
        print(f"[{i:02d}] {marker}: {result.event or '-'} -> {after}")
        if result.reason:
            print(f"       {result.reason}")
        if result.halted:
            break

    final_status = scheduler.read_status()
    print()
    print(f"Final phase: {final_status.phase.value}")
    if final_status.phase.value == "cycle-complete":
        print("Checklist completed successfully.")
        return 0
    if final_status.blockers:
        print(f"Blockers: {final_status.blockers}")
    print("Runner halted before cycle-complete.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
