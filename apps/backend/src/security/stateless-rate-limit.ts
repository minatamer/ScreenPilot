import { createHmac, randomBytes } from "node:crypto";

export const RATE_LIMITED_ROUTES = [
  "demo_bootstrap",
  "interview_prepare",
  "cv_analyze",
  "voice_token",
  "interview_summary",
] as const;

export type RateLimitedRoute = (typeof RATE_LIMITED_ROUTES)[number];

export type RateLimitDecision =
  | Readonly<{ allowed: true }>
  | Readonly<{ allowed: false; retryAfterSeconds: number }>;

export type RateLimitRejectionReason =
  | "global_budget_exhausted"
  | "identity_budget_exhausted"
  | "identity_table_saturated";

export type RateLimitRejectionEvent = Readonly<{
  activeIdentityBuckets: number;
  maximumIdentityBuckets: number;
  reason: RateLimitRejectionReason;
  retryAfterSeconds: number;
  route: RateLimitedRoute;
}>;

interface RateLimitEntry {
  count: number;
  expiryIndex: number;
  expiresAtMilliseconds: number;
  generation: symbol;
}

interface ExpiryNode {
  expiresAtMilliseconds: number;
  generation: symbol;
  key: string;
}

interface GlobalRateLimitEntry {
  count: number;
  expiresAtMilliseconds: number;
}

function positiveInteger(value: number, name: string): number {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new TypeError(`${name} must be a positive safe integer.`);
  }
  return value;
}

export function createStatelessRateLimiter(input: {
  clockMilliseconds?: () => number;
  fingerprintSecret?: string | Uint8Array;
  maxEntries: number;
  onRejection?: (event: RateLimitRejectionEvent) => void;
  windowSeconds: number;
}) {
  const clockMilliseconds = input.clockMilliseconds ?? Date.now;
  const fingerprintSecret = input.fingerprintSecret ?? randomBytes(32);
  const maxEntries = positiveInteger(input.maxEntries, "maxEntries");
  const windowMilliseconds =
    positiveInteger(input.windowSeconds, "windowSeconds") * 1_000;
  const entries = new Map<string, RateLimitEntry>();
  const expiryHeap: ExpiryNode[] = [];
  const globalEntries = new Map<RateLimitedRoute, GlobalRateLimitEntry>();

  function fingerprint(scope: "session" | "source", value: string): string {
    return createHmac("sha256", fingerprintSecret)
      .update(scope)
      .update("\0")
      .update(value)
      .digest("base64url");
  }

  function earlierExpiry(left: ExpiryNode, right: ExpiryNode): boolean {
    return left.expiresAtMilliseconds < right.expiresAtMilliseconds;
  }

  function setExpiryNode(index: number, node: ExpiryNode): void {
    const entry = entries.get(node.key);
    if (entry?.generation !== node.generation) {
      throw new TypeError("Rate-limit expiry index is inconsistent.");
    }
    expiryHeap[index] = node;
    entry.expiryIndex = index;
  }

  function pushExpiry(node: ExpiryNode): void {
    expiryHeap.push(node);
    let index = expiryHeap.length - 1;
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      const parent = expiryHeap[parentIndex];
      if (parent === undefined || !earlierExpiry(node, parent)) {
        break;
      }
      setExpiryNode(index, parent);
      index = parentIndex;
    }
    setExpiryNode(index, node);
  }

  function bubbleUpExpiry(index: number): void {
    const node = expiryHeap[index];
    if (node === undefined) {
      throw new TypeError("Rate-limit expiry heap is inconsistent.");
    }
    let destinationIndex = index;
    while (destinationIndex > 0) {
      const parentIndex = Math.floor((destinationIndex - 1) / 2);
      const parent = expiryHeap[parentIndex];
      if (parent === undefined || !earlierExpiry(node, parent)) {
        break;
      }
      setExpiryNode(destinationIndex, parent);
      destinationIndex = parentIndex;
    }
    setExpiryNode(destinationIndex, node);
  }

  function sinkExpiry(index: number): void {
    const node = expiryHeap[index];
    if (node === undefined) {
      throw new TypeError("Rate-limit expiry heap is inconsistent.");
    }
    let destinationIndex = index;
    while (destinationIndex * 2 + 1 < expiryHeap.length) {
      const leftIndex = destinationIndex * 2 + 1;
      const rightIndex = leftIndex + 1;
      const left = expiryHeap[leftIndex];
      const right = expiryHeap[rightIndex];
      if (left === undefined) {
        throw new TypeError("Rate-limit expiry heap is inconsistent.");
      }
      const childIndex =
        right !== undefined && earlierExpiry(right, left)
          ? rightIndex
          : leftIndex;
      const child = expiryHeap[childIndex];
      if (child === undefined || !earlierExpiry(child, node)) {
        break;
      }
      setExpiryNode(destinationIndex, child);
      destinationIndex = childIndex;
    }
    setExpiryNode(destinationIndex, node);
  }

  function removeExpiryAt(index: number): ExpiryNode {
    const removed = expiryHeap[index];
    const last = expiryHeap.pop();
    if (removed === undefined || last === undefined) {
      throw new TypeError("Rate-limit expiry heap is inconsistent.");
    }
    if (index >= expiryHeap.length) {
      return removed;
    }
    setExpiryNode(index, last);
    const parentIndex = Math.floor((index - 1) / 2);
    const parent = index > 0 ? expiryHeap[parentIndex] : undefined;
    if (parent !== undefined && earlierExpiry(last, parent)) {
      bubbleUpExpiry(index);
    } else {
      sinkExpiry(index);
    }
    return removed;
  }

  function removeEntry(key: string): void {
    const entry = entries.get(key);
    if (entry === undefined) {
      return;
    }
    const expiry = expiryHeap[entry.expiryIndex];
    if (
      expiry?.key !== key ||
      expiry.generation !== entry.generation ||
      expiry.expiresAtMilliseconds !== entry.expiresAtMilliseconds
    ) {
      throw new TypeError("Rate-limit expiry index is inconsistent.");
    }
    removeExpiryAt(entry.expiryIndex);
    entries.delete(key);
  }

  function removeExpiredEntries(now: number): void {
    let nextExpiry = expiryHeap[0];
    while (
      nextExpiry !== undefined &&
      nextExpiry.expiresAtMilliseconds <= now
    ) {
      removeEntry(nextExpiry.key);
      nextExpiry = expiryHeap[0];
    }
  }

  function rejected(
    route: RateLimitedRoute,
    reason: RateLimitRejectionReason,
    retryAfterMilliseconds: number,
  ): RateLimitDecision {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil(retryAfterMilliseconds / 1_000),
    );
    input.onRejection?.({
      activeIdentityBuckets: entries.size,
      maximumIdentityBuckets: maxEntries,
      reason,
      retryAfterSeconds,
      route,
    });
    return { allowed: false, retryAfterSeconds };
  }

  function consume(request: {
    anonymousSessionId?: string;
    globalLimit: number;
    limit: number;
    route: RateLimitedRoute;
    source: string;
  }): RateLimitDecision {
    const globalLimit = positiveInteger(request.globalLimit, "globalLimit");
    const limit = positiveInteger(request.limit, "limit");
    const now = clockMilliseconds();
    if (!Number.isFinite(now)) {
      throw new TypeError("The rate-limit clock must return a finite value.");
    }

    removeExpiredEntries(now);

    const globalEntry = globalEntries.get(request.route);
    if (globalEntry !== undefined && globalEntry.expiresAtMilliseconds <= now) {
      globalEntries.delete(request.route);
    }
    const activeGlobalEntry = globalEntries.get(request.route);
    if (
      activeGlobalEntry !== undefined &&
      activeGlobalEntry.count >= globalLimit
    ) {
      return rejected(
        request.route,
        "global_budget_exhausted",
        activeGlobalEntry.expiresAtMilliseconds - now,
      );
    }

    const keys = [
      `${request.route}:source:${fingerprint("source", request.source)}`,
      ...(request.anonymousSessionId === undefined
        ? []
        : [
            `${request.route}:session:${fingerprint(
              "session",
              request.anonymousSessionId,
            )}`,
          ]),
    ];
    let retryAfterMilliseconds = 0;
    for (const key of keys) {
      const entry = entries.get(key);
      if (entry !== undefined && entry.count >= limit) {
        retryAfterMilliseconds = Math.max(
          retryAfterMilliseconds,
          entry.expiresAtMilliseconds - now,
        );
      }
    }
    if (retryAfterMilliseconds > 0) {
      return rejected(
        request.route,
        "identity_budget_exhausted",
        retryAfterMilliseconds,
      );
    }

    const missingEntryCount = keys.filter((key) => !entries.has(key)).length;
    if (entries.size + missingEntryCount > maxEntries) {
      const nextExpiry = expiryHeap[0];
      return rejected(
        request.route,
        "identity_table_saturated",
        nextExpiry === undefined
          ? windowMilliseconds
          : nextExpiry.expiresAtMilliseconds - now,
      );
    }

    if (activeGlobalEntry === undefined) {
      globalEntries.set(request.route, {
        count: 1,
        expiresAtMilliseconds: now + windowMilliseconds,
      });
    } else {
      activeGlobalEntry.count += 1;
    }

    for (const key of keys) {
      const entry = entries.get(key);
      if (entry === undefined) {
        const newEntry: RateLimitEntry = {
          count: 1,
          expiryIndex: expiryHeap.length,
          expiresAtMilliseconds: now + windowMilliseconds,
          generation: Symbol("rate-limit-entry"),
        };
        entries.set(key, newEntry);
        pushExpiry({
          expiresAtMilliseconds: newEntry.expiresAtMilliseconds,
          generation: newEntry.generation,
          key,
        });
      } else {
        entry.count += 1;
      }
    }
    return { allowed: true };
  }

  return Object.freeze({ consume });
}

export type StatelessRateLimiter = ReturnType<
  typeof createStatelessRateLimiter
>;
