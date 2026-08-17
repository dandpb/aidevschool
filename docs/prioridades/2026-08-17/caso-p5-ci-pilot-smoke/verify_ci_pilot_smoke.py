from __future__ import annotations

import sys
from pathlib import Path


DEFAULT_CI = Path(".github/workflows/ci.yml")
REQUIRED = (
    "npx playwright install --with-deps chromium",
    "npm run test:smoke:pilot",
)


def main() -> None:
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_CI
    text = path.read_text(encoding="utf-8")
    missing = [item for item in REQUIRED if item not in text]
    if missing:
        print("ci pilot smoke verification: FAIL")
        for item in missing:
            print(f"missing: {item}")
        raise SystemExit(1)
    # The steps must live in the codexdojo-os job, not just anywhere in the file.
    job_start = text.index("codexdojo-os:")
    next_job = text.find("\n  # ", job_start)
    job_text = text[job_start: next_job if next_job != -1 else len(text)]
    for item in REQUIRED:
        if item not in job_text:
            print("ci pilot smoke verification: FAIL")
            print(f"missing inside codexdojo-os job: {item}")
            raise SystemExit(1)
    print("ci pilot smoke verification: PASS")
    print("playwright chromium install: present in codexdojo-os job")
    print("test:smoke:pilot: present in codexdojo-os job")


if __name__ == "__main__":
    main()
