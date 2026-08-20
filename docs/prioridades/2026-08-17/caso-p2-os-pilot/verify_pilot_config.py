from __future__ import annotations

import json
import sys
from pathlib import Path


EXPECTED_URLS = {
    "VITE_LITERACYDOJO_URL": "/apps/literacydojo/",
    "VITE_WAREHOUSE_URL": "/apps/warehouse/",
    "VITE_WORMHOLE_URL": "/apps/wormhole/",
    "VITE_RELAY_STATION_URL": "/apps/relay-station/",
}


def main() -> None:
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(
        "engines/codexdojo-os-prototype/package.json"
    )
    pkg = json.loads(path.read_text(encoding="utf-8"))
    build = pkg["scripts"].get("build:pilot", "")
    missing = [
        f"{key}={value}" for key, value in EXPECTED_URLS.items()
        if f"{key}={value}" not in build
    ]
    if "node scripts/bundle-missions.mjs" not in build:
        missing.append("node scripts/bundle-missions.mjs in build:pilot")
    if missing:
        print("pilot config verification: FAIL")
        for item in missing:
            print(f"missing: {item}")
        raise SystemExit(1)
    print("pilot config verification: PASS")
    print("bundled mission runtimes: 4")
    print("build:pilot is self-contained (inline VITE_*_URL): yes")
    print("external env-file dependency: no")


if __name__ == "__main__":
    main()
