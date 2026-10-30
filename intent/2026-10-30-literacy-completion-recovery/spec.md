# Specification

- If completing an initial lesson or review fails or returns an incomplete outcome, keep the last feedback screen and show an accessible message that the completion may already have been recorded.
- Do not claim failure means no write occurred, do not automatically retry, and do not grant mastery. Retrying is explicit and may have side effects after an uncertain commit; this change does not claim idempotency.
- After a known pre-write failure, an intentional retry may produce the normal result. Preserve scores, evidence and focus for the current session; respect existing busy guards.
