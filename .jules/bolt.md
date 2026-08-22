## 2025-02-17 - Pre-compute Static State for Repeated Renders
**Learning:** In highly dynamic SPA architectures built on vanilla string templates (like codexDojo), operations such as `.filter()` or `.find()` inside rendering or state evaluation loops create unnecessary array allocations or O(n) scans.
**Action:** When working with static, known-at-boot configuration (like `projects` or `cycleStages`), pre-compute default fallbacks using IIFEs and replace high-frequency array manipulations with fast O(1) structures (like Counters or Maps) to alleviate main thread pressure.

## 2024-02-12 - Avoid array allocations in hot paths for counts
**Learning:** In codexDojo, calculating list lengths dynamically using `.filter(...).length` allocates unnecessary intermediate arrays, increasing GC pressure.
**Action:** Replace `.filter(...).length` with loop-based counters when a total count is needed instead of the actual array elements, and move static `.find()` resolutions to module scope to avoid repeated O(N) scans.

## 2025-02-13 - [Avoid GC pressure in loop structures]
**Learning:** In codexDojo, simple `array.filter().length` expressions cause unexpected garbage collection pressure due to temporary array allocations on the render/progress paths.
**Action:** Prefer simple loops with counters over functional array derivations (like `.filter(...)`) when aggregating state or computing metrics.

## 2024-05-18 - Avoid array allocations for counting in codexDojo
**Learning:** Using `.filter(...).length` inside render paths or frequently called getters causes unnecessary intermediate array allocations, increasing garbage collection pressure and potentially causing jank in vanilla JS applications like codexDojo.
**Action:** Use a simple `for` loop with a counter instead of `.filter(...).length` when counting items based on a dynamic condition, especially in code paths that run often like state derived getters or render loops.
## 2026-08-16 - escapeHtml RegExp.test Fast Path
**Learning:** In a template-string-based rendering engine, calling `String.replace()` on a high volume of safe strings causes unnecessary garbage collection and regex allocation. `RegExp.test()` is significantly faster (~2x) when avoiding the replace step for strings that don't need escaping.
**Action:** Use `RegExp.test()` to early-return safe strings before applying heavy `.replace()` operations in hot paths.
## 2026-08-22 - O(N) Array Scans in Simulation Ticks
**Learning:** In a highly interactive simulation environment like miniTown, methods called during every 'tick' (like target lookups) must be rigorously profiled. An O(N) array scan on `this.zones.find()` inside `pickRandomShopId()` and `pickRandomTrafficTarget()` multiplied by the number of vehicles/residents caused a measurable bottleneck.
**Action:** Replaced the O(N) array search with an O(1) Map lookup (`this.#zonesById.get()`) populated at zone creation time to significantly speed up the hot loop without sacrificing readability.
