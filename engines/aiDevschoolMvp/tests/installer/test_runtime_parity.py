"""The skill folder bundles the deterministic gate runtime as ``scripts/_core.py``,
``_engine.py`` and ``_state.py`` so an installed skill needs no repository. Those
files are copies of ``learner/gate/{core,engine,state}.py``, and install.py no
longer regenerates them — so nothing but this test stops the two from drifting.

Comparison is on the parsed AST of every top-level function, class and CONSTANT,
which ignores docstrings, comments, formatting and the import prologue (the
bundled ``_state`` imports ``_core`` where the gate version imports
``learner.gate.core``). Logic drift in either direction fails here.
"""
from __future__ import annotations

import ast
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[4]
BUNDLED = REPO_ROOT / "engines" / "aiDevschoolMvp" / "aidevschool" / "scripts"
GATE = REPO_ROOT / "learner" / "gate"
MODULES = [("_core.py", "core.py"), ("_engine.py", "engine.py"), ("_state.py", "state.py")]


def _comparable_definitions(source: Path) -> dict[str, str]:
    """Top-level definitions and constants, keyed by name, with docstrings dropped."""
    tree = ast.parse(source.read_text(encoding="utf-8"))
    for node in ast.walk(tree):
        if isinstance(node, (ast.Module, ast.ClassDef, ast.FunctionDef, ast.AsyncFunctionDef)):
            body = node.body
            if (
                body
                and isinstance(body[0], ast.Expr)
                and isinstance(body[0].value, ast.Constant)
                and isinstance(body[0].value.value, str)
            ):
                node.body = body[1:] or [ast.Pass()]

    definitions: dict[str, str] = {}
    for node in tree.body:
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            definitions[node.name] = ast.dump(node)
        elif isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name) and target.id.isupper():
                    definitions[target.id] = ast.dump(node.value)
    return definitions


@pytest.mark.parametrize("bundled_name,gate_name", MODULES)
def test_bundled_runtime_matches_learner_gate(bundled_name: str, gate_name: str) -> None:
    bundled = _comparable_definitions(BUNDLED / bundled_name)
    gate = _comparable_definitions(GATE / gate_name)

    assert sorted(bundled) == sorted(gate), (
        f"{bundled_name} and learner/gate/{gate_name} define different top-level names; "
        "re-copy the gate module into the skill folder"
    )
    drifted = [name for name in gate if bundled[name] != gate[name]]
    assert not drifted, (
        f"{bundled_name} has drifted from learner/gate/{gate_name} in: {', '.join(drifted)}"
    )
