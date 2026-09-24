import { spawnSync } from "node:child_process";
import process from "node:process";

const pnpmCliPath = process.env["npm_execpath"];
if (!pnpmCliPath) {
  throw new Error("Run this audit through the pinned pnpm package script.");
}

const audit = spawnSync(
  process.execPath,
  [pnpmCliPath, "audit", "--prod", "--audit-level", "high"],
  {
    env: {
      ...process.env,
      PAID_DEMO_ENABLED: "false",
      PROVIDER_MODE: "fake",
    },
    stdio: "inherit",
  },
);

if (audit.error) {
  throw audit.error;
}
process.exitCode = audit.status ?? 1;
