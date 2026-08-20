import subprocess
import sys
from pathlib import Path

from readiness_test_support import register_tools_package


register_tools_package()

from product_readiness_tools.load import load_domain
from product_readiness_tools.render import GENERATED_MARKER, render_matrix


REPO_ROOT = Path(__file__).resolve().parents[3]
READINESS_ROOT = REPO_ROOT / "docs" / "product-readiness"


def test_render_matrix_distinguishes_intended_tier_from_current_status() -> None:
    # Given a valid promise with no promoted assessment
    domain = load_domain(READINESS_ROOT)

    # When the current matrix is rendered
    rendered = render_matrix(domain)

    # Then it identifies ownership and reports the claim as unassessed
    assert rendered.startswith(GENERATED_MARKER)
    assert "customer-ready" in rendered
    assert "unassessed" in rendered


def test_cli_check_is_read_only_and_accepts_generated_matrix() -> None:
    # Given canonical inputs and their generated matrix
    readme = READINESS_ROOT / "README.md"
    before = readme.read_bytes()

    # When check runs through the public CLI
    result = subprocess.run(
        [sys.executable, str(READINESS_ROOT / "tools" / "cli.py"), "check"],
        cwd=REPO_ROOT,
        check=False,
        capture_output=True,
        text=True,
    )

    # Then it succeeds without changing the generated file
    assert result.returncode == 0, result.stderr
    assert readme.read_bytes() == before
