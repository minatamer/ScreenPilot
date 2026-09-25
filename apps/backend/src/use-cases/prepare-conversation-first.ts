import {
  prepareInterviewResponseSchema,
  type PrepareInterviewRequest,
  type PrepareInterviewResponse,
} from "@screenpilot/contracts/api/interview-preparation";

import {
  CONVERSATION_FIRST_PLAN,
  CONVERSATION_FIRST_PLAN_VERSION,
} from "../demo/conversation-first-plan.js";
import {
  hashInterviewGrantValue,
  type InterviewGrantService,
} from "../security/interview-grant.js";
import { UseCaseError } from "./use-case-error.js";

export function createPrepareConversationFirst(input: {
  enabled: boolean;
  grantService: InterviewGrantService;
  grantTtlSeconds: number;
  idGenerator: () => string;
}) {
  const planHash = hashInterviewGrantValue(CONVERSATION_FIRST_PLAN);

  return function prepareConversationFirst(
    request: PrepareInterviewRequest,
    anonymousSessionId: string,
  ): PrepareInterviewResponse {
    if (!input.enabled) {
      throw new UseCaseError(
        "CAPACITY_REACHED",
        "Interview preparation is currently disabled. Try again later.",
        { retryable: true },
      );
    }

    try {
      const grant = input.grantService.issue({
        anonymousSessionId,
        entryMode: request.entryMode,
        grantId: input.idGenerator(),
        planHash,
        planVersion: CONVERSATION_FIRST_PLAN_VERSION,
        ttlSeconds: input.grantTtlSeconds,
      });

      return prepareInterviewResponseSchema.parse({
        expiresAt: grant.expiresAt,
        interviewGrant: grant.token,
        plan: CONVERSATION_FIRST_PLAN,
      });
    } catch (error: unknown) {
      throw new UseCaseError(
        "PREPARATION_FAILED",
        "The interview could not be prepared. Try again.",
        { cause: error, retryable: true },
      );
    }
  };
}

export type PrepareConversationFirst = ReturnType<
  typeof createPrepareConversationFirst
>;
