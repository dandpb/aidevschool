#!/usr/bin/env python3
"""HUD alias audit (AID-5141/W5 — design-foundations v2.0 §7.1, AID-5010).

Zero-dependency grep-audit: asserts the 10 HUD contract tokens
(`--ads-progress-*`, `--ads-streak-accent`, `--ads-mastery-*`,
`--ads-review-*`, `--ads-attention-*`) are DECLARED in the three engines'
style foundations, and that the AA-tuned values affected by B9 carry the
`@deprecated -> --ads-* (B9)` marker (2-cycle window, retune lands in W6).

This checks declaration+marker presence only (contract §7.1: "existência e
mapping"). Value correctness against the live render is proven per engine by
the hud-aliases specs via getComputedStyle (base config
engines/shared/playwright/), not by this script.

Usage:
    python3 scripts/hud_alias_audit.py            # audit, exit 0/1
    python3 scripts/hud_alias_audit.py --json     # machine-readable report

Exit codes: 0 = 10/10 tokens x 3 engines + markers present; 1 = any gap;
2 = input error.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

HUD_TOKENS = [
    "--ads-progress-text",
    "--ads-progress-muted",
    "--ads-progress-track",
    "--ads-progress-fill",
    "--ads-streak-accent",
    "--ads-mastery-text",
    "--ads-mastery-bg",
    "--ads-review-text",
    "--ads-review-bg",
    "--ads-attention-text",
    "--ads-attention-bg",
]

ENGINES = {
    "dojoToday": "engines/dojoToday/src/styles.css",
    "literacyDojo": "engines/literacyDojo/src/styles.css",
    "codexdojo-os-prototype": "engines/codexdojo-os-prototype/src/styles/foundation.css",
}

# AA-tuned declarations that must carry the B9 deprecation marker (plan
# AID-5010 §3.3/§4: W5 marks, W6 retunes, window = 2 readiness cycles).
DEPRECATED = {
    "engines/dojoToday/src/styles.css": [
        "--muted: #686378",
        "--success-deep: #166534",
    ],
    "engines/literacyDojo/src/styles.css": [
        "--muted: #657089",
        "--success-text: #14734d",
    ],
    "engines/codexdojo-os-prototype/src/styles/foundation.css": [
        "--school-muted: #657089",
    ],
}

DECL_RE = re.compile(r"^\s*(%s)\s*:" % "|".join(re.escape(t) for t in HUD_TOKENS))
# O plano AID-5010 anuncia "10 tokens", mas a tabela §7.1 do contrato (PR
# #718) enumera 11 NOMES (progress 2 + medidor 2 + streak 1 + mastery 2 +
# review 2 + attention 2). O contrato é a autoridade: auditamos os 11.
MARKER_RE = re.compile(
    r"@deprecated\s*→\s*--ads-[a-z-]+(?:/--ads-[a-z-]+)*\s*\(B9\)"
)


def audit(repo_root: Path) -> dict[str, object]:
    report: dict[str, object] = {"tokens": {}, "markers": {}, "ok": True}
    for engine, relpath in ENGINES.items():
        path = repo_root / relpath
        if not path.is_file():
            report["ok"] = False
            report["tokens"][engine] = {"error": f"missing {relpath}"}
            continue
        lines = path.read_text(encoding="utf-8").splitlines()
        declared = {
            m.group(1)
            for line in lines
            if (m := DECL_RE.match(line)) is not None
        }
        missing = [t for t in HUD_TOKENS if t not in declared]
        report["tokens"][engine] = {
            "file": relpath,
            "declared": len(declared),
            "missing": missing,
        }
        if missing:
            report["ok"] = False

        # Marker check: each deprecated declaration must sit inside a comment
        # block that also carries the @deprecated -> --ads-* (B9) marker.
        text = "\n".join(lines)
        marker_hits = len(MARKER_RE.findall(text))
        expected_markers = len(DEPRECATED[relpath])
        report["markers"][engine] = {
            "expected_declarations": expected_markers,
            "markers_found": marker_hits,
        }
        if marker_hits < expected_markers:
            report["ok"] = False
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--json", action="store_true", help="JSON report on stdout")
    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parent.parent
    report = audit(repo_root)

    if args.json:
        print(json.dumps(report, indent=2))
    else:
        for engine, entry in report["tokens"].items():
            if "error" in entry:
                print(f"FAIL {engine}: {entry['error']}")
                continue
            status = "PASS" if not entry["missing"] else "FAIL"
            suffix = f" missing={entry['missing']}" if entry["missing"] else ""
            print(f"{status} {engine}: {entry['declared']}/{len(HUD_TOKENS)} tokens em {entry['file']}{suffix}")
        for engine, entry in report["markers"].items():
            status = "PASS" if entry["markers_found"] >= entry["expected_declarations"] else "FAIL"
            print(
                f"{status} {engine}: {entry['markers_found']} marcadores @deprecated (B9) "
                f"({entry['expected_declarations']} esperados)"
            )
        print("RESULT:", "PASS" if report["ok"] else "FAIL")
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    sys.exit(main())
