"""CLI entrypoint for the OpenClaw checklist runner."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from engines.openclaw.errors import OpenclawError
from engines.openclaw.runner.pipeline_status import Phase
from engines.openclaw.runner.scheduler import Scheduler


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
    args = parser.parse_args(argv)

    root = Path(__file__).resolve().parent.parent.parent
    scheduler = Scheduler(root=root)

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
