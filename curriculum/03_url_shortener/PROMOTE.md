# Promote 03_url_shortener from scaffolded -> implemented

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
3. Update curriculum/03/docs/status.md: phase = cycle-complete
4. Append a generalization to learner/journal.md (per Mnemosyne curation contract)
5. Run python3 -m learner.substrate (regenerates derived views)
