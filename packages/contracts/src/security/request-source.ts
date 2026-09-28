export const SCREENPILOT_CLIENT_SOURCE_HEADER =
  "x-screenpilot-client-source" as const;
export const UNRESOLVED_REQUEST_SOURCE = "unresolved" as const;

function normalizeIpv4Address(value: string): string | null {
  const octets = value.split(".");
  if (octets.length !== 4) {
    return null;
  }

  const normalized: string[] = [];
  for (const octet of octets) {
    if (!/^(?:0|[1-9]\d{0,2})$/u.test(octet)) {
      return null;
    }
    const numericOctet = Number(octet);
    if (numericOctet > 255) {
      return null;
    }
    normalized.push(String(numericOctet));
  }
  return normalized.join(".");
}

function normalizeIpv6Address(value: string): string | null {
  if (
    !value.includes(":") ||
    value.includes("%") ||
    value.includes("[") ||
    value.includes("]") ||
    /\s/u.test(value)
  ) {
    return null;
  }

  try {
    const hostname = new URL(`http://[${value}]/`).hostname;
    return hostname.startsWith("[") && hostname.endsWith("]")
      ? hostname.slice(1, -1).toLowerCase()
      : null;
  } catch {
    return null;
  }
}

export function normalizeRequestSourceAddress(value: string): string | null {
  const candidate = value.trim();
  return normalizeIpv4Address(candidate) ?? normalizeIpv6Address(candidate);
}
