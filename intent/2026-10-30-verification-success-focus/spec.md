# Specification

- After a focused retry succeeds, focus the verification heading only when removal of the button left focus on the body and the learner did not subsequently interact or move focus.
- Preserve receipt validation and canonical progress semantics; initial automatic verification and deliberately moved focus must not cause a focus jump.
- Verify with fake receipts and local fake endpoint only. Do not claim a real verifier verdict or screen-reader speech.
