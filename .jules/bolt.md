## 2024-02-12 - Avoid array allocations in hot paths for counts
**Learning:** In codexDojo, calculating list lengths dynamically using `.filter(...).length` allocates unnecessary intermediate arrays, increasing GC pressure.
**Action:** Replace `.filter(...).length` with loop-based counters when a total count is needed instead of the actual array elements, and move static `.find()` resolutions to module scope to avoid repeated O(N) scans.
