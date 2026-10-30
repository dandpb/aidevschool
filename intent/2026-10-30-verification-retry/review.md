# Review and verification

A deferred fake client reproduced overlapping verification requests from same-event retry clicks. A synchronous guard now permits one in-flight request per mounted result; the retry control remains focusable and aria-disabled until the request settles, with progress and latest error/receipt shown. Six component/domain tests passed and lint passed.

Independent Chromium review used a local Vite server with every fake-verifier request intercepted locally. It confirmed three synchronous retry clicks issued one request, focus survived a delayed error and a later deliberate retry worked. A locally generated synthetic receipt was used only to exercise the UI; it is not an actual verifier verdict or competence claim. The review separately found focus falls to BODY when a successful receipt removes the retry button; that is not fixed by this cycle. External navigation/remount and real screen-reader speech remain unverified. No formal approval was granted.
