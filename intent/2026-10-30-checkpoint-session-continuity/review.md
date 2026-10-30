# Independent review

A reviewer exercised local first-time cp-01 at 320×740. The Home note and Open action and the intro disclosure matched the observed exit/reopen and reload behavior: activity position and an unsubmitted answer were lost, while recorded attempts and XP remained. Opening by keyboard worked, with no horizontal overflow. Repeating an activity added a recorded attempt but did not add the same-day XP in the tested fixture. The existing heading “Continuar: Desafio…” remains potentially ambiguous alone; the adjacent explanation and Open action clarify it without altering the corridor's existing contract.

The before-fix browser test failed for the ambiguous action; after the change, exit/reopen/reload plus six existing corridor scenarios passed, as did lint/build and independent review. No persistence or scoring changed. Other tabs, actual storage failures and real screen-reader speech were not tested; the build retains its large-chunk warning.
