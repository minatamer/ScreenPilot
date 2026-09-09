import { once } from "node:events";

import { describe, expect, it } from "vitest";

import { createApp } from "./app.js";
import { loadBackendConfig } from "./config/load-backend-config.js";
import { createBackendLogger } from "./http/middleware/request-logging.js";
import { createProviderAdapters } from "./providers/provider-adapters.js";
import { startBackendServer } from "./server.js";

describe("backend server lifecycle", () => {
  it("closes gracefully on termination and releases its signal listeners", async () => {
    const config = loadBackendConfig({
      APP_ENV: "test",
      PAID_DEMO_ENABLED: "false",
      PROVIDER_MODE: "fake",
    });
    const logger = createBackendLogger(config);
    const app = createApp({
      config,
      logger,
      providerAdapters: createProviderAdapters(config),
    });
    const interruptListeners = process.listenerCount("SIGINT");
    const terminationListeners = process.listenerCount("SIGTERM");
    const server = startBackendServer({ app, logger, port: 0 });
    await once(server, "listening");
    const closed = once(server, "close");

    process.emit("SIGTERM");
    await closed;

    expect(server.listening).toBe(false);
    expect(process.listenerCount("SIGINT")).toBe(interruptListeners);
    expect(process.listenerCount("SIGTERM")).toBe(terminationListeners);
  });
});
