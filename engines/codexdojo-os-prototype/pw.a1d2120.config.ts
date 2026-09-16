import { defineConfig } from '@playwright/test'
import base from './playwright.config'

// AID-2120 local-only override (untracked; delete after use):
// shared fixed port 4174 is contended by parallel AID-2104 campaign runs,
// so this config mirrors the official one on port 4177.
const webServer = (base as { webServer: Array<Record<string, unknown>> }).webServer.map((s) =>
  s.name === 'codexDojo OS'
    ? {
        ...s,
        command: String(s.command).replaceAll('4174', '4177'),
        url: String(s.url).replaceAll('4174', '4177'),
      }
    : s,
)

export default defineConfig({
  ...(base as Record<string, unknown>),
  use: { ...(base as { use?: Record<string, unknown> }).use, baseURL: 'http://127.0.0.1:4177' },
  webServer,
})
