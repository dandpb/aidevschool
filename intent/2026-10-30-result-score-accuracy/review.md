# Independent review

A local browser replay of l02 on the same day kept the total at 55 XP and left the XP ledger unchanged, while the original result still said “XP conquistado · 100% de pontuação”. The reviewer independently confirmed the unchanged XP/ledger; their initial browser session hot-reloaded during the change, so it did not itself capture the old replay label. The before-fix automated browser test did capture that label after an unchanged-XP replay.

The first after-fix browser run exposed a test race: it read XP before completion was confirmed (30 instead of 55). The test was corrected to await both result screens; the final replay passed and compares both total XP and ledger. Twelve component tests including standalone/hosted initial/review cases, lint/build and independent review passed. The result no longer claims an XP award; scoring and XP accounting are unchanged. The build retains the large-chunk warning.
