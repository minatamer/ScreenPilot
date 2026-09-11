import { z } from "zod";

import { publicRuntimeConfigSchema } from "./public-runtime-config.js";
import { publicRoleNeutralDemoContextSchema } from "../interview/demo-context.js";

export const bootstrapResponseSchema = publicRuntimeConfigSchema.extend({
  demoContext: publicRoleNeutralDemoContextSchema,
});

export type BootstrapResponse = z.infer<typeof bootstrapResponseSchema>;
