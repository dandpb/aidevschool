## 2024-05-18 - Avoid array allocations for counting in codexDojo
**Learning:** Using `.filter(...).length` inside render paths or frequently called getters causes unnecessary intermediate array allocations, increasing garbage collection pressure and potentially causing jank in vanilla JS applications like codexDojo.
**Action:** Use a simple `for` loop with a counter instead of `.filter(...).length` when counting items based on a dynamic condition, especially in code paths that run often like state derived getters or render loops.
