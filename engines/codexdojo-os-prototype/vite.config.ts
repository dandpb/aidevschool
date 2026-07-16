import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { engineBridgePlugin } from './bridge/plugin'

export default defineConfig(({ command, isPreview }) => ({
  plugins: [
    react(),
    ...(command === 'serve'
      && (!isPreview || process.env.VITE_LOCAL_ENGINE_BRIDGE === 'true')
      ? [engineBridgePlugin()]
      : []),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}', 'bridge/**/*.test.ts'],
  },
}))
