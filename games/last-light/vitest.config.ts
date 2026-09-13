import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Full drives step several minutes of physics. Limit worker memory and allow
    // loaded development/CI machines time to run the same fixed-step assertions.
    minWorkers: 1,
    maxWorkers: 2,
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
