# Independent review

A reviewer reproduced the prior label in local Chromium with timezone America/New_York and a frozen March 9, 2026 clock: a review dated March 8 showed “devida hoje”. After the change, the card showed “atrasada 1 dia”, the review action remained available and the stored timestamp was unchanged. Independent checks covered spring/fall transitions, leap day, year boundary, Auckland, invalid and future fallback. `setUTCFullYear` also avoids the special handling of years 0–99 by `Date.UTC`.

Before-fix unit and browser tests failed; afterward the local browser/HUD batch (4 tests), two focused unit cases, full suite (467 passed, one skipped), lint/build and independent review passed. Only display calculation changes; due selection and scheduling remain unchanged. The build retains the existing large-chunk warning.
