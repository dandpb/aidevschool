import json
from pathlib import Path

from readiness_test_support import register_tools_package

register_tools_package()

from product_readiness_tools.load import load_domain
from product_readiness_tools.reports import (
    build_candidate_report,
    emit_engine_reports,
    validate_report_directories,
)


REPO_ROOT = Path(__file__).resolve().parents[3]
READINESS_ROOT = REPO_ROOT / "docs" / "product-readiness"


def test_emit_engine_reports_records_only_owned_automated_scenarios(tmp_path: Path) -> None:
    # Given the canonical domain and a successful OS producer run
    domain = load_domain(READINESS_ROOT)
    output = tmp_path / "readiness"

    # When the producer emits its normalized scenario facts
    changed = emit_engine_reports(domain, REPO_ROOT, "engines/codexdojo-os-prototype", output)

    # Then every emitted fact belongs to the OS suite and contains scoped fingerprints
    assert changed
    reports = [json.loads(path.read_text(encoding="utf-8")) for path in sorted(output.glob("*.json"))]
    assert {report["scenarioId"] for report in reports} == {
        "os-onboarding-track-choice",
        "os-literacy-hosted-mission",
        "os-literacy-returning-device",
        "os-voxel-hosted-missions",
        "os-voxel-returning-device",
        "os-verification-recovery",
        "os-renderer-accessibility-recovery",
        "os-returning-recovery",
        "os-returning-device",
    }
    assert all(len(report["sourceFingerprint"]) == 64 for report in reports)
    assert all(len(report["manualFingerprint"]) == 64 for report in reports)
    assert all(report["executor"] == "automated" for report in reports)
    assert all("grantedTier" not in report for report in reports)


def test_validate_report_directories_rejects_tampered_fingerprint(tmp_path: Path) -> None:
    # Given a complete LiteracyDojo report set with one modified fingerprint
    domain = load_domain(READINESS_ROOT)
    output = tmp_path / "readiness"
    emit_engine_reports(domain, REPO_ROOT, "engines/literacyDojo", output)
    report_path = next(output.glob("*.json"))
    report = json.loads(report_path.read_text(encoding="utf-8"))
    report["sourceFingerprint"] = "0" * 64
    report_path.write_text(json.dumps(report), encoding="utf-8")

    # When the readiness checker validates the producer directory
    errors = validate_report_directories(domain, REPO_ROOT, (output,))

    # Then it rejects the report rather than trusting producer-owned claims
    assert any("source fingerprint" in error for error in errors)


def test_emit_engine_reports_covers_programmer_browser_producers(tmp_path: Path) -> None:
    # Given the canonical programmer journeys and successful browser producers
    domain = load_domain(READINESS_ROOT)

    # When PixelDojo and voxelDojo normalize their owned results
    pixel_output = tmp_path / "pixel"
    voxel_output = tmp_path / "voxel"
    pixel_output.mkdir()
    (pixel_output / "stale.json").write_text("{}", encoding="utf-8")
    emit_engine_reports(domain, REPO_ROOT, "engines/pixelDojo", pixel_output)
    emit_engine_reports(domain, REPO_ROOT, "engines/voxelDojo", voxel_output)

    # Then each producer reports only scenarios with an exercised browser assertion
    pixel_ids = {json.loads(path.read_text())["scenarioId"] for path in pixel_output.glob("*.json")}
    voxel_ids = {json.loads(path.read_text())["scenarioId"] for path in voxel_output.glob("*.json")}
    assert pixel_ids == {"pixelquest-encounter-evidence"}
    assert voxel_ids == {"voxel-standalone-loop"}
    assert not (pixel_output / "stale.json").exists()


def test_emit_engine_reports_can_limit_facts_to_exercised_scenarios(tmp_path: Path) -> None:
    # Given a producer command that exercised only one declared OS scenario
    domain = load_domain(READINESS_ROOT)
    output = tmp_path / "os"

    # When the producer normalizes that explicit scenario scope
    emit_engine_reports(
        domain,
        REPO_ROOT,
        "engines/codexdojo-os-prototype",
        output,
        ("os-onboarding-track-choice",),
    )

    # Then it does not fabricate facts for unexercised sibling scenarios
    report_ids = {json.loads(path.read_text(encoding="utf-8"))["scenarioId"] for path in output.glob("*.json")}
    assert report_ids == {"os-onboarding-track-choice"}


def test_build_candidate_report_contains_facts_without_a_readiness_grant(tmp_path: Path) -> None:
    # Given a producer report for a tested checkout
    domain = load_domain(READINESS_ROOT)
    output = tmp_path / "pixel"
    output.mkdir()
    emit_engine_reports(domain, REPO_ROOT, "engines/pixelDojo", output)

    # When CI aggregates the producer facts
    report, errors = build_candidate_report(
        domain,
        REPO_ROOT,
        (output,),
        "2026-08-20-candidate",
        "2026-08-20T17:00:00Z",
        "2026-09-20",
    )

    # Then it creates an assessor input without embedding a decision or grant
    assert errors == ()
    assert report is not None
    assert "decisions" not in report
    assert report["assessorContext"] == "independent-readiness-review"
    assert report["results"]
