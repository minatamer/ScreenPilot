export type BackendConnection =
  | Readonly<{
      authMode: "google-cloud-oidc";
      audience: string;
      origin: string;
    }>
  | Readonly<{
      authMode: "local";
      origin: string;
    }>;

export class BackendConnectionConfigurationError extends Error {
  constructor() {
    super("The application service is not configured correctly.");
    this.name = "BackendConnectionConfigurationError";
  }
}

function parseOrigin(value: string | undefined): URL {
  if (value === undefined || value === "") {
    throw new BackendConnectionConfigurationError();
  }

  try {
    const origin = new URL(value);
    const hasOnlyOrigin =
      origin.pathname === "/" && origin.search === "" && origin.hash === "";
    const hasCredentials = origin.username !== "" || origin.password !== "";
    if (
      !["http:", "https:"].includes(origin.protocol) ||
      !hasOnlyOrigin ||
      hasCredentials
    ) {
      throw new BackendConnectionConfigurationError();
    }
    return origin;
  } catch (error: unknown) {
    if (error instanceof BackendConnectionConfigurationError) {
      throw error;
    }
    throw new BackendConnectionConfigurationError();
  }
}

function isLoopbackHostname(hostname: string): boolean {
  return ["127.0.0.1", "[::1]", "localhost"].includes(hostname.toLowerCase());
}

export function resolveBackendConnection(input: {
  authAudience?: string | undefined;
  authMode?: string | undefined;
  backendOrigin?: string | undefined;
}): BackendConnection {
  const backendOrigin = parseOrigin(input.backendOrigin);

  if (input.authMode === "local") {
    if (
      backendOrigin.protocol !== "http:" ||
      backendOrigin.port !== "3001" ||
      !isLoopbackHostname(backendOrigin.hostname) ||
      (input.authAudience !== undefined && input.authAudience !== "")
    ) {
      throw new BackendConnectionConfigurationError();
    }
    return Object.freeze({
      authMode: "local" as const,
      origin: backendOrigin.origin,
    });
  }

  if (input.authMode === "google-cloud-oidc") {
    const audience = parseOrigin(input.authAudience);
    if (
      backendOrigin.protocol !== "https:" ||
      !backendOrigin.hostname.endsWith(".run.app") ||
      audience.origin !== backendOrigin.origin
    ) {
      throw new BackendConnectionConfigurationError();
    }
    return Object.freeze({
      audience: audience.origin,
      authMode: "google-cloud-oidc" as const,
      origin: backendOrigin.origin,
    });
  }

  throw new BackendConnectionConfigurationError();
}
