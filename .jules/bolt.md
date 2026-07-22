## 2025-02-13 - [Avoid GC pressure in loop structures]
**Learning:** In codexDojo, simple `array.filter().length` expressions cause unexpected garbage collection pressure due to temporary array allocations on the render/progress paths.
**Action:** Prefer simple loops with counters over functional array derivations (like `.filter(...)`) when aggregating state or computing metrics.
