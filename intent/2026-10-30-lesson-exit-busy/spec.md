# Specification

- The standalone lesson exit stays keyboard-focusable but is announced and visually marked unavailable while an attempt, hint, retry or completion is pending; a synchronous guard prevents activation before React rerenders.
- Once the operation settles, allow exit again, including after failures. Keep the existing busy and uncertainty feedback.
- This guard covers only the in-frame standalone exit, not browser navigation, refresh, host controls, other tabs or operations started elsewhere.
