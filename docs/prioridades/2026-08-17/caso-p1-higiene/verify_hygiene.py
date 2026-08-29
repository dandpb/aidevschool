from __future__ import annotations

import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[4]
EXPECTED_IGNORED = (
    "engines/codexdojo-os-prototype/.env.production",
    "engines/codexdojo-os-prototype/.env.production.local",
    "kimi-debug-session_-20260817-104125.zip",
    "engines/codexdojo-os-prototype/test-results-pilot/",
)


def git(*args: str) -> str:
    result = subprocess.run(
        ["git", *args],
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
    )
    return result.stdout


def main() -> None:
    missing = []
    for path in EXPECTED_IGNORED:
        result = subprocess.run(
            ["git", "check-ignore", "--no-index", "--quiet", "--", path],
            cwd=ROOT,
        )
        if result.returncode != 0:
            missing.append(path)

    tracked_candidates = [
        line
        for line in git("ls-files").splitlines()
        if ".env.production" in line or line.startswith("kimi-debug-session_")
    ]

    if missing or tracked_candidates:
        if missing:
            print("missing ignored paths:")
            for path in missing:
                print(f"- {path}")
        if tracked_candidates:
            print("tracked sensitive candidates:")
            for path in tracked_candidates:
                print(f"- {path}")
        raise SystemExit(1)

    print("hygiene verification: PASS")
    print(f"ignored paths: {len(EXPECTED_IGNORED)}")
    print(f"tracked sensitive candidates: {len(tracked_candidates)}")
    print("values inspected: no")


if __name__ == "__main__":
    main()
