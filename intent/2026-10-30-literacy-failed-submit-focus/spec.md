# Specification

- On a failed attempt submission, restore focus to the re-enabled submit control only if it was focused when submitted and focus fell to the document body.
- If the learner moved focus elsewhere while the request was pending, do not steal it. Preserve existing disabled/busy behavior, error copy, and progress semantics.
- Verify with a real browser before/after failure and a controlled pending request with focus deliberately moved.
