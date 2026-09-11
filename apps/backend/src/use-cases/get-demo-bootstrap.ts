import {
  bootstrapResponseSchema,
  type BootstrapResponse,
} from "@screenpilot/contracts/api/bootstrap";
import type { PublicRuntimeConfig } from "@screenpilot/contracts/api/public-runtime-config";

import { PUBLIC_ROLE_NEUTRAL_DEMO_CONTEXT } from "../demo/role-neutral-demo-context.js";

export function createGetDemoBootstrap(publicRuntime: PublicRuntimeConfig) {
  const response = bootstrapResponseSchema.parse({
    ...publicRuntime,
    demoContext: PUBLIC_ROLE_NEUTRAL_DEMO_CONTEXT,
  });

  return function getDemoBootstrap(): BootstrapResponse {
    return response;
  };
}
