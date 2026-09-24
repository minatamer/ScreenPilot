import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createServer } from "node:http";

import type { Express } from "express";
import type { Logger } from "pino";

import { createApp } from "./app.js";
import { loadBackendConfig } from "./config/load-backend-config.js";
import { createBackendLogger } from "./http/middleware/request-logging.js";
import { createProviderAdapters } from "./providers/provider-adapters.js";

const GRACEFUL_SHUTDOWN_TIMEOUT_MS = 10_000;
const INCOMPLETE_REQUEST_CHECK_INTERVAL_MS = 1_000;

export function startBackendServer(input: {
  app: Express;
  httpHeadersTimeoutMs: number;
  httpRequestTimeoutMs: number;
  logger: Logger;
  port: number;
}) {
  const server = createServer(
    {
      connectionsCheckingInterval: INCOMPLETE_REQUEST_CHECK_INTERVAL_MS,
      headersTimeout: input.httpHeadersTimeoutMs,
      requestTimeout: input.httpRequestTimeoutMs,
    },
    input.app,
  );
  server.listen(input.port, () => {
    input.logger.info(
      { event: "server_listening", port: input.port },
      "backend_listening",
    );
  });
  let shuttingDown = false;

  const shutdown = (signal: "SIGINT" | "SIGTERM") => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    input.logger.info(
      { event: "server_shutdown_started", signal },
      "backend_shutting_down",
    );
    const forceCloseTimer = setTimeout(() => {
      server.closeAllConnections();
    }, GRACEFUL_SHUTDOWN_TIMEOUT_MS);
    forceCloseTimer.unref();
    server.close((error) => {
      clearTimeout(forceCloseTimer);
      if (error !== undefined) {
        process.exitCode = 1;
        input.logger.error(
          { code: "SERVER_CLOSE_FAILED", event: "server_shutdown_failed" },
          "backend_shutdown_failed",
        );
      }
    });
  };
  const shutdownOnInterrupt = () => {
    shutdown("SIGINT");
  };
  const shutdownOnTermination = () => {
    shutdown("SIGTERM");
  };

  process.once("SIGINT", shutdownOnInterrupt);
  process.once("SIGTERM", shutdownOnTermination);
  server.once("close", () => {
    process.off("SIGINT", shutdownOnInterrupt);
    process.off("SIGTERM", shutdownOnTermination);
  });

  return server;
}

function isMainModule(): boolean {
  const entryPath = process.argv[1];
  return (
    entryPath !== undefined &&
    import.meta.url === pathToFileURL(resolve(entryPath)).href
  );
}

if (isMainModule()) {
  try {
    const config = loadBackendConfig();
    const logger = createBackendLogger(config);
    const providerAdapters = createProviderAdapters(config);
    const app = createApp({ config, logger, providerAdapters });
    startBackendServer({
      app,
      httpHeadersTimeoutMs: config.limits.httpHeadersTimeoutMs,
      httpRequestTimeoutMs: config.limits.httpRequestTimeoutMs,
      logger,
      port: config.port,
    });
  } catch (error: unknown) {
    const safeMessage =
      error instanceof Error ? error.message : "Unknown startup failure.";
    process.stderr.write(
      `ScreenPilot backend failed to start: ${safeMessage}\n`,
    );
    process.exitCode = 1;
  }
}
