# Independent review

In local l09 and l12 at 360×740, the reviewer confirmed that failed selected controls receive invalid state and an associated note, while unselected and correct controls do not. Errors have visible text and a red border in normal colors and dashed borders in forced colors. Keyboard edits clear stale indicators. Separate axe scans of the two failed-feedback views reported zero violations for WCAG 2/2.1 A/AA tags; actual assistive-technology speech was not tested.

Before-fix browser tests failed for both missing invalid states; the two updated lesson tests and core axe smoke passed, as did lint and build. This change covers failed attempts only. Existing threshold behavior can approve some answers with incorrect checks; it is a separate issue and this change does not mark or change those accepted answers. The build retains the large-chunk warning.
