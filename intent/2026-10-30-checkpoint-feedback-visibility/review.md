# Independent review

In local Chromium at 360×740 a reviewer confirmed the first failure retained submit focus, a failed recheck focused its visible summary (y=16–208), and an uninterrupted success focused Next. Delayed wheel, Home key, chosen Exit focus and empty-space click prevented automatic focus. A simulated post-commit error displayed the uncertainty alert and kept prior feedback and submit focus; this simulation is not proof of a real failure. In two cases the browser clamped scroll from 888 to 707 because the document shrank, so the result does not promise an invariant numeric scroll position.

Before-fix browser tests failed for both recheck focus and deliberate scroll. Ten mobile/desktop, success and recovery browser tests, lint/build and independent review passed. Actual screen-reader speech and possible repeated announcements when focusing a live region remain unverified. Build retains the existing large-chunk warning.
