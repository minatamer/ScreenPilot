"use client";

import { useEffect, useRef, useState } from "react";

import {
  executeManagedTurnstileChallenge,
  TurnstileClientError,
  type ExecuteTurnstileChallenge,
  type TurnstileAction,
} from "./turnstile-client";

export type ManagedTurnstileFailure = Readonly<{
  code: "TURNSTILE_REJECTED" | "TURNSTILE_UNAVAILABLE";
  message: string;
  retryable: true;
}>;

type ManagedTurnstileGateProps = Readonly<{
  action: TurnstileAction;
  executeChallenge?: ExecuteTurnstileChallenge;
  onFailure: (failure: ManagedTurnstileFailure) => void;
  onVerified: (token: string) => void;
  siteKey: string;
}>;

function normalizedFailure(error: unknown): ManagedTurnstileFailure {
  if (error instanceof TurnstileClientError) {
    return {
      code: error.code,
      message: error.message,
      retryable: true,
    };
  }
  return {
    code: "TURNSTILE_UNAVAILABLE",
    message: "The anti-abuse check could not finish. Try again.",
    retryable: true,
  };
}

export function ManagedTurnstileGate({
  action,
  executeChallenge = executeManagedTurnstileChallenge,
  onFailure,
  onVerified,
  siteKey,
}: ManagedTurnstileGateProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onFailureRef = useRef(onFailure);
  const onVerifiedRef = useRef(onVerified);
  const [interactionRequired, setInteractionRequired] = useState(false);

  useEffect(() => {
    onFailureRef.current = onFailure;
    onVerifiedRef.current = onVerified;
  }, [onFailure, onVerified]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const controller = new AbortController();
    const startTimer = window.setTimeout(() => {
      void executeChallenge({
        action,
        container,
        onInteractionRequired: () => {
          if (!controller.signal.aborted) {
            setInteractionRequired(true);
          }
        },
        signal: controller.signal,
        siteKey,
      })
        .then((token) => {
          if (!controller.signal.aborted) {
            onVerifiedRef.current(token);
          }
        })
        .catch((error: unknown) => {
          if (
            !controller.signal.aborted &&
            !(error instanceof DOMException && error.name === "AbortError")
          ) {
            onFailureRef.current(normalizedFailure(error));
          }
        });
    }, 0);

    return () => {
      window.clearTimeout(startTimer);
      controller.abort();
    };
  }, [action, executeChallenge, siteKey]);

  return (
    <section
      aria-label="Anti-abuse check"
      className="sp-turnstile-gate"
      data-interaction-required={interactionRequired || undefined}
    >
      <div className="sp-turnstile-gate__copy" role="status">
        <span aria-hidden="true" className="sp-turnstile-gate__pulse" />
        <span>
          {interactionRequired
            ? "Complete the anti-abuse check to continue."
            : "Checking this request before it continues."}
        </span>
      </div>
      <div className="sp-turnstile-gate__widget" ref={containerRef} />
    </section>
  );
}
