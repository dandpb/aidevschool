# Review and verification

Independent local browser review measured the first failure feedback entirely below the viewport: approximately y=1721 at 360×740 and y=1304 at 1280×800. The initial feedback panel is now focused and brought into view, unless the learner interacted or scrolled while the write was pending; entry, retry and advancement continue to focus the activity heading. Browser tests cover mobile/desktop panel and summary geometry, Tab to the next control, deliberate focus/empty-space clicks, wheel and PageUp. Eleven focused component tests, lint and build passed; the existing bundle-size warning remains.

Independent Chromium review measured the summary visible at both sizes and verified interrupted focus and scroll. The feedback remains a polite live region while also receiving focus; a possible duplicate screen-reader announcement was not tested with actual assistive technology. These are local observations, not conversion measurements. No formal approval was granted.
