const MAX_FRONTEND_ORIGINS = 8;

export class FrontendOriginConfigurationError extends Error {
  constructor() {
    super("The frontend origin policy is not configured correctly.");
    this.name = "FrontendOriginConfigurationError";
  }
}

export function parseFrontendAllowedOrigins(
  value: string | undefined,
): readonly string[] {
  if (value === undefined) {
    throw new FrontendOriginConfigurationError();
  }

  const candidates = value.split(",").map((origin) => origin.trim());
  if (
    candidates.length === 0 ||
    candidates.length > MAX_FRONTEND_ORIGINS ||
    candidates.includes("")
  ) {
    throw new FrontendOriginConfigurationError();
  }

  const origins = new Set<string>();
  for (const candidate of candidates) {
    try {
      const parsed = new URL(candidate);
      const hasOnlyOrigin =
        parsed.pathname === "/" && parsed.search === "" && parsed.hash === "";
      const hasCredentials = parsed.username !== "" || parsed.password !== "";
      if (
        !["http:", "https:"].includes(parsed.protocol) ||
        !hasOnlyOrigin ||
        hasCredentials ||
        parsed.origin !== candidate
      ) {
        throw new FrontendOriginConfigurationError();
      }
      origins.add(parsed.origin);
    } catch {
      throw new FrontendOriginConfigurationError();
    }
  }

  if (origins.size !== candidates.length) {
    throw new FrontendOriginConfigurationError();
  }

  return Object.freeze([...origins]);
}
