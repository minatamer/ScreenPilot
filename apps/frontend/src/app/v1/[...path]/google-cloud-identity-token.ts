const GOOGLE_IDENTITY_ENDPOINT =
  "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity";
const DEFAULT_METADATA_TIMEOUT_MS = 3_000;
const MAXIMUM_IDENTITY_TOKEN_CHARACTERS = 16_384;
const MINIMUM_TOKEN_VALIDITY_MS = 60_000;
const TOKEN_REFRESH_SKEW_MS = 300_000;

type MetadataFetch = typeof fetch;

type CachedIdentityToken = Readonly<{
  expiresAtMilliseconds: number;
  value: string;
}>;

export class GoogleCloudIdentityTokenError extends Error {
  constructor() {
    super("The private application service could not be authenticated.");
    this.name = "GoogleCloudIdentityTokenError";
  }
}

function positiveSafeInteger(value: number, name: string): number {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new TypeError(`${name} must be a positive safe integer.`);
  }
  return value;
}

function decodeJwtPayload(value: string): unknown {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  const paddingLength = (4 - (base64.length % 4)) % 4;
  return JSON.parse(atob(`${base64}${"=".repeat(paddingLength)}`)) as unknown;
}

function validateIdentityToken(
  value: string,
  audience: string,
  nowMilliseconds: number,
): CachedIdentityToken {
  if (value.length === 0 || value.length > MAXIMUM_IDENTITY_TOKEN_CHARACTERS) {
    throw new GoogleCloudIdentityTokenError();
  }
  const segments = value.split(".");
  const encodedPayload = segments[1];
  if (segments.length !== 3 || encodedPayload === undefined) {
    throw new GoogleCloudIdentityTokenError();
  }

  try {
    const claims = decodeJwtPayload(encodedPayload);
    if (typeof claims !== "object" || claims === null) {
      throw new GoogleCloudIdentityTokenError();
    }
    const tokenAudience: unknown = Reflect.get(claims, "aud");
    const tokenExpirySeconds: unknown = Reflect.get(claims, "exp");
    if (
      tokenAudience !== audience ||
      typeof tokenExpirySeconds !== "number" ||
      !Number.isSafeInteger(tokenExpirySeconds)
    ) {
      throw new GoogleCloudIdentityTokenError();
    }
    const expiresAtMilliseconds = tokenExpirySeconds * 1_000;
    if (expiresAtMilliseconds <= nowMilliseconds + MINIMUM_TOKEN_VALIDITY_MS) {
      throw new GoogleCloudIdentityTokenError();
    }
    return Object.freeze({ expiresAtMilliseconds, value });
  } catch (error: unknown) {
    if (error instanceof GoogleCloudIdentityTokenError) {
      throw error;
    }
    throw new GoogleCloudIdentityTokenError();
  }
}

export function createGoogleCloudIdentityTokenProvider(input: {
  audience: string;
  clockMilliseconds?: () => number;
  metadataFetch?: MetadataFetch;
  timeoutMilliseconds?: number;
}) {
  const audience = input.audience;
  const clockMilliseconds = input.clockMilliseconds ?? Date.now;
  const metadataFetch = input.metadataFetch ?? fetch;
  const timeoutMilliseconds = positiveSafeInteger(
    input.timeoutMilliseconds ?? DEFAULT_METADATA_TIMEOUT_MS,
    "timeoutMilliseconds",
  );
  let cachedToken: CachedIdentityToken | undefined;
  let pendingToken: Promise<string> | undefined;

  async function fetchIdentityToken(): Promise<string> {
    const abortController = new AbortController();
    const timeout = setTimeout(() => {
      abortController.abort();
    }, timeoutMilliseconds);
    try {
      const endpoint = new URL(GOOGLE_IDENTITY_ENDPOINT);
      endpoint.searchParams.set("audience", audience);
      const response = await metadataFetch(endpoint, {
        cache: "no-store",
        headers: { "metadata-flavor": "Google" },
        method: "GET",
        redirect: "error",
        signal: abortController.signal,
      });
      if (!response.ok) {
        throw new GoogleCloudIdentityTokenError();
      }
      cachedToken = validateIdentityToken(
        (await response.text()).trim(),
        audience,
        clockMilliseconds(),
      );
      return cachedToken.value;
    } catch (error: unknown) {
      if (error instanceof GoogleCloudIdentityTokenError) {
        throw error;
      }
      throw new GoogleCloudIdentityTokenError();
    } finally {
      clearTimeout(timeout);
    }
  }

  async function getToken(): Promise<string> {
    const now = clockMilliseconds();
    if (
      cachedToken !== undefined &&
      cachedToken.expiresAtMilliseconds > now + TOKEN_REFRESH_SKEW_MS
    ) {
      return cachedToken.value;
    }
    pendingToken ??= fetchIdentityToken();
    try {
      return await pendingToken;
    } finally {
      pendingToken = undefined;
    }
  }

  return Object.freeze({ getToken });
}

export type GoogleCloudIdentityTokenProvider = ReturnType<
  typeof createGoogleCloudIdentityTokenProvider
>;
