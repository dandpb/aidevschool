from pathlib import Path

from readiness_test_support import register_tools_package


register_tools_package()

from product_readiness_tools.fingerprint import fingerprint_paths, manual_fingerprint, source_fingerprint
from product_readiness_tools.load import load_domain
from product_readiness_tools.models import RepoPath


REPO_ROOT = Path(__file__).resolve().parents[3]
READINESS_ROOT = REPO_ROOT / "docs" / "product-readiness"


def test_fingerprint_paths_changes_with_declared_content(tmp_path: Path) -> None:
    # Given one declared file
    declared = tmp_path / "declared.txt"
    declared.write_text("before", encoding="utf-8")
    before = fingerprint_paths(tmp_path, (RepoPath("declared.txt"),))

    # When its content changes
    declared.write_text("after", encoding="utf-8")

    # Then its content-addressed fingerprint changes
    assert fingerprint_paths(tmp_path, (RepoPath("declared.txt"),)) != before


def test_use_case_fingerprints_are_canonical_sha256_values() -> None:
    # Given the standalone LiteracyDojo use case
    domain = load_domain(READINESS_ROOT)
    use_case = domain.use_cases[0]

    # When its declared source and manual sections are fingerprinted
    source = source_fingerprint(domain, use_case, REPO_ROOT)
    manual = manual_fingerprint(domain, use_case)

    # Then both are lowercase SHA-256 values
    assert len(source) == 64 and source.isalnum() and source == source.lower()
    assert len(manual) == 64 and manual.isalnum() and manual == manual.lower()
