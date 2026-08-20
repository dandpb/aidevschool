#!/usr/bin/env python3
from __future__ import annotations

import sys
from dataclasses import replace
from pathlib import Path
from typing import Final

import yaml


READINESS_ROOT: Final = Path(__file__).resolve().parent.parent
REPO_ROOT: Final = READINESS_ROOT.parents[1]
if str(READINESS_ROOT) not in sys.path:
    sys.path.insert(0, str(READINESS_ROOT))

from tools.load import DomainParseError, load_domain  # noqa: E402
from tools.history import HistoryParseError  # noqa: E402
from tools.evidence import (  # noqa: E402
    EvidenceError,
    assessment_mapping,
    load_assessment_request,
    propose_assessment,
    write_assessment,
)
from tools.models import ReadinessDomain  # noqa: E402
from tools.render import drift, expected_views, write_views  # noqa: E402
from tools.reports import emit_engine_reports, validate_report_directories  # noqa: E402
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
    except (DomainParseError, HistoryParseError) as error:
        print(f"INVALID: {error}", file=sys.stderr)
        return 1
    if domain is None:
        return 1
    if arguments and arguments[0] == "check" and (len(arguments) == 1 or arguments[1] == "--reports"):
        report_directories = tuple(Path(value) for value in arguments[2:]) if len(arguments) > 1 else ()
        report_errors = validate_report_directories(domain, REPO_ROOT, report_directories)
        if report_errors:
            for error in report_errors:
                print(f"INVALID: {error}", file=sys.stderr)
            return 1
        changed = drift(domain)
        if changed:
            for path in changed:
                print(f"DRIFT: {path.relative_to(REPO_ROOT)}", file=sys.stderr)
            return 1
        print("Product-readiness sources and generated matrix are valid and in sync.")
        return 0
    if len(arguments) == 5 and arguments[:2] == ["producer-report", "--engine"] and arguments[3] == "--output":
        changed = emit_engine_reports(domain, REPO_ROOT, arguments[2], Path(arguments[4]))
        for path in changed:
            print(f"Reported {path.relative_to(REPO_ROOT) if path.is_relative_to(REPO_ROOT) else path}")
        return 0
    if arguments == ["render"]:
        changed = write_views(domain)
        for path in changed:
            print(f"Rendered {path.relative_to(REPO_ROOT)}")
        if not changed:
            print("Product-readiness generated matrix is already in sync.")
        return 0
    if len(arguments) in {3, 4} and arguments[:2] == ["assess", "--input"]:
        dry_run = len(arguments) == 4 and arguments[3] == "--dry-run"
        if len(arguments) == 4 and not dry_run:
            print("INVALID: the only supported assess flag is --dry-run", file=sys.stderr)
            return 2
        try:
            request = load_assessment_request(Path(arguments[2]))
            proposal = propose_assessment(domain, request, REPO_ROOT)
        except EvidenceError as error:
            print(f"INVALID: {error}", file=sys.stderr)
            return 1
        proposed_domain = replace(
            domain,
            results=domain.results + request.results,
            assessments=domain.assessments + (proposal.assessment,),
        )
        print("Proposed independent readiness assessment:")
        print(yaml.safe_dump(assessment_mapping(proposal.assessment), sort_keys=False).rstrip())
        print("Evidence scope:")
        for result in request.results:
            print(
                f"- {result.scenario_id}: run={result.run_id} "
                f"sourceFingerprint={result.source_fingerprint} manualFingerprint={result.manual_fingerprint}"
            )
        blockers = [
            reason
            for decision in proposal.assessment.decisions
            for reason in decision.reasons
            if "severe gap" in reason
        ]
        print(f"Severe-gap blockers: {', '.join(blockers) if blockers else 'none'}")
        print("Proposed generated changes:")
        for path, _content in expected_views(proposed_domain):
            print(f"- {path.relative_to(REPO_ROOT)}")
        if dry_run:
            print("Dry run: no tracked files were changed.")
            return 0
        write_assessment(proposal, READINESS_ROOT)
        write_views(load_domain(READINESS_ROOT))
        return 0
    print("usage: python3 docs/product-readiness/tools/cli.py {check [--reports DIR...]|render|producer-report --engine DIR --output DIR|assess --input REPORT [--dry-run]}", file=sys.stderr)
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
