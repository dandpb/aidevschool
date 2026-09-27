"""Factory PR body registers the producer at origin (AID-3127).

Regression guard for the gap found in drill AID-3121/PR #597: the factory PR
was born without any 'Provenance:' trailer, so countersign-gate §5
(AID-2768) failed 'producer unattributed' and needed a manual CEO
registration (AID-3124) before QA could countersign.

The contract under test: the "build the PR body" step of
.github/workflows/readiness-regrant.yml renders a body whose LAST unfenced
line is the canonical producer trailer
    Provenance: agent=readiness-regrant-factory task=AID-1357 run=… session=…
which the gate core (scripts/countersign_gate_check.py, evaluate()) reads as
the earliest trailer (PR body first) -> producer attributed at origin, and a
later independent countersign (e.g. qa-lead) passes the whole gate.
"""

import importlib.util
import os
import re
import stat
import subprocess
import textwrap

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
WORKFLOW = REPO_ROOT / ".github" / "workflows" / "readiness-regrant.yml"
GATE = REPO_ROOT / "scripts" / "countersign_gate_check.py"

HEAD = "4df811704408ca1e6fece9c865f00bc16c59d13d"

QA_COUNTERSIGN = (
    "Countersign: AID-3127 verdict GO head=%s\n"
    "Provenance: agent=qa-lead task=AID-3127 run=a3127-hb1 session=11111111-2222-3333-4444-555555555555"
    % HEAD
)


def _load_gate():
    spec = importlib.util.spec_from_file_location("countersign_gate_check_a3127", GATE)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _body_script():
    import yaml

    with open(WORKFLOW, "r", encoding="utf-8") as fh:
        wf = yaml.safe_load(fh)
    steps = wf["jobs"]["propose-regrant"]["steps"]
    step = next(s for s in steps if s.get("name") == "build the PR body")
    return step["run"]


def _render_body(tmp_path, script):
    rendered = (
        script.replace("${{ github.run_id }}", "36325382572")
        .replace("${{ github.run_attempt }}", "1")
        .replace("${{ github.event.workflow_run.id }}", "36325382572")
    )
    workdir = tmp_path / "render"
    workdir.mkdir()
    env = dict(os.environ)
    env.update({"RUN_ID": "36325382572", "SHA": HEAD, "SHA8": HEAD[:8], "TODAY": "20260927"})
    proc = subprocess.run(
        ["bash", "-c", rendered], cwd=str(workdir), env=env,
        capture_output=True, text=True,
    )
    assert proc.returncode == 0, proc.stderr
    body = (workdir / "pr-body.md").read_text(encoding="utf-8")
    assert body, "rendered PR body is empty"
    return body


def _stub_resolver(tmp_path):
    resolver = tmp_path / "resolver.sh"
    resolver.write_text("#!/bin/sh\nexit 0\n", encoding="utf-8")
    resolver.chmod(resolver.stat().st_mode | stat.S_IXUSR)
    return str(resolver)


def _ctx(body, comments):
    return {"body": body, "mergedAt": None, "comments": comments}


def _comment(body, when="2026-09-27T17:00:00Z"):
    return {"createdAt": when, "body": body}


def test_body_carries_unfenced_producer_trailer(tmp_path):
    gate = _load_gate()
    body = _render_body(tmp_path, _body_script())
    m = gate.PROVENANCE_RE.search(gate.strip_code_fences(body))
    assert m is not None, (
        "factory PR body must carry a canonical 'Provenance:' trailer outside "
        "code fences (AID-3127): %r" % body[-400:]
    )
    assert m.group("agent") == "readiness-regrant-factory"
    assert m.group("task") == "AID-1357"
    assert re.search(r"^Provenance:", body, re.MULTILINE), (
        "trailer must be a line-start line in the raw body"
    )


def test_gate_attributes_producer_at_origin(tmp_path):
    """No comments yet: the only red must be §1 (no citation), NOT §5.

    The #597 gap shape was 'producer unattributed' on a factory PR with no
    comments — after AID-3127 the body alone attributes the producer.
    """
    gate = _load_gate()
    body = _render_body(tmp_path, _body_script())
    try:
        gate.evaluate(_ctx(body, []), [], HEAD, _stub_resolver(tmp_path))
    except gate.Violation as exc:
        assert "producer unattributed" not in str(exc), str(exc)
        assert "Countersign:" in str(exc), str(exc)  # §1: correct pre-countersign red
    else:
        raise AssertionError("gate must stay red before any countersign comment")


def test_gate_passes_with_independent_countersign(tmp_path):
    gate = _load_gate()
    body = _render_body(tmp_path, _body_script())
    operative, producer, countersigner = gate.evaluate(
        _ctx(body, [_comment(QA_COUNTERSIGN)]), [], HEAD, _stub_resolver(tmp_path)
    )
    assert producer == "readiness-regrant-factory", producer
    assert countersigner == "qa-lead", countersigner


def test_body_without_trailer_is_producer_unattributed(tmp_path):
    """Guard the regression: pre-AID-3127 body shape (#597) reddens §5."""
    gate = _load_gate()
    body = _render_body(tmp_path, _body_script())
    old_shape = "\n".join(
        line for line in body.split("\n") if not line.startswith("Provenance:")
    )
    try:
        gate.evaluate(_ctx(old_shape, []), [], HEAD, _stub_resolver(tmp_path))
    except gate.Violation as exc:
        assert "producer unattributed" in str(exc), str(exc)
    else:
        raise AssertionError("old body shape must fail §5 (producer unattributed)")


def test_trailer_inside_code_fence_does_not_count(tmp_path):
    """AID-2824: fenced trailers are documentation, never attribution."""
    gate = _load_gate()
    body = _render_body(tmp_path, _body_script())
    fenced = re.sub(
        r"^(Provenance:.*)$",
        r"```\n\1\n```",
        body,
        flags=re.MULTILINE,
    )
    assert "```" in fenced
    try:
        gate.evaluate(_ctx(fenced, []), [], HEAD, _stub_resolver(tmp_path))
    except gate.Violation as exc:
        assert "producer unattributed" in str(exc), str(exc)
    else:
        raise AssertionError("fenced trailer must not attribute the producer")


def test_factory_slug_cannot_countersign_itself(tmp_path):
    """§5 independence: a citation from the factory's own agent slug reddens."""
    gate = _load_gate()
    body = _render_body(tmp_path, _body_script())
    self_cite = textwrap.dedent(
        """
        Countersign: AID-3127 verdict GO head=%s
        Provenance: agent=readiness-regrant-factory task=AID-3127 run=gha-36325382572 session=gha-36325382572.attempt1
        """
        % HEAD
    ).strip()
    try:
        gate.evaluate(
            _ctx(body, [_comment(self_cite)]), [], HEAD, _stub_resolver(tmp_path)
        )
    except gate.Violation as exc:
        assert "IS the producer agent" in str(exc), str(exc)
    else:
        raise AssertionError("factory self-countersign must fail §5 (distinct agent)")
