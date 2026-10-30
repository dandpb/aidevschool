# Improvement cycles

Baseline: local main 12dd8bdf, screenshots at /workspace/ux-evidence/before-local-literacy-{desktop,mobile}.png. Production URLs responded to curl but Chromium rejected the proxy certificate; no production rendering was inspected.

| Cycle | Problem and change | Verification | Result |
| --- | --- | --- | --- |
| 1 | First-time learners reached a vague CTA below the artwork on mobile. Replaced the welcome with a concise simulated-mission briefing, placed consent and start together, preserved Lumi and the Dev route, and corrected their badge overlap/contrast. | Local Chromium screenshots at 375×812 and 1280×800; CTA bottom at y=720 on 375×812, y=800 on 320×740. 11 Playwright tests passed, including onboarding focus, back, reflow and vertical slice. Literacy lint and build passed; 392 unit tests passed, 1 skipped. Independent reviewer tested keyboard, double click, reduced motion and axe WCAG 2/2.1 A/AA at 320/375/1280 (zero violations after fixes). | Complete as a local improvement and independent review; no measured conversion claim. |

Independent review initially found DOM reading order inconsistent with the mobile visual order and copy suggesting a live AI service. Both were corrected and rechecked; an existing Dev badge contrast issue was also corrected. No formal approval or production deployment is implied. Screenshots and videos are local artifacts under `/workspace/ux-evidence/`, not production evidence.
