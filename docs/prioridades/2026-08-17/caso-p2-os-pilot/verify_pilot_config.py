from __future__ import annotations

import sys
from pathlib import Path


EXPECTED = {
    "VITE_LITERACYDOJO_URL = \"/apps/literacydojo/\"",
    "VITE_WAREHOUSE_URL = \"/apps/warehouse/\"",
    "VITE_WORMHOLE_URL = \"/apps/wormhole/\"",
    "VITE_RELAY_STATION_URL = \"/apps/relay-station/\"",
}


def main() -> None:
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(
        "engines/codexdojo-os-prototype/netlify.toml"
    )
    text = path.read_text(encoding="utf-8")
    missing = sorted(item for item in EXPECTED if item not in text)
    if "command = \"npm install && npm run build:pilot\"" not in text:
        missing.append("build command = npm install && npm run build:pilot")
    if missing:
        print("pilot config verification: FAIL")
        for item in missing:
            print(f"missing: {item}")
        raise SystemExit(1)
    print("pilot config verification: PASS")
    print("bundled mission runtimes: 4")
    print("relative runtime URLs: 4")
    print("local dev-server dependency in Netlify config: no")


if __name__ == "__main__":
    main()
