import { afterEach, describe, expect, it, vi } from "vitest";

import {
  executeManagedTurnstileChallenge,
  FAKE_TURNSTILE_TOKEN,
  TURNSTILE_ACTIONS,
  TURNSTILE_SCRIPT_LOAD_TIMEOUT_MS,
  type TurnstileRenderOptions,
} from "./turnstile-client";

describe("managed Turnstile client", () => {
  afterEach(() => {
    delete window.turnstile;
    document.getElementById("screenpilot-turnstile-api")?.remove();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("uses the deterministic no-network token when fake bootstrap has no site key", async () => {
    const container = document.createElement("div");
    const onInteractionRequired = vi.fn();

    await expect(
      executeManagedTurnstileChallenge({
        action: TURNSTILE_ACTIONS.cvAnalyze,
        container,
        onInteractionRequired,
        signal: new AbortController().signal,
        siteKey: "",
      }),
    ).resolves.toBe(FAKE_TURNSTILE_TOKEN);
    expect(onInteractionRequired).not.toHaveBeenCalled();
    expect(document.getElementById("screenpilot-turnstile-api")).toBeNull();
  });

  it("executes and removes one explicit interaction-only widget", async () => {
    const remove = vi.fn();
    const execute = vi.fn();
    const onInteractionRequired = vi.fn();
    const renderTurnstile = vi.fn(
      (_container: HTMLElement, options: TurnstileRenderOptions) => {
        options["before-interactive-callback"]();
        queueMicrotask(() => {
          options.callback("live-single-use-token");
        });
        return "widget-1";
      },
    );
    window.turnstile = {
      execute,
      remove,
      render: renderTurnstile,
    };

    await expect(
      executeManagedTurnstileChallenge({
        action: TURNSTILE_ACTIONS.interviewSummary,
        container: document.createElement("div"),
        onInteractionRequired,
        signal: new AbortController().signal,
        siteKey: "public-site-key",
      }),
    ).resolves.toBe("live-single-use-token");

    expect(onInteractionRequired).toHaveBeenCalledOnce();
    expect(execute).toHaveBeenCalledWith("widget-1");
    expect(remove).toHaveBeenCalledWith("widget-1");
    expect(renderTurnstile).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.objectContaining({
        action: "interview_summary",
        appearance: "interaction-only",
        execution: "execute",
        "refresh-expired": "never",
        "response-field": false,
        retry: "never",
        sitekey: "public-site-key",
        size: "flexible",
        theme: "dark",
      }),
    );
  });

  it("removes an expired widget and returns a typed retryable failure", async () => {
    const remove = vi.fn();
    const renderTurnstile = vi.fn(
      (_container: HTMLElement, options: TurnstileRenderOptions) => {
        queueMicrotask(() => {
          options["expired-callback"]();
        });
        return "widget-expired";
      },
    );
    window.turnstile = {
      execute: vi.fn(),
      remove,
      render: renderTurnstile,
    };

    await expect(
      executeManagedTurnstileChallenge({
        action: "cv_analyze",
        container: document.createElement("div"),
        onInteractionRequired: vi.fn(),
        signal: new AbortController().signal,
        siteKey: "public-site-key",
      }),
    ).rejects.toEqual(
      expect.objectContaining({
        code: "TURNSTILE_REJECTED",
        retryable: true,
      }),
    );
    expect(remove).toHaveBeenCalledWith("widget-expired");
  });

  it("bounds a stalled script load and removes its listeners, timer, and element", async () => {
    vi.useFakeTimers();
    const removeEventListener = vi.spyOn(
      HTMLScriptElement.prototype,
      "removeEventListener",
    );
    const challenge = executeManagedTurnstileChallenge({
      action: TURNSTILE_ACTIONS.voiceToken,
      container: document.createElement("div"),
      onInteractionRequired: vi.fn(),
      signal: new AbortController().signal,
      siteKey: "public-site-key",
    });
    const rejection = expect(challenge).rejects.toEqual(
      expect.objectContaining({
        code: "TURNSTILE_UNAVAILABLE",
        retryable: true,
      }),
    );

    expect(document.getElementById("screenpilot-turnstile-api")).not.toBeNull();
    await vi.advanceTimersByTimeAsync(TURNSTILE_SCRIPT_LOAD_TIMEOUT_MS);
    await rejection;

    expect(removeEventListener).toHaveBeenCalledWith(
      "load",
      expect.any(Function),
    );
    expect(removeEventListener).toHaveBeenCalledWith(
      "error",
      expect.any(Function),
    );
    expect(document.getElementById("screenpilot-turnstile-api")).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("settles an aborted script load and tears down its resources immediately", async () => {
    vi.useFakeTimers();
    const removeEventListener = vi.spyOn(
      HTMLScriptElement.prototype,
      "removeEventListener",
    );
    const controller = new AbortController();
    const challenge = executeManagedTurnstileChallenge({
      action: TURNSTILE_ACTIONS.cvAnalyze,
      container: document.createElement("div"),
      onInteractionRequired: vi.fn(),
      signal: controller.signal,
      siteKey: "public-site-key",
    });
    const rejection = expect(challenge).rejects.toEqual(
      expect.objectContaining({ name: "AbortError" }),
    );

    const script = document.getElementById("screenpilot-turnstile-api");
    expect(script).not.toBeNull();
    controller.abort();
    await rejection;

    expect(removeEventListener).toHaveBeenCalledWith(
      "load",
      expect.any(Function),
    );
    expect(removeEventListener).toHaveBeenCalledWith(
      "error",
      expect.any(Function),
    );
    expect(document.getElementById("screenpilot-turnstile-api")).toBeNull();
    expect(vi.getTimerCount()).toBe(0);

    script?.dispatchEvent(new Event("load"));
    expect(vi.getTimerCount()).toBe(0);
  });

  it("keeps a shared script load alive while another caller is still waiting", async () => {
    vi.useFakeTimers();
    const firstController = new AbortController();
    const secondController = new AbortController();
    const firstChallenge = executeManagedTurnstileChallenge({
      action: TURNSTILE_ACTIONS.cvAnalyze,
      container: document.createElement("div"),
      onInteractionRequired: vi.fn(),
      signal: firstController.signal,
      siteKey: "public-site-key",
    });
    const firstRejection = expect(firstChallenge).rejects.toEqual(
      expect.objectContaining({ name: "AbortError" }),
    );
    const secondChallenge = executeManagedTurnstileChallenge({
      action: TURNSTILE_ACTIONS.voiceToken,
      container: document.createElement("div"),
      onInteractionRequired: vi.fn(),
      signal: secondController.signal,
      siteKey: "public-site-key",
    });
    const script = document.getElementById("screenpilot-turnstile-api");

    firstController.abort();
    await firstRejection;
    expect(script).not.toBeNull();
    expect(vi.getTimerCount()).toBe(1);

    window.turnstile = {
      execute: vi.fn(),
      remove: vi.fn(),
      render: (_container, options) => {
        queueMicrotask(() => {
          options.callback("second-live-token");
        });
        return "shared-widget";
      },
    };
    script?.dispatchEvent(new Event("load"));

    await expect(secondChallenge).resolves.toBe("second-live-token");
    expect(vi.getTimerCount()).toBe(0);
  });
});
