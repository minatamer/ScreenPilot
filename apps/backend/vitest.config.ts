import { defineConfig } from "vitest/config";

export default defineConfig({
  envDir: false,
  test: {
    clearMocks: true,
    env: {
      PAID_DEMO_ENABLED: "false",
      PROVIDER_MODE: "fake",
    },
    environment: "node",
    fileParallelism: false,
    include: ["src/**/*.test.ts"],
    restoreMocks: true,
    setupFiles: ["./src/test/setup.ts"],
    unstubEnvs: true,
    unstubGlobals: true,
  },
});
