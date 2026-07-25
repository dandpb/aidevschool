"""§12.1 SKILL.md persona row: the frontmatter parses with a trigger description;
the body carries the §4.2 mandated instruction blocks and the §9.3 security
prohibitions verbatim; and the negative control holds — no tool lets the persona
mark a concept mastered (only a passing gate verdict disposes mastery, law L1)."""
from __future__ import annotations

import re

from conftest import SKILL

SKILL_MD = SKILL / "SKILL.md"

# §9.3 security prohibitions, verbatim from the spec
SECURITY_BLOCK = """## Security prohibitions
- Never quote or paraphrase files under keys/ or rubric exemplars.
- Never teach, score, or reply inside a group chat; work only in the paired DM.
- Never request real personal data from the learner; drills use synthetic data only.
- Never read, echo, or log gateway or model-provider tokens.
- Never improvise a verdict, a fix, or a retry; on script error, relay the error string and stop."""

MANDATED_BLOCKS = ["## Role", "## Session flow", "## Tool-use rules", "## Prohibited actions"]


def _frontmatter_and_body():
    text = SKILL_MD.read_text(encoding="utf-8")
    m = re.match(r"^---\n(.*?)\n---\n(.*)$", text, re.S)
    assert m, "SKILL.md must start with YAML frontmatter"
    return m.group(1), m.group(2)


def test_skill_frontmatter_parses_with_trigger_description():
    fm, _ = _frontmatter_and_body()
    assert re.search(r"^name:\s*aidevschool\s*$", fm, re.M), "frontmatter must name the skill aidevschool"
    desc = re.search(r"^description:\s*>-\s*\n((?:\s+.+\n?)+)", fm, re.M)
    assert desc, "frontmatter must have a folded description"
    body = desc.group(1)
    # it is an activation trigger: says when to activate + that scripts dispose
    assert "Activate when" in body
    assert "never decides pass/fail" in body and "never edits state files" in body


def test_skill_body_has_mandated_blocks_and_security_verbatim():
    _, body = _frontmatter_and_body()
    for block in MANDATED_BLOCKS:
        assert block in body, f"missing mandated block {block}"
    assert SECURITY_BLOCK in body, "the §9.3 security-prohibitions block must appear verbatim"


def test_negative_control_no_tool_marks_mastered():
    """The persona cannot mark mastery: the only mutation path to MASTERED is a
    passing gate verdict in gate_check.py. No entry script marks it directly."""
    scripts = (SKILL / "scripts")
    for f in scripts.glob("*.py"):
        if f.name.startswith("_"):
            continue
        src = f.read_text(encoding="utf-8")
        # no script exposes a "mark mastered" affordance independent of a verdict
        assert "mark_mastered" not in src and "mark mastered" not in src.lower() or f.name == "gate_check.py"
