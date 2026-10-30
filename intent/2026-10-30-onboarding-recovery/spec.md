# Specification

- Guard the final save synchronously against repeated activation. While pending, prevent going back and editing choices; announce progress and keep the submit control keyboard-focusable.
- On failure, preserve the current selections, enable deliberate retry and explain that earlier choices may already have been saved and can take precedence. No automatic retry or claim of cross-tab idempotence.
- Verify failure before and after a simulated commit, repeated clicks, keyboard/focus, disabled editing and navigation. Browser closure/reload and other tabs are outside the in-screen guard.
