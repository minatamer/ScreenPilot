export type RequestBodyCapacityLease = Readonly<{
  release: () => void;
}>;

function positiveInteger(value: number, name: string): number {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new TypeError(`${name} must be a positive safe integer.`);
  }
  return value;
}

export function createRequestBodyCapacityGate(input: { maximum: number }) {
  const maximum = positiveInteger(input.maximum, "maximum");
  let activeLeases = 0;

  function acquire(): RequestBodyCapacityLease | null {
    if (activeLeases >= maximum) {
      return null;
    }
    activeLeases += 1;
    let released = false;
    return Object.freeze({
      release: () => {
        if (released) {
          return;
        }
        released = true;
        activeLeases -= 1;
      },
    });
  }

  return Object.freeze({ acquire });
}

export type RequestBodyCapacityGate = ReturnType<
  typeof createRequestBodyCapacityGate
>;
