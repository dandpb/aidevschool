# Specification

- The welcome introduces the real learning loop (choose, try, receive feedback) before the primary action, without duplicating lesson content or promising a result.
- The primary action and its pilot, age, local-progress, terms and privacy notice remain together and precede decorative art in reading order; the Dev route remains accessible with its existing destination and boundary copy.
- Continuing preserves all four personalization questions, their selections, keyboard operation, step announcements and the existing map destination. Returning retains selections. No learner state or evidence semantics change.
- The welcome works at 320, 375 and 1280 pixels, honors reduced motion and has no horizontal overflow. Actual browser evidence is labelled local.

## Continued cycles

- At 320×740 the welcome start action and consent must fit on the first screen without reducing text size for consent or hiding content; retain reflow at 375 and 1280.
- Task illustrations expose a named image role in lesson and result; the same artwork is decorative inside onboarding radio labels so choices are not announced twice; remove resolved exceptions from the axe baseline without hiding new violations.
- When an unlocked first mission exists and no challenge is pending, the map offers a control that focuses that existing mission row; it does not start the lesson or change progress. Keyboard activation places focus on the identified row, and its existing start control remains the only launcher there.
