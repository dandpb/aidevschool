# Specification

- A rejected attempt submission displays an accessible error without exposing raw exception details; if no concurrent UI action clears it, the entered answer remains available and the verify control becomes usable again.
- A subsequent successful deliberate attempt clears the error and shows normal feedback. No automatic retry is made; the message does not claim an uncertain write succeeded or failed.
- Preserve current focus, lesson state, analytics and evaluation paths; regression proof includes a state-store failure before persistence and a subsequent real retry.
