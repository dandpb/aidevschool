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
## 2026-08-30 - Optimize O(N) scans in miniTown state
**Learning:** Simulation target lookups (like `pickRandomShopId`) and rendering sync loops can degrade significantly if inner helper functions like `findZoneById` use `Array.prototype.find()`. V8's array iteration is fast, but repeated O(N) scans on growing entity lists still cause unnecessary CPU overhead during ticks.
**Action:** Populate O(1) Maps during entity creation (`addZone`, `addBuilding`) to maintain synchronized quick lookups and eliminate array scans on hot paths.

## 2024-09-01 - Replace O(N log N) sorting with O(N) linear scan for closest target lookups
**Learning:** In hot loops within simulation loops (like traffic target lookups called frequently), chaining `.filter().slice().sort()` on arrays is surprisingly expensive due to array allocations and the O(N log N) sorting overhead.
**Action:** When only the single min/max element is needed from an array based on a distance metric, replace the filter+sort chain with a single O(N) linear scan. Use `<` or `<=` carefully to preserve the tie-breaking behavior of stable sorts.
## 2025-02-18 - Preserve deterministic random selection without array allocation
**Learning:** When optimizing random selection logic (e.g., removing `.filter()` for GC performance) in deterministic simulations like `miniTown`, preserve the exact number and sequence of PRNG calls (e.g., `this.rng()`) to avoid breaking test suites that rely on reproducible random states. Use multi-pass O(N) loops rather than algorithms like reservoir sampling if they alter RNG consumption.
**Action:** When converting array manipulations to loops for random selection, always count the valid elements in a first pass, roll the RNG exactly once as before, and use a second pass to find the selected element. Never change the conditions under which the RNG is called.
