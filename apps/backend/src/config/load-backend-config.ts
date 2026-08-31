import type { ZodError } from "zod";

import {
  backendConfigSchema,
  backendEnvironmentSchema,
  createBackendConfigCandidate,
  type BackendConfig,
} from "./backend-config.schema.js";

export type BackendConfigIssue = Readonly<{
  field: string;
  message: string;
}>;

export class BackendConfigError extends Error {
  readonly issues: readonly BackendConfigIssue[];

  constructor(issues: readonly BackendConfigIssue[]) {
    super(
      `Invalid backend configuration: ${issues
        .map((issue) => `${issue.field}: ${issue.message}`)
        .join("; ")}`,
    );
    this.name = "BackendConfigError";
    this.issues = issues;
  }
}

const toSafeConfigIssues = (error: ZodError): readonly BackendConfigIssue[] =>
  error.issues.map((issue) => ({
    field: issue.path.join(".") || "configuration",
    message: issue.message,
  }));

export const loadBackendConfig = (
  environment: Readonly<Record<string, string | undefined>> = process.env,
): BackendConfig => {
  const parsedEnvironment = backendEnvironmentSchema.safeParse(environment);
  if (!parsedEnvironment.success) {
    throw new BackendConfigError(toSafeConfigIssues(parsedEnvironment.error));
  }

  const parsedConfig = backendConfigSchema.safeParse(
    createBackendConfigCandidate(parsedEnvironment.data),
  );
  if (!parsedConfig.success) {
    throw new BackendConfigError(toSafeConfigIssues(parsedConfig.error));
  }

  return parsedConfig.data;
};
