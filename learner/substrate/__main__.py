from __future__ import annotations

import sys

from learner.substrate import ROOT, check, sync


def main(args: list[str] | None = None) -> int:
    arguments = list(sys.argv[1:] if args is None else args)
    if arguments == ["--check"]:
        drift = check()
        if drift:
            for path in drift:
                print(f"DRIFT: {path.relative_to(ROOT)}")
            return 1
        print("Canonical learner state and generated projections are in sync.")
        return 0
    if arguments in (["--help"], ["-h"]):
        print("usage: python3 -m learner.substrate [--check]")
        return 0
    if arguments:
        print(f"unknown arguments: {' '.join(arguments)}", file=sys.stderr)
        return 2
    sync()
    print("Derived views regenerated from canonical sources.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
