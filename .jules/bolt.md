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
## 2025-02-12 - Prevent O(n) array scans in renders by using pre-computed Maps
**Learning:** In string-template applications like codexDojo, using `Array.findIndex()` or `Array.find()` on static arrays (like cycleStages) inside render cycles and state transitions causes unnecessary O(n) lookups that can degrade UI responsiveness when invoked frequently.
**Action:** When finding elements in static arrays during rendering or state transitions, pre-compute a Map of IDs to indices or entities during module initialization. This provides O(1) cache lookups, reducing O(n) scans.

## 2026-07-26 - Test Dates in CI Runners
**Learning:** Date-related tests that compare localized boundary limits (like `T23:30:00-03:00` transitioning to `T08:00:00-03:00`) can fail unpredictably when the CI runner operates in UTC instead of the intended timezone.
**Action:** When writing tests involving dates and local calendar calculations (e.g., verifying streaks), use noon UTC timestamps (e.g., `T12:00:00Z`) instead of timezone offsets (e.g., `-03:00`) to prevent tests from failing on CI runners executing in UTC.

## 2026-07-26 - Test Dates in CI Runners
**Learning:** Date-related tests that compare localized boundary limits (like `T23:30:00-03:00` transitioning to `T08:00:00-03:00`) can fail unpredictably when the CI runner operates in UTC instead of the intended timezone.
**Action:** When writing tests involving dates and local calendar calculations (e.g., verifying streaks), use noon UTC timestamps (e.g., `T12:00:00Z`) instead of timezone offsets (e.g., `-03:00`) to prevent tests from failing on CI runners executing in UTC.

## 2026-07-26 - Run dependencies before python Bridge testing
**Learning:** Python bridge processes spawned by node tests (via `processRunner`) require `fsrs` and `pyyaml` when importing their curriculum validation components. If not installed in the workspace, python subprocesses crash and node tests fail with generic 422s.
**Action:** To run or test Python verification bridge processes (like `learner.gate.literacy_bridge`) locally in the `aidevschool` project, the required Python dependencies (such as `pyyaml` and `fsrs`) must be installed by executing `python3 -m pip install -e .` from the repository root.
