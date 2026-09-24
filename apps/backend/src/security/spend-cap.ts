export const METERED_REQUESTS = [
  "cv_analyze",
  "voice_token",
  "interview_summary",
] as const;

export type MeteredRequest = (typeof METERED_REQUESTS)[number];

export type SpendCapacityLease = Readonly<{
  release: () => void;
}>;

function positiveInteger(value: number, name: string): number {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new TypeError(`${name} must be a positive safe integer.`);
  }
  return value;
}

export function createSpendCapacityGate(input: {
  globalMaximum: number;
  routeMaximums: Readonly<Record<MeteredRequest, number>>;
}) {
  const globalMaximum = positiveInteger(input.globalMaximum, "globalMaximum");
  const routeMaximums = Object.fromEntries(
    METERED_REQUESTS.map((route) => [
      route,
      positiveInteger(input.routeMaximums[route], `${route}Maximum`),
    ]),
  ) as Record<MeteredRequest, number>;
  let globalInFlight = 0;
  const routeInFlight: Record<MeteredRequest, number> = {
    cv_analyze: 0,
    interview_summary: 0,
    voice_token: 0,
  };

  function acquire(route: MeteredRequest): SpendCapacityLease | null {
    if (
      globalInFlight >= globalMaximum ||
      routeInFlight[route] >= routeMaximums[route]
    ) {
      return null;
    }
    globalInFlight += 1;
    routeInFlight[route] += 1;
    let released = false;
    return Object.freeze({
      release: () => {
        if (released) {
          return;
        }
        released = true;
        globalInFlight -= 1;
        routeInFlight[route] -= 1;
      },
    });
  }

  return Object.freeze({ acquire });
}

export type SpendCapacityGate = ReturnType<typeof createSpendCapacityGate>;
