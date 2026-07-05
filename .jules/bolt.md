## 2026-06-26 - Prevented Unnecessary Re-renders
**Learning:** In a vanilla TS string-template application, the global state dispatcher was always triggering a root `.innerHTML = renderShell(state)` even when the state hadn't changed (e.g., clicking on the already-active view/agent).
**Action:** Implemented a state reference equality check in the main dispatcher (`if (nextState !== state)`) and updated the global state reducer to return the original state object unmodified if the target state fields haven't actually changed.

## 2026-06-26 - Sliding Window optimization for maxAdmitsInWindow
**Learning:** Found an O(n²) bottleneck in maxAdmitsInWindow during token bucket validation. The sliding window needed to account for `undefined` elements since `times` array can have gaps. Counting the window size required maintaining a running sum `currentWindowCount` rather than just subtracting indices since indices include undefined elements.
**Action:** When converting O(n²) to O(n) using a sliding window, always verify if the data structure contains gaps (like undefined elements in an array). If it does, use a running accumulator variable instead of relying purely on index math (`endIdx - startIdx + 1`).
