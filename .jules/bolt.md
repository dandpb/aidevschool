## 2025-02-17 - Pre-compute Static State for Repeated Renders
**Learning:** In highly dynamic SPA architectures built on vanilla string templates (like codexDojo), operations such as `.filter()` or `.find()` inside rendering or state evaluation loops create unnecessary array allocations or O(n) scans.
**Action:** When working with static, known-at-boot configuration (like `projects` or `cycleStages`), pre-compute default fallbacks using IIFEs and replace high-frequency array manipulations with fast O(1) structures (like Counters or Maps) to alleviate main thread pressure.
