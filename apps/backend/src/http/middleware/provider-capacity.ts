import type { Response } from "express";

import type {
  MeteredRequest,
  SpendCapacityGate,
} from "../../security/spend-cap.js";
import { UseCaseError } from "../../use-cases/use-case-error.js";

export type ProviderCapacityGuard = Readonly<{
  run: <Result>(
    response: Response,
    operation: () => Promise<Result>,
  ) => Promise<Result>;
}>;

export function createProviderCapacityGuard(input: {
  capacityGate: SpendCapacityGate;
  label: string;
  route: MeteredRequest;
}): ProviderCapacityGuard {
  async function run<Result>(
    response: Response,
    operation: () => Promise<Result>,
  ): Promise<Result> {
    const lease = input.capacityGate.acquire(input.route);
    if (lease === null) {
      throw new UseCaseError(
        "CAPACITY_REACHED",
        `${input.label} is temporarily at capacity. Try again later.`,
        { retryable: true },
      );
    }

    let released = false;
    const release = () => {
      if (released) {
        return;
      }
      released = true;
      response.off("finish", release);
      response.off("close", release);
      lease.release();
    };
    response.once("finish", release);
    response.once("close", release);
    try {
      return await operation();
    } catch (error: unknown) {
      release();
      throw error;
    }
  }

  return Object.freeze({ run });
}
