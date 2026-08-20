from __future__ import annotations

import gzip
import json
import sys
from pathlib import Path


DIST = Path("engines/codexdojo-os-prototype/dist")


def measure(dist: Path) -> dict:
    """Single pass over dist/: compute (raw, gzip) once per file, then bucket by
    path prefix. The os-shell total includes apps/ (that's the full download)."""
    files = [f for f in dist.rglob("*") if f.is_file() and not f.name.endswith(".map")]
    stats = {
        f: (f.stat().st_size, len(gzip.compress(f.read_bytes(), compresslevel=6)))
        for f in files
    }

    def bucket(pred) -> dict:
        selected = {f: s for f, s in stats.items() if pred(f)}
        biggest = sorted(selected, key=lambda f: selected[f][0], reverse=True)[:2]
        return {
            "files": len(selected),
            "raw_bytes": sum(s[0] for s in selected.values()),
            "gzip_bytes": sum(s[1] for s in selected.values()),
            "largest": [
                {"file": str(f.relative_to(dist)), "bytes": selected[f][0]}
                for f in biggest
            ],
        }

    apps_root = dist / "apps"
    report = {"os-shell": bucket(lambda f: True)}
    for app_dir in sorted(p for p in apps_root.iterdir() if p.is_dir()):
        report[f"apps/{app_dir.name}"] = bucket(
            lambda f, d=app_dir: d in f.parents
        )
    return report


def main() -> None:
    out = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(
        "docs/prioridades/2026-08-17/caso-p10-bundle-weight/baseline.json"
    )
    if not DIST.is_dir():
        print("dist/ missing — run `npm run build:pilot` first")
        raise SystemExit(1)
    report = measure(DIST)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report, indent=2), encoding="utf-8")
    for name, v in report.items():
        print(
            f"{name}: files={v['files']} "
            f"raw={v['raw_bytes']/1024:.0f}KB gzip={v['gzip_bytes']/1024:.0f}KB"
        )


if __name__ == "__main__":
    main()
