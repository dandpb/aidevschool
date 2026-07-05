"""CLI entrypoint for the OpenClaw continuous runner."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from engines.openclaw.errors import OpenclawError
from engines.openclaw.hermes.bus import HermesBus
from engines.openclaw.runner.adapters import (
    BenchmarkerAdapter,
    CuratorAdapter,
    DevAdapter,
    OptimizerAdapter,
    ReviewerAdapter,
    VerifierAdapter,
)
from engines.openclaw.runner.scheduler import Scheduler, Phase


def build_adapters(mode: str, root: Path) -> dict[str, object]:
    if mode == "simulate":
        return {
            "curator": CuratorAdapter(root=root),
            "dev": DevAdapter(root=root),
            "reviewer": ReviewerAdapter(root=root),
            "benchmarker": BenchmarkerAdapter(root=root),
            "optimizer": OptimizerAdapter(root=root),
            "verifier": VerifierAdapter(root=root),
        }
    raise NotImplementedError(f"Mode {mode!r} is not implemented in this tracer bullet.")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="OpenClaw continuous runner")
    parser.add_argument(
        "--project",
        default="curriculum/01_rate_limiter",
        help="Project slug to run (default: curriculum/01_rate_limiter)",
    )
    parser.add_argument(
        "--mode",
        default="simulate",
        choices=["simulate"],
        help="Adapter mode (default: simulate)",
    )
    parser.add_argument(
        "--phase",
        default=None,
        choices=[p.value for p in Phase],
        help="Override starting phase (writes to pipeline_status.md)",
    )
    parser.add_argument(
        "--max-events",
        type=int,
        default=50,
        help="Maximum scheduler steps (default: 50)",
    )
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Reset Hermes bus before running",
    )
    args = parser.parse_args(argv)

    root = Path(__file__).resolve().parent.parent.parent
    bus = HermesBus(root=root / ".mavis" / "hermes")
    if args.reset:
        bus.reset()

    adapters = build_adapters(args.mode, root)
    scheduler = Scheduler(bus=bus, adapters=adapters)

    try:
        if args.phase:
            status = scheduler.read_status()
            status.phase = Phase(args.phase)
            status.current_project = args.project
            scheduler.write_status(status)

        status = scheduler.read_status()
        print(f"OpenClaw runner starting: project={args.project} mode={args.mode}")
        print(f"  current phase: {status.phase.value}")
        print(f"  current project: {status.current_project}")
        print()

        results = scheduler.run(max_events=args.max_events)
    except OpenclawError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2

    for i, result in enumerate(results, 1):
        marker = "HALT" if result.halted else "STEP"
        print(f"[{i:02d}] {marker}: {result.event or '-'} -> {result.phase_after.value if result.phase_after else '-'}")
        if result.reason:
            print(f"       {result.reason}")
        if result.halted:
            break

    final_status = scheduler.read_status()
    print()
    print(f"Final phase: {final_status.phase.value}")
    if final_status.phase.value == "cycle-complete":
        print("Tracer bullet completed successfully.")
        return 0
    if final_status.blockers:
        print(f"Blockers: {final_status.blockers}")
    print("Runner halted before cycle-complete.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
