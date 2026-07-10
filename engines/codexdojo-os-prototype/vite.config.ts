import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { engineBridgePlugin } from './bridge/plugin'

export default defineConfig({
  plugins: [react(), engineBridgePlugin()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}', 'bridge/**/*.test.ts'],
  },
})
