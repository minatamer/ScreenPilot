import { z } from "zod";

const FORBIDDEN_ROLE_LABEL_CHARACTERS = /[\p{Cc}\u202A-\u202E\u2066-\u2069]/u;

export const roleLabelSchema = z
  .string()
  .trim()
  .normalize("NFC")
  .min(1)
  .max(120)
  .refine((label) => !FORBIDDEN_ROLE_LABEL_CHARACTERS.test(label), {
    message: "Role labels cannot contain control characters or bidi overrides.",
  });

export const roleSuggestionSchema = z.strictObject({
  label: roleLabelSchema,
  cvFactIds: z.array(z.string().trim().min(1).max(64)).min(1).max(16),
});

export const rolePreferenceSchema = z.discriminatedUnion("status", [
  z.strictObject({
    label: roleLabelSchema,
    status: z.literal("candidate_stated"),
    evidenceTurnIds: z.array(z.string().trim().min(1).max(64)).min(1).max(16),
  }),
  z.strictObject({
    label: z.null(),
    status: z.literal("undecided"),
    evidenceTurnIds: z.array(z.string().trim().min(1).max(64)).min(1).max(16),
  }),
]);

export const publicRoleNeutralDemoContextSchema = z.strictObject({
  kind: z.literal("role_agnostic_first_stage_hr_screen"),
  roleAvailability: z.literal("candidate_selected_synthetic_session_vacancy"),
  employerFactsAvailable: z.literal(false),
});

export type PublicRoleNeutralDemoContext = z.infer<
  typeof publicRoleNeutralDemoContextSchema
>;
export type RolePreference = z.infer<typeof rolePreferenceSchema>;
export type RoleSuggestion = z.infer<typeof roleSuggestionSchema>;
