# Specification

- Coordinate standalone lesson/review opening, journey switching and reset with a synchronous in-flight guard; read-only navigation among Home, Map and Progress stays possible while competing mutations are unavailable and the wait is announced.
- Publish successfully saved progress but navigate to the requested lesson or journey destination only if the learner has not since chosen another screen. Do not show stale route-specific errors or mark intro acknowledgements for an abandoned route.
- On a potentially committed failed write, reread authoritative state before enabling new mutations; if that read also fails, block new mutations and clearly offer reload. No automatic retry.
- Verify repeated clicks, navigation interruption, competing start/switch/reset/import, pre/post-commit errors and reading failure. The guarantee excludes host navigation, multiple tabs, reload/closure, other clients and pre-existing operations outside the standalone flow.
- This is not a universal same-tab write lock: onboarding completion and any operation that starts outside these screen paths are not serialized. The existing boot contract can retain the old valid state and a reset marker after a partial reset; reload only allows the learner to inspect the state and does not prove reset completion or rollback.
