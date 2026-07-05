## 2026-06-26 - Prevented Unnecessary Re-renders
**Learning:** In a vanilla TS string-template application, the global state dispatcher was always triggering a root `.innerHTML = renderShell(state)` even when the state hadn't changed (e.g., clicking on the already-active view/agent).
**Action:** Implemented a state reference equality check in the main dispatcher (`if (nextState !== state)`) and updated the global state reducer to return the original state object unmodified if the target state fields haven't actually changed.
