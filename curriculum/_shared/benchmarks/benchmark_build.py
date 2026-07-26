from __future__ import annotations

import json
import os
import re
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Literal, TypeAlias, assert_never

Language: TypeAlias = Literal["go", "rust", "node"]

LANGS: tuple[Language, ...] = ("go", "rust", "node")


@dataclass(frozen=True, slots=True)
class BuildResult:
    lang: Language
    built: bool
    tests_passed: bool
    test_detail: str = ""
    binary: str = ""
    start_cmd: tuple[str, ...] = ()
    cwd: Path = Path()


def _run(command: list[str], *, cwd: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(command, cwd=cwd, capture_output=True, text=True, check=False)


def _detail(result: subprocess.CompletedProcess[str], limit: int) -> str:
    return (result.stdout or result.stderr)[-limit:]


def _go_main_dir(implementation: Path) -> Path | None:
    for go_file in implementation.rglob("*.go"):
        if go_file.name.endswith("_test.go"):
            continue
        try:
            head = go_file.read_text(encoding="utf-8", errors="ignore")[:200]
        except OSError:
            continue
        if re.search(r"^package main\b", head, re.MULTILINE):
            return go_file.parent
    return None


def _build_go(implementation: Path) -> BuildResult:
    build = _run(["go", "build", "./..."], cwd=implementation)
    if build.returncode != 0:
        return BuildResult(
            lang="go",
            built=False,
            tests_passed=False,
            test_detail=_detail(build, 300),
            cwd=implementation,
        )

    binary = ""
    start_cmd: tuple[str, ...] = ()
    main_dir = _go_main_dir(implementation)
    if main_dir is not None:
        output = Path("/tmp") / f"bench-go-{os.getpid()}"
        package = (
            f"./{main_dir.relative_to(implementation)}"
            if main_dir != implementation
            else "."
        )
        _run(["go", "build", "-o", str(output), package], cwd=implementation)
        if output.exists():
            binary = str(output)
            start_cmd = (binary,)

    tests = _run(["go", "test", "./..."], cwd=implementation)
    return BuildResult(
        lang="go",
        built=True,
        tests_passed=tests.returncode == 0,
        test_detail=_detail(tests, 400),
        binary=binary,
        start_cmd=start_cmd,
        cwd=implementation,
    )


def _build_rust(implementation: Path) -> BuildResult:
    build = _run(["cargo", "build", "--release"], cwd=implementation)
    if build.returncode != 0:
        return BuildResult(
            lang="rust",
            built=False,
            tests_passed=False,
            test_detail=_detail(build, 300),
            cwd=implementation,
        )

    binary_path = next(
        (
            path
            for path in (implementation / "target" / "release").iterdir()
            if path.is_file() and os.access(path, os.X_OK) and path.suffix == ""
        ),
        None,
    )
    binary = str(binary_path) if binary_path is not None else ""
    tests = _run(["cargo", "test", "--quiet"], cwd=implementation)
    return BuildResult(
        lang="rust",
        built=True,
        tests_passed=tests.returncode == 0,
        test_detail=_detail(tests, 400),
        binary=binary,
        start_cmd=(binary,) if binary else (),
        cwd=implementation,
    )


def _node_entry(implementation: Path) -> Path | None:
    package_path = implementation / "package.json"
    try:
        package_data = json.loads(package_path.read_text())
    except (OSError, UnicodeError, json.JSONDecodeError):
        package_data = None
    if isinstance(package_data, dict):
        main = package_data.get("main")
        if isinstance(main, str) and (implementation / main).exists():
            return implementation / main

    for candidate in (
        implementation / "dist" / "main.js",
        implementation / "dist" / "src" / "main.js",
        implementation / "dist" / "index.js",
    ):
        if candidate.exists():
            return candidate
    candidates = list(implementation.glob("dist/**/main.js"))
    candidates.extend(implementation.glob("dist/**/index.js"))
    return candidates[0] if candidates else None


def _build_node(implementation: Path) -> BuildResult:
    _run(["npm", "ci", "--silent"], cwd=implementation)
    build = _run(["npm", "run", "build", "--silent"], cwd=implementation)
    tests = _run(["npm", "test", "--silent"], cwd=implementation)
    entry = _node_entry(implementation)
    return BuildResult(
        lang="node",
        built=build.returncode == 0,
        tests_passed=tests.returncode == 0,
        test_detail=_detail(tests, 400),
        start_cmd=(
            ("node", str(entry.relative_to(implementation))) if entry is not None else ()
        ),
        cwd=implementation,
    )


def build_and_test(project_dir: Path, lang: Language) -> BuildResult:
    implementation = project_dir / f"{lang}-impl"
    if not implementation.exists():
        return BuildResult(
            lang=lang,
            built=False,
            tests_passed=False,
            test_detail="impl dir missing",
            cwd=implementation,
        )

    match lang:
        case "go":
            return _build_go(implementation)
        case "rust":
            return _build_rust(implementation)
        case "node":
            return _build_node(implementation)
        case unreachable:
            assert_never(unreachable)
