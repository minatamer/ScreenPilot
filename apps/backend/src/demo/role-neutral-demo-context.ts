import { publicRoleNeutralDemoContextSchema } from "@screenpilot/contracts/interview/demo-context";

export const PUBLIC_ROLE_NEUTRAL_DEMO_CONTEXT =
  publicRoleNeutralDemoContextSchema.parse({
    kind: "role_agnostic_first_stage_hr_screen",
    roleAvailability: "candidate_selected_synthetic_session_vacancy",
    employerFactsAvailable: false,
  });
