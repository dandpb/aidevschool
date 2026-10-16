import { defineConfig } from "@playwright/test";

/**
 * Shared default Playwright configuration for every aidevschool agent/engine.
 *
 * Default evidence policy (AGENTS.md > CONVENTIONS):
 * - screenshot: "on" — every test leaves a PNG per project under
 *   `test-results/<test>-<project>/`.
 * - video: "on" — every test leaves `video.webm` in the same per-test folder.
 * - trace: "retain-on-failure" — `trace.zip` only when a test fails.
 * - outputDir: "./test-results" — relative to the engine that extends this
 *   config, so artifacts never leave the owning engine.
 *
 * Engine configs spread this base and override only engine specifics
 * (testDir, baseURL, webServer):
 *
 * ```ts
 * import { defineConfig } from "@playwright/test";
 * import base from "../../shared/playwright/base.config";
 *
 * export default defineConfig({
 *   ...base,
 *   testDir: "./playwright",
 *   use: { ...base.use, baseURL: "http://localhost:5175" },
 * });
 * ```
 *
 * Semantic verification of the captured evidence (prose screens, feedback
 * messages, visual states) goes through TypeSafe/Jev — see
 * `learner/substrate/judgments.py` for the reference integration and
 * `.agents/skills/typesafe-ai/SKILL.md` for the judgment design rules.
 */
export default defineConfig({
  timeout: 60_000,
  outputDir: "./test-results",
  use: {
    screenshot: "on",
    video: "on",
    trace: "retain-on-failure",
  },
});
