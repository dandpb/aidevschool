from __future__ import annotations

import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[4]
CATALOG = ROOT / "curriculum" / "catalog.md"


def main() -> None:
    text = CATALOG.read_text(encoding="utf-8")
    errors = []
    # Each project block: any claim that go-impl/ or rust-impl "exists" must match disk.
    blocks = re.split(r"\n###? ", text)
    for block in blocks:
        m = re.search(r"\*\*Directory\*\* \| `([0-9a-z_]+)/`", block)
        if not m:
            continue
        project = m.group(1)
        for lang, sub in (("go", "go-impl"), ("rust", "rust-impl")):
            claims_exists = re.search(rf"{sub}/`?\s*(exists|existe)", block, re.IGNORECASE)
            on_disk = (ROOT / "curriculum" / project / sub).is_dir()
            if claims_exists and not on_disk:
                errors.append(
                    f"{project}: catalog claims {sub}/ exists but directory is absent"
                )
    if errors:
        print("catalog evidence verification: FAIL")
        for e in errors:
            print(f"- {e}")
        raise SystemExit(1)
    print("catalog evidence verification: PASS")
    print("directory-existence claims match the filesystem")


if __name__ == "__main__":
    main()
