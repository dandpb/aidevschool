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


def test_fingerprint_paths_ignores_generated_test_results(tmp_path: Path) -> None:
    # Given a declared engine root and no browser output yet
    engine = tmp_path / "engine"
    engine.mkdir()
    (engine / "source.ts").write_text("source", encoding="utf-8")
    before = fingerprint_paths(tmp_path, (RepoPath("engine"),))

    # When a generated browser result is added under the engine root
    output = engine / "test-results" / "run.json"
    output.parent.mkdir()
    output.write_text("generated", encoding="utf-8")

    # Then the source fingerprint remains stable
    assert fingerprint_paths(tmp_path, (RepoPath("engine"),)) == before


def test_fingerprint_paths_ignores_marked_generated_sources(tmp_path: Path) -> None:
    # Given a declared engine root and a marked generated projection
    engine = tmp_path / "engine"
    engine.mkdir()
    (engine / "source.ts").write_text("source", encoding="utf-8")
    generated = engine / "generated.ts"
    generated.write_text("// AUTO-GENERATED\nvalue=before\n", encoding="utf-8")
    before = fingerprint_paths(tmp_path, (RepoPath("engine"),))

    # When the substrate changes the generated projection
    generated.write_text("// AUTO-GENERATED\nvalue=after\n", encoding="utf-8")

    # Then the source fingerprint remains stable
    assert fingerprint_paths(tmp_path, (RepoPath("engine"),)) == before


def test_fingerprint_paths_ignores_do_not_edit_generated_sources(tmp_path: Path) -> None:
    # Given a generator-owned source using the repository's standard warning
    engine = tmp_path / "engine"
    engine.mkdir()
    (engine / "source.ts").write_text("source", encoding="utf-8")
    before = fingerprint_paths(tmp_path, (RepoPath("engine"),))

    # When the generated source appears after a producer build
    generated = engine / "generated.ts"
    generated.write_text("// DO NOT EDIT BY HAND\nvalue=generated\n", encoding="utf-8")

    # Then producer and aggregator checkouts keep the same fingerprint
    assert fingerprint_paths(tmp_path, (RepoPath("engine"),)) == before


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
