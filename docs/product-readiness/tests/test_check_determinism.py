"""AID-1890 regression tests: `check` drift must be deterministic.

The generated views are validated against the RECORDED promoted decisions, so
neither the wall clock (revalidateBy boundaries) nor working-tree changes under
a use case's fingerprinted sourcePaths can redden an otherwise consistent PR.
The stale-claims window keeps a single blocking consumer: `check
--require-current`, which the CI main push lane runs as the re-grant factory
trigger.
"""

import hashlib
import importlib.util
import json
import shutil
import sys
from datetime import UTC, date, datetime, timedelta
from pathlib import Path

from readiness_test_support import register_tools_package


register_tools_package()

from product_readiness_tools.fingerprint import manual_fingerprint, source_fingerprint
from product_readiness_tools.load import load_domain


REPO_ROOT = Path(__file__).resolve().parents[3]
READINESS_ROOT = REPO_ROOT / "docs" / "product-readiness"
GIT_SHA = "a" * 40
ARTIFACT_SHA_PLACEHOLDER = "b" * 64


def _load_cli(readiness_root: Path, repo_root: Path):
    spec = importlib.util.spec_from_file_location(
        "fixture_readiness_cli", READINESS_ROOT / "tools" / "cli.py"
    )
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    module.READINESS_ROOT = readiness_root
    module.REPO_ROOT = repo_root
    return module


def _build_fixture(tmp_path: Path, revalidate_by: date) -> Path:
    """Assemble a minimal self-contained readiness domain under tmp_path."""
    import subprocess

    subprocess.run(
        ["git", "init", "-q"], cwd=tmp_path, check=True, capture_output=True, text=True
    )
    subprocess.run(
        ["git", "config", "user.email", "fixture@example.com"],
        cwd=tmp_path,
        check=True,
        capture_output=True,
        text=True,
    )
    subprocess.run(
        ["git", "config", "user.name", "fixture"],
        cwd=tmp_path,
        check=True,
        capture_output=True,
        text=True,
    )
    subprocess.run(
        ["git", "commit", "--allow-empty", "-q", "-m", "fixture"],
        cwd=tmp_path,
        check=True,
        capture_output=True,
        text=True,
    )
    readiness_root = tmp_path / "docs" / "product-readiness"
    readiness_root.mkdir(parents=True)
    shutil.copyfile(READINESS_ROOT / "policy.yaml", readiness_root / "policy.yaml")
    shutil.copyfile(READINESS_ROOT / "student-guide.md", readiness_root / "student-guide.md")
    shutil.copyfile(READINESS_ROOT / "facilitator-guide.md", readiness_root / "facilitator-guide.md")
    (readiness_root / "scenarios").mkdir()
    (readiness_root / "assessments").mkdir()
    (readiness_root / "evidence").mkdir()
    source_dir = tmp_path / "engines" / "fixtureEngine" / "src"
    source_dir.mkdir(parents=True)
    source_file = source_dir / "app.ts"
    source_file.write_text("export const version = 1;\n", encoding="utf-8")
    artifact_dir = tmp_path / "engines" / "fixtureEngine" / "artifacts"
    artifact_dir.mkdir(parents=True)
    artifact_file = artifact_dir / "happy-path.ndjson"
    artifact_file.write_text('{"scenario":"fixture-happy-path"}\n', encoding="utf-8")
    artifact_sha = hashlib.sha256(artifact_file.read_bytes()).hexdigest()

    inventory = """
schemaVersion: 1
useCases:
  - id: fixture-first-lesson
    surface: Fixture
    audience: testers
    intendedTier: experimental
    promise: A fixture journey stays deterministic.
    entry:
      route: /
      prerequisites: []
    progressSemantics: read-only
    recovery: reload
    nextAction: revisit
    scenarioIds: [fixture-happy-path]
    manualRefs:
      student: student-guide.md#standalone-literacydojo
      facilitator: facilitator-guide.md#standalone-literacydojo
    sourcePaths: [engines/fixtureEngine/src/]
    owner: qa
"""
    (readiness_root / "inventory.yaml").write_text(inventory, encoding="utf-8")

    scenario = """
schemaVersion: 1
id: fixture-happy-path
useCaseId: fixture-first-lesson
kind: happy-path
execution: automated
startState: fresh visitor
steps:
  - open the fixture
assertions:
  - id: fixture-renders
    severity: low
    evidence: playwright
    claim: the fixture renders
automation:
  workingDirectory: engines/fixtureEngine
  argv: [pnpm, test]
sourcePaths: [engines/fixtureEngine/src/]
"""
    (readiness_root / "scenarios" / "fixture-happy-path.yaml").write_text(scenario, encoding="utf-8")

    domain = load_domain(readiness_root)
    use_case = domain.use_cases[0]
    source_digest = str(source_fingerprint(domain, use_case, tmp_path))
    manual_digest = str(manual_fingerprint(domain, use_case))

    result = {
        "schemaVersion": 1,
        "scenarioId": "fixture-happy-path",
        "runId": "2026-09-14T12:00:00Z-fixture-happy-path-mixed-fixture1",
        "gitSha": GIT_SHA,
        "executedAt": "2026-09-14T12:00:00Z",
        "executor": "mixed",
        "outcome": "pass",
        "sourceFingerprint": source_digest,
        "manualFingerprint": manual_digest,
        "artifacts": [
            {
                "path": "engines/fixtureEngine/artifacts/happy-path.ndjson",
                "sha256": artifact_sha,
            }
        ],
        "gaps": [],
    }
    (readiness_root / "evidence" / "results.ndjson").write_text(
        json.dumps(result) + "\n", encoding="utf-8"
    )

    assessment = {
        "schemaVersion": 1,
        "assessmentId": "2026-09-14-fixture1",
        "assessorContext": "independent-readiness-review",
        "verifiedAt": "2026-09-14T12:05:00Z",
        "revalidateBy": revalidate_by.isoformat(),
        "gitSha": GIT_SHA,
        "decisions": [
            {
                "useCaseId": "fixture-first-lesson",
                "outcome": "pass",
                "grantedTier": "experimental",
                "reasons": [],
                "resultRunIds": [result["runId"]],
            }
        ],
    }
    import yaml

    (readiness_root / "assessments" / "2026-09-14-fixture1.yaml").write_text(
        yaml.safe_dump(assessment, sort_keys=False), encoding="utf-8"
    )

    views = _load_cli(readiness_root, tmp_path)
    views.write_views(load_domain(readiness_root))
    return readiness_root


def test_check_ignores_fingerprint_drift_under_source_paths(tmp_path: Path, capsys) -> None:
    # Given a consistent fixture domain with its generated view committed
    _build_fixture(tmp_path, date(2026, 10, 14))
    cli = _load_cli(tmp_path / "docs" / "product-readiness", tmp_path)

    # When a PR-like diff changes a file under the use case's sourcePaths
    source_file = tmp_path / "engines" / "fixtureEngine" / "src" / "app.ts"
    source_file.write_text("export const version = 2;\n", encoding="utf-8")

    # Then the deterministic check still passes (AID-1890: PR lanes must not
    # flap with the fingerprint stale window)...
    assert cli.main(["check"]) == 0
    # ...while the stale window stays visible to the factory trigger lane
    assert cli.main(["check", "--require-current"]) == 1
    assert "STALE-WINDOW: fixture-first-lesson" in capsys.readouterr().err


def test_check_ignores_revalidate_by_boundary(tmp_path: Path, capsys) -> None:
    # Given a fixture whose promoted assessment crossed its revalidateBy date
    yesterday = datetime.now(UTC).date() - timedelta(days=1)
    _build_fixture(tmp_path, yesterday)
    cli = _load_cli(tmp_path / "docs" / "product-readiness", tmp_path)

    # Then the deterministic check has no wall clock to cross...
    assert cli.main(["check"]) == 0
    # ...and the expiry is reported only under --require-current
    assert cli.main(["check", "--require-current"]) == 1
    assert "assessment has expired" in capsys.readouterr().err


def test_check_accepts_reports_flag_with_empty_directory(tmp_path: Path) -> None:
    # Given the CI invocation shape `check --reports DIR` (regression: the
    # flag itself must never be parsed as a report directory)
    _build_fixture(tmp_path, date(2026, 10, 14))
    cli = _load_cli(tmp_path / "docs" / "product-readiness", tmp_path)
    empty_reports = tmp_path / "artifacts" / "product-readiness"
    empty_reports.mkdir(parents=True)

    # Then the flag is consumed and the empty directory validates cleanly
    assert cli.main(["check", "--reports", str(empty_reports)]) == 0
    assert cli.main(["check", "--reports", str(empty_reports), "--require-current"]) == 0


def test_check_still_blocks_view_desync(tmp_path: Path, capsys) -> None:
    # Given a hand-edited generated view (canonical sources changed without a
    # re-render)
    _build_fixture(tmp_path, date(2026, 10, 14))
    cli = _load_cli(tmp_path / "docs" / "product-readiness", tmp_path)
    readme = tmp_path / "docs" / "product-readiness" / "README.md"
    readme.write_text(readme.read_text(encoding="utf-8") + "<!-- hand edit -->\n", encoding="utf-8")

    # Then check still fails closed on view drift: hygiene is deterministic
    # and remains a blocking defect on every lane
    assert cli.main(["check"]) == 1
    assert "DRIFT" in capsys.readouterr().err
