#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
import subprocess
from dataclasses import replace
from datetime import UTC, datetime, timedelta
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
    AssessmentProposal,
    EvidenceError,
    assessment_mapping,
    load_assessment_request,
    propose_assessment,
    write_assessment,
)
from tools.evaluate import current_decision  # noqa: E402
from tools.models import DecisionOutcome, ReadinessDomain  # noqa: E402
from tools.render import drift, expected_views, write_views  # noqa: E402
from tools.reports import (  # noqa: E402
    CandidateRequest,
    ReportSnapshot,
    build_candidate_report,
    emit_engine_reports,
    snapshot_report_directories,
    validate_report_directories,
)
from tools.validate import validate_domain  # noqa: E402


def _load_valid_domain() -> ReadinessDomain | None:
    domain = load_domain(READINESS_ROOT)
    errors = validate_domain(domain, REPO_ROOT)
    if errors:
        for error in errors:
            print(f"INVALID: {error}", file=sys.stderr)
        return None
    return domain


def _checkout_sha() -> str:
    return subprocess.run(
        ["git", "rev-parse", "HEAD"], cwd=REPO_ROOT, check=True, capture_output=True, text=True
    ).stdout.strip()


def _candidate_path(directories: tuple[Path, ...]) -> Path | None:
    candidates = tuple(
        path
        for directory in directories
        if directory.is_dir()
        for path in sorted(directory.rglob("product-readiness-report.json"))
    )
    return candidates[0] if candidates else None


def _print_candidate(proposal: AssessmentProposal) -> None:
    assessment = proposal.assessment
    print("Readiness candidate evaluated without writes:")
    for decision in sorted(assessment.decisions, key=lambda item: item.use_case_id):
        reasons = "; ".join(decision.reasons) or "-"
        print(f"- {decision.use_case_id}: {decision.outcome}; reasons={reasons}")


def _aggregate_arguments(
    arguments: list[str],
) -> tuple[tuple[Path, ...], tuple[Path, ...], Path, str, str, str] | None:
    if arguments[:1] != ["aggregate"] or "--reports" not in arguments or "--output" not in arguments:
        return None
    reports_start = arguments.index("--reports") + 1
    output_start = arguments.index("--output")
    if reports_start >= output_start:
        return None
    observations_start = arguments.index("--observations") if "--observations" in arguments else None
    reports_end = output_start if observations_start is None else observations_start
    directories = tuple(Path(value) for value in arguments[reports_start:reports_end])
    observation_directories = (
        ()
        if observations_start is None
        else tuple(Path(value) for value in arguments[observations_start + 1 : output_start])
    )
    if not directories or output_start + 1 >= len(arguments):
        return None
    output = Path(arguments[output_start + 1])
    options = arguments[output_start + 2 :]
    values: dict[str, str] = {}
    index = 0
    while index < len(options):
        option = options[index]
        if option not in {"--assessment-id", "--verified-at", "--revalidate-by"}:
            return None
        if index + 1 >= len(options):
            return None
        values[option] = options[index + 1]
        index += 2
    now = datetime.now(UTC).replace(microsecond=0)
    checkout = _checkout_sha()
    return (
        directories,
        observation_directories,
        output,
        values.get("--assessment-id", f"{now.date().isoformat()}-{checkout[:8]}-candidate"),
        values.get("--verified-at", now.isoformat().replace("+00:00", "Z")),
        values.get("--revalidate-by", (now.date() + timedelta(days=30)).isoformat()),
    )


def main(args: list[str] | None = None) -> int:
    arguments = list(sys.argv[1:] if args is None else args)
    try:
        domain = _load_valid_domain()
    except (DomainParseError, HistoryParseError) as error:
        print(f"INVALID: {error}", file=sys.stderr)
        return 1
    if domain is None:
        return 1
    aggregate = _aggregate_arguments(arguments)
    if aggregate is not None:
        directories, observation_directories, output, assessment_id, verified_at, revalidate_by = aggregate
        snapshot_directories, snapshot_errors = snapshot_report_directories(
            domain,
            REPO_ROOT,
            ReportSnapshot(
                sources=directories,
                destination=READINESS_ROOT / "evidence" / "producers" / assessment_id,
            ),
        )
        if snapshot_errors:
            for error in snapshot_errors:
                print(f"INVALID: {error}", file=sys.stderr)
            return 1
        report, errors = build_candidate_report(
            domain,
            REPO_ROOT,
            CandidateRequest(
                directories=snapshot_directories,
                assessment_id=assessment_id,
                verified_at=verified_at,
                revalidate_by=revalidate_by,
                observation_directories=observation_directories,
            ),
        )
        if errors:
            for error in errors:
                print(f"INVALID: {error}", file=sys.stderr)
            return 1
        assert report is not None
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        print(f"Aggregated {len(report['results'])} producer result(s) into {output}.")
        print("The aggregate contains facts only; an independent assessor must evaluate it.")
        return 0
    if arguments and arguments[0] == "check" and (len(arguments) == 1 or arguments[1] == "--reports"):
        report_directories = tuple(Path(value) for value in arguments[2:]) if len(arguments) > 1 else ()
        report_errors = validate_report_directories(domain, REPO_ROOT, report_directories)
        if report_errors:
            for error in report_errors:
                print(f"INVALID: {error}", file=sys.stderr)
            return 1
        candidate = _candidate_path(report_directories)
        if candidate is not None:
            try:
                request = load_assessment_request(candidate)
                proposal = propose_assessment(domain, request, REPO_ROOT)
            except EvidenceError as error:
                print(f"INVALID: {error}", file=sys.stderr)
                return 1
            _print_candidate(proposal)
        changed = drift(domain)
        if changed:
            for path in changed:
                print(f"DRIFT: {path.relative_to(REPO_ROOT)}", file=sys.stderr)
            return 1
        print("Product-readiness sources and generated matrix are valid and in sync.")
        return 0
    if arguments and arguments[0] == "enforce" and len(arguments) > 2 and arguments[1] == "--reports":
        report_directories = tuple(Path(value) for value in arguments[2:])
        report_errors = validate_report_directories(domain, REPO_ROOT, report_directories)
        if report_errors:
            for error in report_errors:
                print(f"INVALID: {error}", file=sys.stderr)
            return 1
        candidate = _candidate_path(report_directories)
        decisions = ()
        if candidate is not None:
            try:
                request = load_assessment_request(candidate)
                decisions = propose_assessment(domain, request, REPO_ROOT).assessment.decisions
            except EvidenceError as error:
                print(f"INVALID: {error}", file=sys.stderr)
                return 1
        else:
            now = datetime.now(UTC)
            decisions = tuple(
                current_decision(domain, use_case, REPO_ROOT, now) for use_case in domain.use_cases
            )
        blocked = tuple(
            decision
            for decision in decisions
            if decision.outcome in {DecisionOutcome.BLOCKED, DecisionOutcome.STALE}
        )
        if blocked:
            for decision in blocked:
                print(
                    f"BLOCKED: {decision.use_case_id}: {decision.outcome}; "
                    f"reasons={'; '.join(decision.reasons)}",
                    file=sys.stderr,
                )
            return 1
        print("Product-readiness claims have no blocked or stale decisions.")
        return 0
    if len(arguments) >= 5 and arguments[:2] == ["producer-report", "--engine"] and arguments[3] == "--output":
        scenario_ids = ()
        if len(arguments) > 5:
            if arguments[5] != "--scenarios" or len(arguments) == 6:
                print("INVALID: producer-report accepts only --scenarios ID...", file=sys.stderr)
                return 2
            scenario_ids = tuple(arguments[6:])
        changed = emit_engine_reports(domain, REPO_ROOT, arguments[2], Path(arguments[4]), scenario_ids or None)
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
    print(
        "usage: python3 docs/product-readiness/tools/cli.py "
        "{check [--reports DIR...]|enforce --reports DIR...|render|"
        "aggregate --reports DIR... [--observations DIR...] --output FILE [--assessment-id ID] "
        "[--verified-at ISO] [--revalidate-by DATE]|producer-report --engine DIR --output DIR "
        "[--scenarios ID...]|"
        "assess --input REPORT [--dry-run]}",
        file=sys.stderr,
    )
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
