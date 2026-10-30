# Review and verification

The hosted adapter launch test reproduced the dead in-frame exit before the change. Intro and player now show guidance toward the enclosing application's navigation, while standalone lessons retain their working exit. Recovery uses the same guidance, including boot failure; the hosted result no longer promises immediate exit. The host protocol and its completion gates are unchanged.

Independent review found that the protocol also permits hosts other than the OS, so the guidance was made generic. In real local integration of OS and LiteracyDojo, the reviewer checked intro, activity, host return to `/hub`, simulated boot failure and completion. The OS hid the iframe and showed its result; the local verifier rejected the evidence and return became available after that verdict. This is local integration evidence, not a production result or verification of every host. Seventeen focused component tests, lint and build passed; the existing large-bundle warning remains. No formal approval was granted.

The first CI run also flagged editing an existing test, which this repository's guard prohibits without owner-authorized override. Restored that file to main and moved the hosted adapter assertions into the new hosted-exit test; both suites passed 15 tests. This repair does not count as an additional improvement cycle.
