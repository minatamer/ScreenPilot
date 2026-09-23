export type VoiceProviderFailure = Readonly<{
  class: "owner_action" | "transient" | "unclassified";
  message: string;
  retryable: boolean;
}>;

const OWNER_ACTION_MARKERS = new Set([
  "account_deactivated",
  "billing_hard_limit_reached",
  "billing_not_active",
  "credit_balance_exhausted",
  "forbidden",
  "insufficient_credit",
  "insufficient_credits",
  "insufficient_quota",
  "invalid_api_key",
  "organization_deactivated",
  "organization_spend_limit_exceeded",
  "organization_usage_limit_exceeded",
  "payment_required",
  "project_spend_limit_exceeded",
  "quota_exceeded",
  "unauthorized",
]);

const TRANSIENT_MARKERS = new Set([
  "capacity_reached",
  "concurrency_limit_exceeded",
  "connection_lost",
  "network_error",
  "rate_limit_exceeded",
  "request_timeout",
  "service_unavailable",
  "timeout",
]);

const STRUCTURED_MARKER_KEYS = ["code", "reason", "status", "type"] as const;
const SAFE_MARKER_PATTERN = /^[a-z0-9_.-]{1,128}$/;

function structuredMarkers(value: unknown): readonly string[] {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return [];
  }
  const record = value as Record<string, unknown>;
  return STRUCTURED_MARKER_KEYS.flatMap((key) => {
    const marker = record[key];
    if (typeof marker !== "string") {
      return [];
    }
    const normalized = marker.trim().toLowerCase();
    return SAFE_MARKER_PATTERN.test(normalized) ? [normalized] : [];
  });
}

export function classifyVoiceProviderFailure(
  ...structuredDetails: readonly unknown[]
): VoiceProviderFailure {
  const markers = structuredDetails.flatMap(structuredMarkers);
  if (markers.some((marker) => OWNER_ACTION_MARKERS.has(marker))) {
    return {
      class: "owner_action",
      message:
        "The voice interview cannot start right now. The demo owner must check the voice service before another attempt.",
      retryable: false,
    };
  }
  if (markers.some((marker) => TRANSIENT_MARKERS.has(marker))) {
    return {
      class: "transient",
      message:
        "The secure voice connection was interrupted. Check the connection and try again.",
      retryable: true,
    };
  }
  return {
    class: "unclassified",
    message:
      "The secure voice connection could not start. Check the connection and try again.",
    retryable: true,
  };
}

export const VOICE_SESSION_IDENTITY_FAILURE: VoiceProviderFailure =
  Object.freeze({
    class: "owner_action",
    message:
      "The secure voice connection could not be verified. The demo owner must check the voice service before another attempt.",
    retryable: false,
  });
