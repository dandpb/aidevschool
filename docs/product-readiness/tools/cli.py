#!/usr/bin/env python3
from __future__ import annotations

import sys
from pathlib import Path
from typing import Final


READINESS_ROOT: Final = Path(__file__).resolve().parent.parent
REPO_ROOT: Final = READINESS_ROOT.parents[1]
if str(READINESS_ROOT) not in sys.path:
    sys.path.insert(0, str(READINESS_ROOT))

from tools.load import DomainParseError, load_domain  # noqa: E402
from tools.models import ReadinessDomain  # noqa: E402
from tools.render import drift, write_views  # noqa: E402
from tools.validate import validate_domain  # noqa: E402


def _load_valid_domain() -> ReadinessDomain | None:
    domain = load_domain(READINESS_ROOT)
    errors = validate_domain(domain, REPO_ROOT)
    if errors:
        for error in errors:
            print(f"INVALID: {error}", file=sys.stderr)
        return None
    return domain


def main(args: list[str] | None = None) -> int:
    arguments = list(sys.argv[1:] if args is None else args)
    try:
        domain = _load_valid_domain()
    except DomainParseError as error:
        print(f"INVALID: {error}", file=sys.stderr)
        return 1
    if domain is None:
        return 1
    if arguments == ["check"]:
        changed = drift(domain)
        if changed:
            for path in changed:
                print(f"DRIFT: {path.relative_to(REPO_ROOT)}", file=sys.stderr)
            return 1
        print("Product-readiness sources and generated matrix are valid and in sync.")
        return 0
    if arguments == ["render"]:
        changed = write_views(domain)
        for path in changed:
            print(f"Rendered {path.relative_to(REPO_ROOT)}")
        if not changed:
            print("Product-readiness generated matrix is already in sync.")
        return 0
    print("usage: python3 docs/product-readiness/tools/cli.py {check|render}", file=sys.stderr)
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
