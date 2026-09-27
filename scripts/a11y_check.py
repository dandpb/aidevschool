#!/usr/bin/env python3
"""Static accessibility checker for tracked HTML pages (AID-2693 custom proof).

Zero-dependency (stdlib only) a11y gate designed to run as a factory
`checks.md` proof at the Provar station:

- Structure checks (violations, exit 1):
  * ``lang`` attribute present and non-empty (WCAG 3.1.1)
  * exactly one ``<h1>`` and no heading level jumps > 1 (WCAG 1.3.1 heuristic)
  * every ``<img>`` has an ``alt`` attribute (WCAG 1.1.1)
  * no duplicate ``id`` attributes (WCAG 4.1.1)
  * skip-link target exists (first in-page focus target resolves)
  * visible-text or ``aria-label`` on links/buttons (WCAG 4.1.2 heuristic)
- Contrast checks (violations when below --min-contrast):
  * token pairs declared via ``--pair fg:bg`` are resolved from the page's
    ``:root`` CSS custom properties and scored with the WCAG 2.x formula.
  * Static analysis limit: only declared token pairs are scored; runtime
    computed colors are out of scope and must be covered by engine E2E.
- Progressive-enhancement advisories (WARN, exit 0 unless --strict-warnings):
  * ``:focus-visible`` styles present when ``outline:...0/none`` is used
  * ``prefers-reduced-motion`` guard present when transitions are used

Exit codes: 0 = no violations; 1 = violations found; 2 = input error.
JSON report on stdout with ``--json`` (single sanctioned channel: stdout).
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass, field
from html.parser import HTMLParser
from pathlib import Path

VIOLATION = "violation"
WARNING = "warning"


@dataclass
class Finding:
    rule: str
    level: str  # violation | warning
    message: str
    line: int | None = None


@dataclass
class Report:
    page: str
    findings: list[Finding] = field(default_factory=list)

    @property
    def violations(self) -> list[Finding]:
        return [f for f in self.findings if f.level == VIOLATION]

    @property
    def warnings(self) -> list[Finding]:
        return [f for f in self.findings if f.level == WARNING]

    def to_json(self) -> str:
        return json.dumps(
            {
                "page": self.page,
                "summary": {
                    "violations": len(self.violations),
                    "warnings": len(self.warnings),
                },
                "findings": [f.__dict__ for f in self.findings],
            },
            indent=2,
            ensure_ascii=False,
        ) + "\n"


def _lum(hex_color: str) -> float:
    hex_color = hex_color.lstrip("#")
    if len(hex_color) == 3:
        hex_color = "".join(ch * 2 for ch in hex_color)
    r, g, b = (int(hex_color[i : i + 2], 16) / 255 for i in (0, 2, 4))

    def chan(c: float) -> float:
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

    r, g, b = chan(r), chan(g), chan(b)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast_ratio(fg: str, bg: str) -> float:
    la, lb = _lum(fg), _lum(bg)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


_HEX = re.compile(r"^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$")
_ROOT_TOKEN = re.compile(
    r"--(?P<name>[A-Za-z0-9_-]+)\s*:\s*(?P<value>#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3}))(?![0-9a-fA-F])"
)


def parse_root_tokens(css: str) -> dict[str, str]:
    root = re.search(r":root\s*\{", css)
    tokens: dict[str, str] = {}
    if not root:
        return tokens
    depth = 1
    i = root.end()
    while i < len(css) and depth:
        if css[i] == "{":
            depth += 1
        elif css[i] == "}":
            depth -= 1
        i += 1
    body = css[root.end() : i - 1]
    for m in _ROOT_TOKEN.finditer(body):
        tokens[m.group("name").lower()] = m.group("value")
    return tokens


class _StructureParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.findings: list[Finding] = []
        self.ids: dict[str, int] = {}
        self.headings: list[tuple[int, int]] = []  # (level, line)
        self.h1_count = 0
        self.lang: str | None = None
        self.skip_targets: list[str] = []
        self.link_texts: list[tuple[int, str]] = []
        self._capture_text = None  # (kind, line, buf)
        self._img_count = 0
        self._img_no_alt = 0

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        line = self.getpos()[0]
        if tag == "html":
            self.lang = (a.get("lang") or "").strip()
        elif tag in ("h1", "h2", "h3", "h4", "h5", "h6"):
            self.headings.append((int(tag[1]), line))
            if tag == "h1":
                self.h1_count += 1
        elif tag == "img":
            self._img_count += 1
            if "alt" not in a:
                self._img_no_alt += 1
                self.findings.append(
                    Finding("img-alt", VIOLATION, "<img> without alt attribute", line)
                )
        if a.get("id"):
            self.ids[a["id"]] = self.ids.get(a["id"], 0) + 1
        if tag == "a":
            cls = a.get("class") or ""
            text = ""
            if "skip-link" in cls and a.get("href", "").startswith("#"):
                self.skip_targets.append(a["href"][1:])
            self._capture_text = ("a", line, [])
        elif tag == "button":
            self._capture_text = ("button", line, [])

    def handle_endtag(self, tag):
        if tag in ("a", "button") and self._capture_text:
            kind, line, buf = self._capture_text
            self.link_texts.append((line, "".join(buf).strip()))
            self._capture_text = None

    def handle_data(self, data):
        if self._capture_text:
            self._capture_text[2].append(data)


def check_structure(html: str, report: Report) -> None:
    p = _StructureParser()
    p.feed(html)
    if not p.lang:
        report.findings.append(
            Finding("lang", VIOLATION, "<html> missing non-empty lang attribute")
        )
    if p.h1_count != 1:
        report.findings.append(
            Finding("h1-unique", VIOLATION, f"expected exactly one <h1>, found {p.h1_count}")
        )
    prev = 0
    for level, line in p.headings:
        if prev and level > prev + 1:
            report.findings.append(
                Finding(
                    "heading-order",
                    VIOLATION,
                    f"heading jump h{prev} -> h{level} (line {line})",
                    line,
                )
            )
        prev = level
    for wid, count in p.ids.items():
        if count > 1:
            report.findings.append(
                Finding("dup-id", VIOLATION, f"id '{wid}' used {count} times")
            )
    for target in p.skip_targets:
        if target and target not in p.ids:
            report.findings.append(
                Finding(
                    "skip-link-target",
                    VIOLATION,
                    f"skip-link target '#{target}' does not resolve to an id",
                )
            )
    for line, text in p.link_texts:
        if not text:
            report.findings.append(
                Finding(
                    "link-name",
                    VIOLATION,
                    f"<{ 'a' }> without discernible text or aria-label (line {line})",
                    line,
                )
            )


def check_contrast_pairs(
    html: str, pairs: list[tuple[str, str]], minimum: float, report: Report
) -> None:
    tokens = parse_root_tokens(html)
    for fg_name, bg_name in pairs:
        fg = tokens.get(fg_name.lower())
        bg = tokens.get(bg_name.lower())
        if not fg or not bg:
            report.findings.append(
                Finding(
                    "contrast-tokens",
                    VIOLATION,
                    f"pair {fg_name}:{bg_name} not resolvable in :root tokens "
                    f"(fg={'ok' if fg else 'MISSING'}, bg={'ok' if bg else 'MISSING'})",
                )
            )
            continue
        ratio = contrast_ratio(fg, bg)
        if ratio < minimum:
            report.findings.append(
                Finding(
                    "contrast",
                    VIOLATION,
                    f"token --{fg_name} ({fg}) on --{bg_name} ({bg}) = "
                    f"{ratio:.2f}:1 < {minimum:.2f}:1",
                )
            )


def check_progressive(html: str, report: Report, strict: bool) -> None:
    level = VIOLATION if strict else WARNING
    uses_transition = "transition" in html or "animation" in html
    has_reduced = "prefers-reduced-motion" in html
    if uses_transition and not has_reduced:
        report.findings.append(
            Finding(
                "reduced-motion",
                level,
                "transitions/animations used without prefers-reduced-motion guard",
            )
        )
    kills_outline = re.search(r"outline\s*:\s*(?:none|0)", html)
    has_focus_visible = ":focus-visible" in html
    if kills_outline and not has_focus_visible:
        report.findings.append(
            Finding(
                "focus-visible",
                VIOLATION,
                "outline suppressed without a :focus-visible replacement style",
            )
        )
    elif not has_focus_visible:
        report.findings.append(
            Finding(
                "focus-visible",
                level,
                "no explicit :focus-visible style (keyboard focus relies on UA default)",
            )
        )


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("page", help="HTML file to check (path relative to repo root)")
    ap.add_argument(
        "--pair",
        action="append",
        default=[],
        metavar="FG:BG",
        help="contrast token pair from :root custom properties (repeatable)",
    )
    ap.add_argument("--min-contrast", type=float, default=4.5)
    ap.add_argument(
        "--full", action="store_true", help="also run progressive-enhancement checks"
    )
    ap.add_argument(
        "--strict-warnings", action="store_true", help="promote warnings to violations"
    )
    ap.add_argument("--json", action="store_true", help="emit JSON report on stdout")
    args = ap.parse_args(argv)

    page = Path(args.page)
    if not page.is_file():
        print(f"input error: {page} not found", file=sys.stderr)
        return 2
    html = page.read_text(encoding="utf-8")
    report = Report(page=str(page))

    check_structure(html, report)
    pairs: list[tuple[str, str]] = []
    for spec in args.pair:
        fg, sep, bg = spec.partition(":")
        if not sep or not fg or not bg:
            print(f"input error: bad --pair {spec!r} (expected FG:BG)", file=sys.stderr)
            return 2
        pairs.append((fg, bg))
    if pairs:
        check_contrast_pairs(html, pairs, args.min_contrast, report)
    if args.full:
        check_progressive(html, report, args.strict_warnings)

    if args.json:
        sys.stdout.write(report.to_json())
    else:
        for f in report.findings:
            loc = f" [line {f.line}]" if f.line else ""
            print(f"{f.level.upper():9} {f.rule:16} {f.message}{loc}")
        print(
            f"summary: {len(report.violations)} violation(s), "
            f"{len(report.warnings)} warning(s) — min-contrast {args.min_contrast}"
        )

    if report.violations:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
