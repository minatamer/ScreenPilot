const TURNSTILE_BROWSER_ORIGIN = "https://challenges.cloudflare.com";
const ELEVENLABS_API_ORIGIN = "https://api.elevenlabs.io";
const ELEVENLABS_API_SOCKET_ORIGIN = "wss://api.elevenlabs.io";
const ELEVENLABS_LIVEKIT_ORIGIN = "https://livekit.rtc.elevenlabs.io";
const ELEVENLABS_LIVEKIT_SOCKET_ORIGIN = "wss://livekit.rtc.elevenlabs.io";

const SAFE_NONCE_PATTERN = /^[A-Za-z0-9+/_=-]{16,128}$/u;

export function createBrowserSecurityPolicy(
  nonce: string,
  development: boolean,
): string {
  if (!SAFE_NONCE_PATTERN.test(nonce)) {
    throw new TypeError("A valid request nonce is required for browser CSP.");
  }

  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    `script-src 'self' 'nonce-${nonce}' ${TURNSTILE_BROWSER_ORIGIN}${
      development ? " 'unsafe-eval'" : ""
    }`,
    "script-src-attr 'none'",
    `style-src 'self' 'nonce-${nonce}'`,
    "style-src-attr 'none'",
    "img-src 'self' data:",
    "font-src 'self'",
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    `connect-src 'self' ${TURNSTILE_BROWSER_ORIGIN} ${ELEVENLABS_API_ORIGIN} ${ELEVENLABS_API_SOCKET_ORIGIN} ${ELEVENLABS_LIVEKIT_ORIGIN} ${ELEVENLABS_LIVEKIT_SOCKET_ORIGIN}`,
    `frame-src ${TURNSTILE_BROWSER_ORIGIN}`,
    "manifest-src 'self'",
    ...(development ? [] : ["upgrade-insecure-requests"]),
  ];

  return directives.join("; ");
}
