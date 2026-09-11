import { z } from "zod";

import { publicRoleNeutralDemoContextSchema } from "../interview/demo-context.ts";
import { publicRuntimeConfigSchema } from "./public-runtime-config.ts";

export const bootstrapResponseSchema = publicRuntimeConfigSchema.extend({
  demoContext: publicRoleNeutralDemoContextSchema,
});

export type BootstrapResponse = z.infer<typeof bootstrapResponseSchema>;
