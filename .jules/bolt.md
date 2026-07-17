## 2026-06-26 - Prevented Unnecessary Re-renders
**Learning:** In a vanilla TS string-template application, the global state dispatcher was always triggering a root `.innerHTML = renderShell(state)` even when the state hadn't changed (e.g., clicking on the already-active view/agent).
**Action:** Implemented a state reference equality check in the main dispatcher (`if (nextState !== state)`) and updated the global state reducer to return the original state object unmodified if the target state fields haven't actually changed.

## 2026-06-26 - Sliding Window optimization for maxAdmitsInWindow
**Learning:** Found an O(n²) bottleneck in maxAdmitsInWindow during token bucket validation. The sliding window needed to account for `undefined` elements since `times` array can have gaps. Counting the window size required maintaining a running sum `currentWindowCount` rather than just subtracting indices since indices include undefined elements.
**Action:** When converting O(n²) to O(n) using a sliding window, always verify if the data structure contains gaps (like undefined elements in an array). If it does, use a running accumulator variable instead of relying purely on index math (`endIdx - startIdx + 1`).

## 2026-07-03 - Optimize Three.js allocations
**Learning:** In Three.js, instantiating new Materials and Geometries for every object is a massive anti-pattern that bloats memory and kills frame rate, as they cause excessive shader compilations and heap allocations.
**Action:** Share `PlaneGeometry` and `MeshBasicMaterial` across static tiles (via dictionary) and use `.userData` to differentiate shared vs unique materials for proper cleanup in `.dispose()`.
## 2026-07-07 - Prevented Unnecessary Re-renders in Linux Lab
**Learning:** Found that `selectLinuxApp` and `setLinuxAppCategoryFilter` actions in `reduceState` were returning new state objects even when the app/filter selected were already active, bypassing the reference equality check in `app.ts` (`nextState !== state`) and triggering full DOM re-renders unnecessarily.
**Action:** Added early returns that check if the target values and view match the current state in the reducer. When modifying reducers that rely on reference equality checks, always ensure actions that don't change state return the exact original state reference.

## 2026-07-06 - Prevent unnecessary DOM re-renders in AppState reducer
**Learning:** The codexDojo dashboard uses vanilla TypeScript string templates where `app.ts` relies on object reference equality (`state !== nextState`) to decide if `innerHTML` needs to be replaced. Returning a new object for an unchanged state forces a complete DOM wipe and rebuild.
**Action:** When adding state mutations to `reduceState`, always check if the dispatched payload differs from the current state. If it is identical, return the original `state` reference to leverage the render bail-out.

## 2026-07-28 - Pre-compute groupings for static datasets to avoid O(n) filter scans
**Learning:** In vanilla TS string-template applications like codexDojo, allocating new arrays via `.filter()` inside render functions on static datasets causes unnecessary O(n) scans and garbage collection pressure.
**Action:** Pre-compute groupings once into a `Map` to provide O(1) cache lookups, preventing unnecessary O(n) scans and garbage collection pressure.

## 2026-07-09 - Avoid O(n²) memory churn when building grouped Maps
**Learning:** Repeatedly replacing a grouped array with `[...existing, item]` during module initialization copies the accumulated group on every insertion and creates quadratic allocation pressure.
**Action:** Build each private group with `.push()`, then expose a frozen readonly snapshot so callers cannot mutate the cached result.
