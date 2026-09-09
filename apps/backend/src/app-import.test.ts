import { Server } from "node:http";

import { describe, expect, it, vi } from "vitest";

describe("backend module imports", () => {
  it("does not bind a port, register signal handlers, or call a provider", async () => {
    vi.resetModules();
    const listen = vi.spyOn(Server.prototype, "listen");
    const fetchCall = vi.spyOn(globalThis, "fetch");
    const interruptListeners = process.listenerCount("SIGINT");
    const terminationListeners = process.listenerCount("SIGTERM");

    await import("./app.js");
    await import("./use-cases/prepare-conversation-first.js");
    await import("./server.js");

    expect(listen).not.toHaveBeenCalled();
    expect(fetchCall).not.toHaveBeenCalled();
    expect(process.listenerCount("SIGINT")).toBe(interruptListeners);
    expect(process.listenerCount("SIGTERM")).toBe(terminationListeners);
  });
});
