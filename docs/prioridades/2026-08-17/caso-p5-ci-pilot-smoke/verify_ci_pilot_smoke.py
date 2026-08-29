from __future__ import annotations

import re
import sys
from pathlib import Path


DEFAULT_CI = Path(".github/workflows/ci.yml")
REQUIRED = (
    "npx playwright install --with-deps chromium",
    "node scripts/bundle-missions.mjs",
    "playwright test --config=playwright.pilot.config.ts",
)


def main() -> None:
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_CI
    text = path.read_text(encoding="utf-8")
    job_start = text.find("codexdojo-os:")
    if job_start == -1:
        print("ci pilot smoke verification: FAIL")
        print("missing: codexdojo-os job")
        raise SystemExit(1)
    next_job = re.search(r"\n  \w[\w-]*:", text[job_start + 1 :])
    job_text = text[
        job_start : job_start + 1 + next_job.start() if next_job else len(text)
    ]
    missing = [item for item in REQUIRED if item not in job_text]
    if missing:
        print("ci pilot smoke verification: FAIL")
        for item in missing:
            print(f"missing inside codexdojo-os job: {item}")
        raise SystemExit(1)
    print("ci pilot smoke verification: PASS")
    print("playwright chromium install: present in codexdojo-os job")
    print("pilot bundle + smoke steps: present in codexdojo-os job")


if __name__ == "__main__":
    main()
