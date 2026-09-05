"""The staged literacy verifier corpus must track the canonical curriculum.

The Netlify verification bridge (AID-449) embeds a generated projection of
``curriculum/ai-literacy/``. If the corpus drifts from the canonical YAML,
hosted verdicts silently diverge from ``learner/gate/literacy_verifier.py``;
regenerating must be part of any content change, and CI enforces it here.
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
TRACK_TOOL = REPO_ROOT / "curriculum" / "ai-literacy" / "tools" / "validate.py"
TRACKED_CORPUS = (
    REPO_ROOT
    / "learner"
    / "gate"
    / "netlify-functions"
    / "_shared"
    / "literacy-corpus.mjs"
)


def test_staged_literacy_corpus_matches_canonical_curriculum(tmp_path: Path) -> None:
    result = subprocess.run(
        [sys.executable, str(TRACK_TOOL), "--compile-verifier", str(tmp_path)],
        capture_output=True,
        text=True,
        cwd=REPO_ROOT,
    )
    assert result.returncode == 0, result.stderr
    regenerated = tmp_path / "literacy-corpus.mjs"
    assert regenerated.is_file(), "canonical tool did not emit the corpus"
    assert regenerated.read_text(encoding="utf-8") == TRACKED_CORPUS.read_text(
        encoding="utf-8"
    ), (
        "learner/gate/netlify-functions/_shared/literacy-corpus.mjs is stale — "
        "regenerate with: python3 curriculum/ai-literacy/tools/validate.py "
        "--compile-verifier learner/gate/netlify-functions/_shared"
    )
