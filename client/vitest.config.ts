import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'node',
    // *.test.tsx suites need @testing-library/react + jsdom; keep CI on self-contained TS tests
    include: ['src/**/*.test.ts'],
  },
})
