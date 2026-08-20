import hashlib
from dataclasses import replace
from datetime import date, datetime, timezone
from pathlib import Path

import pytest

from readiness_test_support import register_tools_package


register_tools_package()

from product_readiness_tools.evidence import AssessmentRequest, EvidenceError, propose_assessment
from product_readiness_tools.fingerprint import manual_fingerprint, source_fingerprint
from product_readiness_tools.load import load_domain
from product_readiness_tools.models import (
    ArtifactDigest,
    AssessmentId,
    ExecutorKind,
    GitSha,
    RepoPath,
    RunId,
    ScenarioOutcome,
    ScenarioResult,
    Sha256Digest,
)


REPO_ROOT = Path(__file__).resolve().parents[3]
READINESS_ROOT = REPO_ROOT / "docs" / "product-readiness"
GIT_SHA = GitSha("c22abf39a8b87715c5254a52b60756bf1fa48d5b")


def _request() -> AssessmentRequest:
    domain = load_domain(READINESS_ROOT)
    use_case = domain.use_cases[0]
    artifact_path = RepoPath("docs/product-readiness/student-guide.md")
    artifact_sha = Sha256Digest(hashlib.sha256((REPO_ROOT / artifact_path).read_bytes()).hexdigest())
    results = tuple(
        ScenarioResult(
            1,
            scenario_id,
            RunId(f"fixture-{scenario_id}"),
            GIT_SHA,
            datetime(2026, 8, 20, 12, tzinfo=timezone.utc),
            ExecutorKind.MIXED,
            ScenarioOutcome.PASS,
            source_fingerprint(domain, use_case, REPO_ROOT),
            manual_fingerprint(domain, use_case),
            (ArtifactDigest(artifact_path, artifact_sha),),
            (),
        )
        for scenario_id in use_case.scenario_ids
    )
    return AssessmentRequest(
        1,
        AssessmentId("2026-08-20-c22abf3"),
        "independent-readiness-review",
        datetime(2026, 8, 20, 17, tzinfo=timezone.utc),
        date(2026, 9, 20),
        GIT_SHA,
        results,
    )


def test_propose_assessment_binds_all_results_without_writing() -> None:
    # Given independently scoped passing scenario facts
    domain = load_domain(READINESS_ROOT)

    # When an assessment is proposed
    proposal = propose_assessment(domain, _request(), REPO_ROOT)

    # Then the exact result runs are bound to a passing decision
    assert proposal.assessment.decisions[0].outcome.value == "pass"
    assert len(proposal.assessment.decisions[0].result_run_ids) == 3
    assert domain.results == ()


def test_propose_assessment_rejects_previously_promoted_run_id() -> None:
    # Given a report reusing an existing promoted result
    domain = load_domain(READINESS_ROOT)
    request = _request()
    duplicate_domain = replace(domain, results=(request.results[0],))

    # When it is proposed, then append-only promotion rejects the replay
    with pytest.raises(EvidenceError, match="duplicate or previously promoted"):
        propose_assessment(duplicate_domain, request, REPO_ROOT)


def test_propose_assessment_rejects_artifact_digest_mismatch() -> None:
    # Given a report whose artifact bytes do not match its digest
    domain = load_domain(READINESS_ROOT)
    request = _request()
    invalid_artifact = replace(request.results[0].artifacts[0], sha256=Sha256Digest("0" * 64))
    invalid_result = replace(request.results[0], artifacts=(invalid_artifact,))

    # When it is proposed, then proof integrity blocks promotion
    with pytest.raises(EvidenceError, match="artifact digest mismatch"):
        propose_assessment(replace(domain), replace(request, results=(invalid_result, *request.results[1:])), REPO_ROOT)
