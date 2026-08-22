"""Núcleo puro: notas de release a partir de commits Conventional Commit.

Sem dependências externas. A entrada é um iterável de mappings
{"hash": str, "message": str}; a saída é Markdown determinístico.
Nenhum commit é descartado silenciosamente: o que não casa com o padrão
vai para a seção "Fora do padrão".

CLI:
    python3 release_notes.py commits.json [--version v1.4.0]
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections.abc import Iterable, Mapping

_KNOWN_TYPES = (
    "feat", "fix", "docs", "style", "refactor",
    "perf", "test", "build", "ci", "chore",
)

_SUBJECT_RE = re.compile(
    r"^(?P<type>[a-z]+)(?:\((?P<scope>[^)]+)\))?(?P<bang>!)?:\s+(?P<desc>.+)$"
)

_BREAKING_FOOTER_RE = re.compile(r"^BREAKING[ -]CHANGE:\s*(?P<desc>.+)$", re.MULTILINE)

_EMPTY_DESC_RE = re.compile(r"^[a-z]+(?:\([^)]+\))?!?:\s*$")


def parse_subject(message: str) -> dict | None:
    """Classifica a primeira linha de uma mensagem Conventional Commit.

    Devolve {"type", "scope", "breaking", "description"} ou None quando o
    subject está fora do padrão.
    """
    subject = message.splitlines()[0] if message else ""
    match = _SUBJECT_RE.match(subject)
    if not match:
        return None
    commit_type = match.group("type")
    if commit_type not in _KNOWN_TYPES:
        return None
    description = match.group("desc").strip()
    if not description:
        return None
    return {
        "type": commit_type,
        "scope": match.group("scope"),
        "breaking": bool(match.group("bang")),
        "description": description,
    }


def _short_hash(commit_hash: str) -> str:
    return commit_hash[:7]


def _format_entry(scope: str | None, description: str, commit_hash: str) -> str:
    short = _short_hash(commit_hash)
    if scope:
        return f"- **{scope}:** {description} (`{short}`)"
    return f"- {description} (`{short}`)"


def generate_release_notes(
    commits: Iterable[Mapping[str, object]], version: str | None = None
) -> str:
    """Transforma commits em Markdown de release. Falha fechado em entrada inválida."""
    breaking: list[str] = []
    features: list[str] = []
    fixes: list[str] = []
    others: list[str] = []
    untyped: list[str] = []

    for index, commit in enumerate(commits):
        commit_hash = str(commit.get("hash") or "")
        message = str(commit.get("message") or "")
        if not commit_hash or not message:
            missing = "hash" if not commit_hash else "message"
            raise ValueError(f"commit at index {index} is missing {missing!r}")

        parsed = parse_subject(message)
        if parsed is None:
            subject = message.splitlines()[0]
            if _EMPTY_DESC_RE.match(subject):
                raise ValueError(f"commit at index {index} has empty description")
            untyped.append(f"- {subject} (`{_short_hash(commit_hash)}`)")
            continue

        entry = _format_entry(parsed["scope"], parsed["description"], commit_hash)
        if parsed["type"] == "feat":
            features.append(entry)
        elif parsed["type"] == "fix":
            fixes.append(entry)
        else:
            others.append(
                _format_entry(None, f"**{parsed['type']}:** {parsed['description']}", commit_hash)
            )

        if parsed["breaking"]:
            breaking.append(entry)
        footer = _BREAKING_FOOTER_RE.search(message)
        if footer:
            breaking.append(f"- {footer.group('desc').strip()} (`{_short_hash(commit_hash)}`)")

    if not (breaking or features or fixes or others or untyped):
        raise ValueError("no commits to release")

    title = f"# Release {version}" if version else "# Release notes"
    sections = [title]
    if breaking:
        sections.append("## ⚠️ Breaking changes\n" + "\n".join(breaking))
    if features:
        sections.append("## ✨ Novidades\n" + "\n".join(features))
    if fixes:
        sections.append("## 🐛 Correções\n" + "\n".join(fixes))
    if others:
        sections.append("## 📦 Outras mudanças\n" + "\n".join(others))
    if untyped:
        sections.append("## 🔍 Fora do padrão\n" + "\n".join(untyped))
    return "\n\n".join(sections) + "\n"


def _main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Gera notas de release em Markdown.")
    parser.add_argument("commits_json", help="caminho do JSON: lista de {hash, message}")
    parser.add_argument("--version", default=None, help="rótulo da release (ex.: v1.4.0)")
    args = parser.parse_args(argv)

    try:
        with open(args.commits_json, encoding="utf-8") as handle:
            commits = json.load(handle)
    except (OSError, json.JSONDecodeError) as error:
        print(f"erro: arquivo de commits inválido: {error}", file=sys.stderr)
        return 1

    if not isinstance(commits, list):
        print("erro: arquivo de commits inválido: esperado uma lista JSON", file=sys.stderr)
        return 1

    try:
        print(generate_release_notes(commits, version=args.version), end="")
    except ValueError as error:
        print(f"erro: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(_main(sys.argv[1:]))
