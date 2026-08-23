import hashlib
import json
import subprocess
import sys
from pathlib import Path

from readiness_test_support import register_tools_package


register_tools_package()

from product_readiness_tools.fingerprint import manual_fingerprint, source_fingerprint
from product_readiness_tools.load import load_domain


REPO_ROOT = Path(__file__).resolve().parents[3]
READINESS_ROOT = REPO_ROOT / "docs" / "product-readiness"
REPORT = READINESS_ROOT / "tests" / "fixtures" / "literacy-pass-report.json"


def _current_literacy_report(tmp_path: Path) -> Path:
    payload = json.loads(REPORT.read_text(encoding="utf-8"))
    checkout = subprocess.run(
        ["git", "rev-parse", "HEAD"], cwd=REPO_ROOT, check=True, capture_output=True, text=True
    ).stdout.strip()
    domain = load_domain(READINESS_ROOT)
    use_case = next(item for item in domain.use_cases if item.id == "literacy-standalone-first-lesson")
    source_digest = str(source_fingerprint(domain, use_case, REPO_ROOT))
    manual_digest = str(manual_fingerprint(domain, use_case))
    payload["gitSha"] = checkout
    for result in payload["results"]:
        result["gitSha"] = checkout
        result["sourceFingerprint"] = source_digest
        result["manualFingerprint"] = manual_digest
        for artifact in result["artifacts"]:
            artifact_path = REPO_ROOT / artifact["path"]
            artifact["sha256"] = hashlib.sha256(artifact_path.read_bytes()).hexdigest()
    report = tmp_path / "literacy-pass-report.json"
    report.write_text(json.dumps(payload), encoding="utf-8")
    return report


def test_assess_dry_run_shows_scope_and_changes_without_mutation(tmp_path: Path) -> None:
    # Given a complete independent LiteracyDojo report
    evidence_before = (READINESS_ROOT / "evidence" / "results.ndjson").read_bytes()
    assessments_before = tuple((READINESS_ROOT / "assessments").iterdir())
    report = _current_literacy_report(tmp_path)

    # When assess runs in dry-run mode
    result = subprocess.run(
        [sys.executable, str(READINESS_ROOT / "tools" / "cli.py"), "assess", "--input", str(report), "--dry-run"],
        cwd=REPO_ROOT,
        check=False,
        capture_output=True,
        text=True,
    )

    # Then scope, expiry, fingerprints, blockers, and generated changes are visible without writes
    assert result.returncode == 0, result.stderr
    assert "revalidateBy" in result.stdout
    assert "sourceFingerprint=" in result.stdout
    assert "manualFingerprint=" in result.stdout
    assert "Severe-gap blockers: none" in result.stdout
    assert "Proposed generated changes" in result.stdout
    assert "Dry run: no tracked files were changed" in result.stdout
    assert (READINESS_ROOT / "evidence" / "results.ndjson").read_bytes() == evidence_before
    assert tuple((READINESS_ROOT / "assessments").iterdir()) == assessments_before


def test_enforce_rejects_report_narrower_than_published_grants(tmp_path: Path) -> None:
    # Given a current assessor report that omits journeys still granted by the published baseline
    report = _current_literacy_report(tmp_path)
    candidate = tmp_path / "product-readiness-report.json"
    report.rename(candidate)

    # When CI enforces the published readiness claims against that report
    result = subprocess.run(
        [sys.executable, str(READINESS_ROOT / "tools" / "cli.py"), "enforce", "--reports", str(tmp_path)],
        cwd=REPO_ROOT,
        check=False,
        capture_output=True,
        text=True,
    )

    # Then enforcement fails closed rather than silently dropping those grants
    assert result.returncode == 1
    assert "BLOCKED: os-returning-learner" in result.stderr
    # os-voxel-guided-missions is stale (source fingerprint drifted), so its
    # grant is no longer in force and there is nothing left to enforce; the
    # fail-closed demotion already happened in the generated matrix. Staleness
    # itself is enforced by the no-candidate branch. Revisit when os-voxel is
    # revalidated.
