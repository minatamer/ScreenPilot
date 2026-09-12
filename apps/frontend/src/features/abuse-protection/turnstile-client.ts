import {
  TURNSTILE_ACTIONS,
  type TurnstileAction,
} from "@screenpilot/contracts/abuse-protection/turnstile-action";

export { TURNSTILE_ACTIONS, type TurnstileAction };

export const FAKE_TURNSTILE_TOKEN = "screenpilot-fake-turnstile-pass";

export const TURNSTILE_SCRIPT_LOAD_TIMEOUT_MS = 10_000;

const TURNSTILE_SCRIPT_ID = "screenpilot-turnstile-api";
const TURNSTILE_SCRIPT_URL =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type TurnstileWidgetId = string;

export type TurnstileRenderOptions = Readonly<{
  action: TurnstileAction;
  appearance: "interaction-only";
  callback: (token: string) => void;
  "before-interactive-callback": () => void;
  "error-callback": (errorCode?: string) => void;
  execution: "execute";
  "expired-callback": () => void;
  "refresh-expired": "never";
  "refresh-timeout": "never";
  "response-field": false;
  retry: "never";
  sitekey: string;
  size: "flexible";
  theme: "dark";
  "timeout-callback": () => void;
  "unsupported-callback": () => void;
}>;

type TurnstileApi = Readonly<{
  execute: (widget: TurnstileWidgetId | HTMLElement) => void;
  remove: (widget: TurnstileWidgetId) => void;
  render: (
    container: HTMLElement,
    options: TurnstileRenderOptions,
  ) => TurnstileWidgetId;
}>;

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export type TurnstileClientErrorCode =
  "TURNSTILE_REJECTED" | "TURNSTILE_UNAVAILABLE";

export class TurnstileClientError extends Error {
  readonly code: TurnstileClientErrorCode;
  readonly retryable = true;

  constructor(
    code: TurnstileClientErrorCode,
    message: string,
    cause?: unknown,
  ) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = "TurnstileClientError";
    this.code = code;
  }
}

export type ExecuteTurnstileChallenge = (
  input: Readonly<{
    action: TurnstileAction;
    container: HTMLElement;
    onInteractionRequired: () => void;
    signal: AbortSignal;
    siteKey: string;
  }>,
) => Promise<string>;

interface PendingTurnstileLoad {
  cancel: () => void;
  promise: Promise<TurnstileApi>;
  waiters: number;
}

let pendingTurnstileLoad: PendingTurnstileLoad | undefined;

function createPendingTurnstileLoad(): PendingTurnstileLoad {
  const existingScript = document.getElementById(
    TURNSTILE_SCRIPT_ID,
  ) as HTMLScriptElement | null;
  const script = existingScript ?? document.createElement("script");
  let settled = false;
  let timeoutId: number | undefined;
  let resolveLoad: (turnstile: TurnstileApi) => void = () => undefined;
  let rejectLoad: (error: unknown) => void = () => undefined;
  const promise = new Promise<TurnstileApi>((resolve, reject) => {
    resolveLoad = resolve;
    rejectLoad = reject;
  });
  const pendingLoad: PendingTurnstileLoad = {
    cancel: () => {
      fail(
        new TurnstileClientError(
          "TURNSTILE_UNAVAILABLE",
          "The anti-abuse check was stopped before it loaded.",
        ),
      );
    },
    promise,
    waiters: 0,
  };

  function removeLoadListeners(): void {
    script.removeEventListener("load", handleLoad);
    script.removeEventListener("error", handleError);
  }
  function clearPendingLoad(removeScript: boolean): void {
    removeLoadListeners();
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
      timeoutId = undefined;
    }
    if (removeScript) {
      script.remove();
    }
    if (pendingTurnstileLoad === pendingLoad) {
      pendingTurnstileLoad = undefined;
    }
  }
  function fail(error: TurnstileClientError): void {
    if (settled) {
      return;
    }
    settled = true;
    clearPendingLoad(true);
    rejectLoad(error);
  }
  function handleLoad(): void {
    if (settled) {
      return;
    }
    if (!window.turnstile) {
      fail(
        new TurnstileClientError(
          "TURNSTILE_UNAVAILABLE",
          "The anti-abuse check did not become available. Try again.",
        ),
      );
      return;
    }
    settled = true;
    clearPendingLoad(false);
    resolveLoad(window.turnstile);
  }
  function handleError(error: Event): void {
    fail(
      new TurnstileClientError(
        "TURNSTILE_UNAVAILABLE",
        "The anti-abuse check could not load. Check the connection and try again.",
        error,
      ),
    );
  }

  pendingTurnstileLoad = pendingLoad;
  script.addEventListener("load", handleLoad, { once: true });
  script.addEventListener("error", handleError, { once: true });
  timeoutId = window.setTimeout(() => {
    fail(
      new TurnstileClientError(
        "TURNSTILE_UNAVAILABLE",
        "The anti-abuse check took too long to load. Check the connection and try again.",
      ),
    );
  }, TURNSTILE_SCRIPT_LOAD_TIMEOUT_MS);

  if (!existingScript) {
    script.async = true;
    script.defer = true;
    script.id = TURNSTILE_SCRIPT_ID;
    script.src = TURNSTILE_SCRIPT_URL;
    document.head.append(script);
  }

  return pendingLoad;
}

function loadTurnstileApi(signal: AbortSignal): Promise<TurnstileApi> {
  if (typeof window === "undefined") {
    return Promise.reject(
      new TurnstileClientError(
        "TURNSTILE_UNAVAILABLE",
        "The anti-abuse check is available only in a supported browser.",
      ),
    );
  }
  if (window.turnstile) {
    return Promise.resolve(window.turnstile);
  }
  if (signal.aborted) {
    return Promise.reject(abortError());
  }

  const pendingLoad = pendingTurnstileLoad ?? createPendingTurnstileLoad();
  pendingLoad.waiters += 1;

  return new Promise<TurnstileApi>((resolve, reject) => {
    let settled = false;
    const release = () => {
      pendingLoad.waiters = Math.max(0, pendingLoad.waiters - 1);
      if (pendingLoad.waiters === 0 && pendingTurnstileLoad === pendingLoad) {
        pendingLoad.cancel();
      }
    };
    const finish = (operation: () => void) => {
      if (settled) {
        return;
      }
      settled = true;
      signal.removeEventListener("abort", handleAbort);
      release();
      operation();
    };
    const handleAbort = () => {
      finish(() => {
        reject(abortError());
      });
    };

    signal.addEventListener("abort", handleAbort, { once: true });
    void pendingLoad.promise.then(
      (turnstile) => {
        finish(() => {
          resolve(turnstile);
        });
      },
      (error: unknown) => {
        finish(() => {
          reject(
            error instanceof Error
              ? error
              : new TurnstileClientError(
                  "TURNSTILE_UNAVAILABLE",
                  "The anti-abuse check could not load. Try again.",
                  error,
                ),
          );
        });
      },
    );
  });
}

function abortError(): DOMException {
  return new DOMException("The anti-abuse check was stopped.", "AbortError");
}

function throwIfChallengeAborted(signal: AbortSignal): void {
  if (signal.aborted) {
    throw abortError();
  }
}

export const executeManagedTurnstileChallenge: ExecuteTurnstileChallenge =
  async ({ action, container, onInteractionRequired, signal, siteKey }) => {
    throwIfChallengeAborted(signal);

    if (siteKey.trim() === "") {
      await Promise.resolve();
      throwIfChallengeAborted(signal);
      return FAKE_TURNSTILE_TOKEN;
    }

    const turnstile = await loadTurnstileApi(signal);
    throwIfChallengeAborted(signal);

    return new Promise<string>((resolve, reject) => {
      let settled = false;
      let widgetId: TurnstileWidgetId | undefined;

      const removeWidget = () => {
        if (widgetId !== undefined) {
          turnstile.remove(widgetId);
          widgetId = undefined;
        }
      };
      const finish = (operation: () => void) => {
        if (settled) {
          return;
        }
        settled = true;
        signal.removeEventListener("abort", handleAbort);
        operation();
        removeWidget();
      };
      const fail = (
        code: TurnstileClientErrorCode,
        message: string,
        cause?: unknown,
      ) => {
        finish(() => {
          reject(new TurnstileClientError(code, message, cause));
        });
      };
      const handleAbort = () => {
        finish(() => {
          reject(abortError());
        });
      };
      const challengeHasSettled = () => settled;

      signal.addEventListener("abort", handleAbort, { once: true });
      try {
        widgetId = turnstile.render(container, {
          action,
          appearance: "interaction-only",
          callback: (token) => {
            finish(() => {
              resolve(token);
            });
          },
          "before-interactive-callback": onInteractionRequired,
          "error-callback": (errorCode) => {
            fail(
              "TURNSTILE_UNAVAILABLE",
              "The anti-abuse check could not finish. Try again.",
              errorCode,
            );
          },
          execution: "execute",
          "expired-callback": () => {
            fail(
              "TURNSTILE_REJECTED",
              "The anti-abuse check expired. Try it again.",
            );
          },
          "refresh-expired": "never",
          "refresh-timeout": "never",
          "response-field": false,
          retry: "never",
          sitekey: siteKey,
          size: "flexible",
          theme: "dark",
          "timeout-callback": () => {
            fail(
              "TURNSTILE_REJECTED",
              "The anti-abuse check timed out. Try it again.",
            );
          },
          "unsupported-callback": () => {
            fail(
              "TURNSTILE_UNAVAILABLE",
              "This browser cannot run the anti-abuse check. Try a supported browser.",
            );
          },
        });
        if (challengeHasSettled()) {
          removeWidget();
          return;
        }
        turnstile.execute(widgetId);
      } catch (error) {
        fail(
          "TURNSTILE_UNAVAILABLE",
          "The anti-abuse check could not start. Try again.",
          error,
        );
      }
    });
  };
