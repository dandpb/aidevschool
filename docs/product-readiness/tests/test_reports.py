import json
from pathlib import Path

from readiness_test_support import register_tools_package

register_tools_package()

from product_readiness_tools.load import load_domain
from product_readiness_tools.reports import emit_engine_reports, validate_report_directories


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
