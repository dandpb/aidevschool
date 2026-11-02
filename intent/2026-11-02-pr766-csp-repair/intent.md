# Repair of PR #766 CSP

PR #766 was produced by Jules (Sentinel) and proposes a Content Security Policy for dojoToday. In a Codex browser probe of head f7269e1fb2047f5d80ba85d0471e3a8d0dcd6418, inline event handlers executed and the proposed policy blocked HTTP BYOK endpoints at localhost and 127.0.0.1 on another port. The existing BYOK contract explicitly permits these loopback hosts (PR #216). This record describes only Codex's subsequent repair; it does not register a Paperclip producer, verifier, or countersign.

Outcome: retain the user's HTTPS BYOK flow and the existing loopback exception while blocking inline scripts and unauthorized origins. Independent review and the canonical producer registration and countersign remain required before merge.
