import { z } from "zod";

import { publicRuntimeConfigSchema } from "./public-runtime-config.js";
import {
  publicEmployerContextSchema,
  publicVacancyCatalogueSchema,
} from "../interview/employer-context.js";

export const bootstrapResponseSchema = publicRuntimeConfigSchema.extend({
  employer: publicEmployerContextSchema,
  vacancies: publicVacancyCatalogueSchema,
});

export type BootstrapResponse = z.infer<typeof bootstrapResponseSchema>;
