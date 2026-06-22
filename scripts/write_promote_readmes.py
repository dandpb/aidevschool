#!/usr/bin/env python3
"""Write a PROMOTE.md per curriculum project (02..18).

Walks curriculum/<NN>_<slug>/ and writes PROMOTE.md describing how to promote
the project from scaffolded -> implemented via the 5-phase /devschool-* cycle.

Idempotent: skips projects where PROMOTE.md already exists.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
CURRICULUM = REPO_ROOT / "curriculum"
PROJECTS = range(2, 19)  # 02..18 inclusive

TEMPLATE = """# Promote {slug} from scaffolded -> implemented

## Pre-flight checklist
- [ ] Read catalog.md entry
- [ ] Read BACKLOG_STATUS.md to confirm current status
- [ ] Read docs/spec.md; verify 13 sections present

## 5-phase cycle
- [ ] Phase 1 - /devschool-spec (curator): generate docs/spec.md if missing or weak
- [ ] Phase 2 - /devschool-implement (dev-go + dev-rust + dev-node in parallel): produce go-impl/, rust-impl/, node-impl/ with >=80% test coverage each; clean lint; Docker build green
- [ ] Phase 3 - /devschool-review (reviewer): docs/code_review.md with 7 categories
- [ ] Phase 4 - /devschool-benchmark (benchmarker): docs/benchmark_results.md + benchmarks/results/ with 4 scenarios x 3 langs x N>=3
- [ ] Phase 5 - /devschool-optimize (optimizer): docs/evolution_report.md with 7 sections

## Empirical gates (must pass)
- [ ] All 3 implementations: >=80% test coverage
- [ ] All 3 implementations: clean lint
- [ ] All 3 implementations: docker build green + smoke test
- [ ] Mutation score >=60% if tooling available
- [ ] Benchmark CV% < 20% for any winner claim
- [ ] Verifier (verifier-haiku cross-model) PASS on each phase

## On promotion
1. Update curriculum/BACKLOG_STATUS.md: status = implemented
2. Update curriculum/catalog.md: Status field + coverage fields
3. Update curriculum/{nn}/docs/status.md: phase = cycle-complete
4. Append a generalization to learner/journal.md (per Mnemosyne curation contract)
5. Run python3 -m learner.substrate (regenerates derived views)
"""


def discover_projects() -> list[Path]:
    """Return curriculum project dirs matching NN_name for NN in 02..18."""
    pattern = re.compile(r"^(\d{2})_[a-z0-9_]+$")
    out: list[Path] = []
    for child in sorted(CURRICULUM.iterdir()):
        if not child.is_dir():
            continue
        match = pattern.match(child.name)
        if not match:
            continue
        nn = int(match.group(1))
        if nn in PROJECTS:
            out.append(child)
    return out


def write_promote(project_dir: Path) -> str:
    """Return 'created' | 'skipped'."""
    target = project_dir / "PROMOTE.md"
    if target.exists():
        return "skipped"
    nn = project_dir.name.split("_", 1)[0]
    slug = project_dir.name
    target.write_text(TEMPLATE.format(slug=slug, nn=nn))
    return "created"


def main() -> int:
    if not CURRICULUM.is_dir():
        print(f"curriculum/ not found at {CURRICULUM}", file=sys.stderr)
        return 1
    projects = discover_projects()
    if not projects:
        print("no projects discovered", file=sys.stderr)
        return 1
    created = 0
    skipped = 0
    for project in projects:
        result = write_promote(project)
        if result == "created":
            created += 1
        else:
            skipped += 1
        print(f"{result:>7s}  {project.name}/PROMOTE.md")
    print(f"\ncreated={created}  skipped={skipped}  total={len(projects)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
