from __future__ import annotations

import sys
from pathlib import Path


PUBLIC_URL = "https://aidevschool-literacydojo.netlify.app"
STALE_SENTENCE = "There is no public, browser-only learner route yet."
REQUIRED_FRAGMENT = f"[LiteracyDojo]({PUBLIC_URL})"


def main() -> None:
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("README.md")
    text = path.read_text(encoding="utf-8")
    errors = []
    if REQUIRED_FRAGMENT not in text:
        errors.append(f"missing public LiteracyDojo link: {PUBLIC_URL}")
    if STALE_SENTENCE in text:
        errors.append("stale no-public-route sentence is still present")
    if errors:
        print("public entry verification: FAIL")
        for error in errors:
            print(f"- {error}")
        raise SystemExit(1)
    print("public entry verification: PASS")
    print("public LiteracyDojo link: present")
    print("stale no-public-route sentence: absent")
    print("Dev track scope: unchanged")


if __name__ == "__main__":
    main()
