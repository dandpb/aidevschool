## 2026-07-03 - Optimize Three.js allocations
**Learning:** In Three.js, instantiating new Materials and Geometries for every object is a massive anti-pattern that bloats memory and kills frame rate, as they cause excessive shader compilations and heap allocations.
**Action:** Share `PlaneGeometry` and `MeshBasicMaterial` across static tiles (via dictionary) and use `.userData` to differentiate shared vs unique materials for proper cleanup in `.dispose()`.
