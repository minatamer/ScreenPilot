import {
  bootstrapResponseSchema,
  type BootstrapResponse,
} from "@screenpilot/contracts/api/bootstrap";
import type { PublicRuntimeConfig } from "@screenpilot/contracts/api/public-runtime-config";

import {
  PUBLIC_EMPLOYER_CONTEXT,
  PUBLIC_VACANCY_CATALOGUE,
} from "../demo/vacancy-catalogue.js";

export function createGetDemoBootstrap(publicRuntime: PublicRuntimeConfig) {
  const response = bootstrapResponseSchema.parse({
    ...publicRuntime,
    employer: PUBLIC_EMPLOYER_CONTEXT,
    vacancies: PUBLIC_VACANCY_CATALOGUE,
  });

  return function getDemoBootstrap(): BootstrapResponse {
    return response;
  };
}
