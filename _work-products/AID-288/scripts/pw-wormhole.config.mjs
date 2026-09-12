import { defineConfig } from "/paperclip/tmp/aid288/wt/engines/voxelDojo/game-03-wormhole/node_modules/@playwright/test/index.mjs"

export default defineConfig({
  testDir: "/paperclip/tmp/aid288/wt/engines/voxelDojo/game-03-wormhole/playwright",
  timeout: 60_000,
  use: { baseURL: "http://localhost:6203", screenshot: "only-on-failure" },
  webServer: {
    command: "npx vite --port 6203 --strictPort",
    url: "http://localhost:6203",
    reuseExistingServer: false,
    timeout: 30_000,
    cwd: "/paperclip/tmp/aid288/wt/engines/voxelDojo/game-03-wormhole",
  },
})
