## 2025-02-17 - Pre-compute Static State for Repeated Renders
**Learning:** In highly dynamic SPA architectures built on vanilla string templates (like codexDojo), operations such as `.filter()` or `.find()` inside rendering or state evaluation loops create unnecessary array allocations or O(n) scans.
**Action:** When working with static, known-at-boot configuration (like `projects` or `cycleStages`), pre-compute default fallbacks using IIFEs and replace high-frequency array manipulations with fast O(1) structures (like Counters or Maps) to alleviate main thread pressure.

## 2024-02-12 - Avoid array allocations in hot paths for counts
**Learning:** In codexDojo, calculating list lengths dynamically using `.filter(...).length` allocates unnecessary intermediate arrays, increasing GC pressure.
**Action:** Replace `.filter(...).length` with loop-based counters when a total count is needed instead of the actual array elements, and move static `.find()` resolutions to module scope to avoid repeated O(N) scans.
