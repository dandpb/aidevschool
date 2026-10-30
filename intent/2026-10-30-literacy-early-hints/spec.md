# Specification

- Before an attempt, a successful hint request displays the actual content hint in an announced region. It must not submit an answer or alter the activity.
- After an attempt, previously requested hints remain in the feedback panel without duplication; existing hint ordering and local progress behavior remain unchanged.
- Preserve keyboard and accessible live feedback. Do not change curriculum, progress or hint-selection rules.
- Keep the exhausted hint control focused and marked unavailable. While a hint, retry or answer submission is pending, block conflicting activity operations, announce loading, and provide a recoverable error for hint/retry failures. This does not promise reconciliation after leaving the screen or idempotence after an uncertain attempt commit.
