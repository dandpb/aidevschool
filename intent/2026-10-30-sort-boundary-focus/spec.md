# Specification

- Keep boundary controls focusable with an accessible disabled state; guard activation at the boundary and retain native disabled behavior during pending operations.
- Announce the moved item's new position through a live status; clear stale status on activity change. Do not alter evaluation or order semantics.
- Verify keyboard movement at both boundaries, repeated activation and busy state with browser/component tests and independent review.
