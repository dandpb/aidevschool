from __future__ import annotations

import gzip
import json
import sys
from pathlib import Path


DIST = Path("engines/codexdojo-os-prototype/dist")


def measure(dist: Path) -> dict:
    report = {}
    targets = [dist, *[p for p in sorted((dist / "apps").iterdir()) if p.is_dir()]]
    for app_dir in targets:
        name = "os-shell" if app_dir == dist else f"apps/{app_dir.name}"
        files = [
            f for f in app_dir.rglob("*") if f.is_file() and not f.name.endswith(".map")
        ]
        raw = sum(f.stat().st_size for f in files)
        gz = sum(len(gzip.compress(f.read_bytes(), compresslevel=6)) for f in files)
        biggest = sorted(files, key=lambda f: f.stat().st_size, reverse=True)[:2]
        report[name] = {
            "files": len(files),
            "raw_bytes": raw,
            "gzip_bytes": gz,
            "largest": [
                {"file": str(f.relative_to(app_dir)), "bytes": f.stat().st_size}
                for f in biggest
            ],
        }
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
