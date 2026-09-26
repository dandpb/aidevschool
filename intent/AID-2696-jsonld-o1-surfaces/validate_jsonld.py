#!/usr/bin/env python3
"""Validador determinístico (offline, stdlib) do JSON-LD das superfícies O1.

Obrigações do contrato AID-2696-jsonld-o1-surfaces:
  C1 (default): R1–R4 — 1 bloco ld+json válido por superfície, @graph
      WebSite+Organization, consistência verbatim com o meta existente,
      anti-regressão das ondas anteriores (canonical/OG/twitter).
  C3 (--strict --base <sha>): R5/R6 — fence de escopo do diff da mudança.

Exit 0 só com todas as obrigações satisfeitas.
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys

SURFACES = [
    {
        "html": "engines/literacyDojo/index.html",
        "origin": "https://aidevschool-literacydojo.netlify.app",
        "logo": "/icon-512.png",
    },
    {
        "html": "engines/codexdojo-os-prototype/index.html",
        "origin": "https://aidevschool-codexdojo-os.netlify.app",
        "logo": "/og.jpg",
    },
]

ALLOWED_PATHS = re.compile(
    r"^(?:engines/(?:literacyDojo|codexdojo-os-prototype)/index\.html"
    r"|intent/AID-2696-jsonld-o1-surfaces/.*)$"
)

LD_BLOCK = re.compile(
    r"<script\s+type=[\"']application/ld\+json[\"']\s*>\s*(.*?)\s*</script>",
    re.S,
)


def _meta(text: str, attr: str, key: str) -> str | None:
    m = re.search(
        r"<meta\b[^>]*\b" + attr + r"=[\"']" + re.escape(key) + r"[\"'][^>]*>",
        text,
        re.S,
    )
    if not m:
        return None
    c = re.search(r"\bcontent=[\"']([^\"']*)[\"']", m.group(0), re.S)
    return c.group(1) if c else None


def check_surface(surface: dict) -> list[str]:
    errors: list[str] = []
    path, origin = surface["html"], surface["origin"]
    canonical_url = origin + "/"
    try:
        text = open(path, encoding="utf-8").read()
    except OSError as exc:
        return [f"{path}: unreadable ({exc})"]

    lang = re.search(r"<html\s+lang=[\"']([^\"']+)[\"']", text)
    canonical = re.search(r"<link\s+rel=[\"']canonical[\"']\s+href=[\"']([^\"']+)[\"']", text)

    # -- anti-regressão (ondas AID-1593 / PR #352) ----------------------
    for label, value in (
        ("lang=pt-BR", lang.group(1) if lang else None),
        ("canonical", canonical.group(1) if canonical else None),
        ("og:title", _meta(text, "property", "og:title")),
        ("og:image", _meta(text, "property", "og:image")),
        ("og:url", _meta(text, "property", "og:url")),
        ("og:site_name", _meta(text, "property", "og:site_name")),
        ("twitter:card", _meta(text, "name", "twitter:card")),
        ("meta[name=description]", _meta(text, "name", "description")),
    ):
        if not value:
            errors.append(f"{path}: regression — missing {label}")

    blocks = LD_BLOCK.findall(text)
    if len(blocks) != 1:
        return errors + [f"{path}: expected exactly 1 ld+json block, found {len(blocks)}"]
    try:
        doc = json.loads(blocks[0])
    except json.JSONDecodeError as exc:
        return errors + [f"{path}: ld+json is not valid JSON ({exc})"]

    graph = doc.get("@graph")
    if doc.get("@context") != "https://schema.org" or not isinstance(graph, list):
        return errors + [f"{path}: ld+json must use @context schema.org with a @graph list"]
    nodes = {n.get("@type"): n for n in graph if isinstance(n, dict)}
    if set(nodes) != {"WebSite", "Organization"} or len(graph) != 2:
        errors.append(
            f"{path}: @graph must be exactly [WebSite, Organization], got {sorted(map(str, nodes))}"
        )
        return errors
    ws, org = nodes["WebSite"], nodes["Organization"]

    def req(err: str, *conds: tuple[bool, str]) -> None:
        for ok, why in conds:
            if not ok:
                errors.append(f"{path}: {err} — {why}")

    req(
        "R3 website/meta consistency",
        (ws.get("url") == canonical_url, f"WebSite.url {ws.get('url')!r} != canonical {canonical_url!r}"),
        (
            canonical and canonical.group(1) == canonical_url,
            "canonical link diverges from surface origin",
        ),
        (
            _meta(text, "property", "og:url") == canonical_url,
            "og:url diverges from canonical",
        ),
        (
            ws.get("description") == _meta(text, "name", "description"),
            "WebSite.description != meta[name=description] (verbatim copy required)",
        ),
        (
            ws.get("inLanguage") == "pt-BR" and lang and lang.group(1) == "pt-BR",
            "inLanguage/lang must be pt-BR",
        ),
    )
    req(
        "R3 organization/meta consistency",
        (
            org.get("name") == _meta(text, "property", "og:site_name"),
            "Organization.name != og:site_name (verbatim copy required)",
        ),
        (org.get("url") == canonical_url, f"Organization.url {org.get('url')!r} != {canonical_url!r}"),
        (
            isinstance(org.get("logo"), str) and org["logo"] == origin + surface["logo"],
            f"Organization.logo must be {origin + surface['logo']!r}",
        ),
    )
    ids = [n.get("@id") for n in graph]
    req(
        "R2 graph linkage",
        (
            all(isinstance(i, str) and i.startswith(origin + "/") for i in ids),
            f"every @id must be anchored at {origin}/ (got {ids})",
        ),
        (
            ws.get("publisher", {}).get("@id") == org.get("@id"),
            "WebSite.publisher.@id must reference the Organization @id",
        ),
    )
    return errors


def check_scope(base: str) -> list[str]:
    proc = subprocess.run(
        ["git", "diff", "--name-only", f"{base}..HEAD"],
        capture_output=True,
        text=True,
    )
    if proc.returncode != 0:
        return [f"scope fence: git diff failed ({proc.stderr.strip()})"]
    changed = [line for line in proc.stdout.splitlines() if line.strip()]
    bad = [p for p in changed if not ALLOWED_PATHS.match(p)]
    if bad:
        return [f"scope fence: paths outside allowlist: {bad}"]
    if len(changed) < 3:
        return [f"scope fence: expected >=3 changed paths (2 index.html + intent/), got {changed}"]
    return []


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--strict", action="store_true", help="adds the diff scope fence (C3)")
    parser.add_argument("--base", default=None, help="base sha for the scope fence")
    args = parser.parse_args()

    errors: list[str] = []
    for surface in SURFACES:
        errors.extend(check_surface(surface))
        if not errors:
            print(f"OK {surface['html']}: 1 ld+json block, WebSite+Organization consistent with meta")
    if args.strict:
        if not args.base:
            print("scope fence: --strict requires --base", file=sys.stderr)
            return 2
        errors.extend(check_scope(args.base))
        if not errors:
            print(f"OK scope fence: diff {args.base}..HEAD confined to the 2 index.html + intent/")
    if errors:
        for err in errors:
            print(f"FAIL {err}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
