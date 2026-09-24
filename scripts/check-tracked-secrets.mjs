import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import process from "node:process";

const MAXIMUM_SCANNED_FILE_BYTES = 2_000_000;

const blankEnvironmentTemplateFields = new Set([
  "ANONYMOUS_COOKIE_SECRET",
  "ELEVENLABS_AGENT_ID",
  "ELEVENLABS_API_KEY",
  "ELEVENLABS_VOICE_ID",
  "INTERVIEW_GRANT_SIGNING_SECRET",
  "OPENAI_API_KEY",
  "TURNSTILE_ALLOWED_HOSTNAMES",
  "TURNSTILE_SECRET_KEY",
  "TURNSTILE_SITE_KEY",
]);

const secretRules = [
  {
    label: "non-blank committed secret environment assignment",
    pattern:
      /(?:^|\n)[\t ]*(?:OPENAI_API_KEY|ELEVENLABS_API_KEY|TURNSTILE_SECRET_KEY|INTERVIEW_GRANT_SIGNING_SECRET|ANONYMOUS_COOKIE_SECRET)[\t ]*=[\t ]*[^\s#]+/gu,
  },
  {
    label: "OpenAI-style secret key",
    pattern: /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/gu,
  },
  {
    label: "ElevenLabs-style secret key",
    pattern: /\bsk_[A-Za-z0-9]{20,}\b/gu,
  },
  {
    label: "GitHub token",
    pattern: /\bgh[pousr]_[A-Za-z0-9]{30,}\b/gu,
  },
  {
    label: "Google service-account document",
    pattern: /"type"\s*:\s*"service_account"/gu,
  },
  {
    label: "private key",
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/gu,
  },
  {
    label: "AWS access key",
    pattern: /\bAKIA[A-Z0-9]{16}\b/gu,
  },
];

const historyPatterns = [
  "^[[:space:]]*(OPENAI_API_KEY|ELEVENLABS_API_KEY|TURNSTILE_SECRET_KEY|INTERVIEW_GRANT_SIGNING_SECRET|ANONYMOUS_COOKIE_SECRET)[[:space:]]*=[[:space:]]*[^[:space:]#]+",
  "sk-(proj-)?[A-Za-z0-9_-]{20,}",
  "sk_[A-Za-z0-9]{20,}",
  "gh[pousr]_[A-Za-z0-9]{30,}",
  '"type"[[:space:]]*:[[:space:]]*"service_account"',
  "-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----",
  "AKIA[A-Z0-9]{16}",
];

const trackedFiles = execFileSync(
  "git",
  ["ls-files", "-z", "--cached", "--others", "--exclude-standard"],
  { encoding: "utf8" },
)
  .split("\0")
  .filter(Boolean);

const findings = [];
for (const path of trackedFiles) {
  const bytes = readFileSync(path);
  if (
    bytes.byteLength > MAXIMUM_SCANNED_FILE_BYTES ||
    bytes.subarray(0, 8_192).includes(0)
  ) {
    continue;
  }
  const text = bytes.toString("utf8");
  if (path.endsWith(".env.example")) {
    for (const line of text.split(/\r?\n/u)) {
      const assignment = /^([A-Z][A-Z0-9_]*)=(.*)$/u.exec(line);
      if (
        assignment !== null &&
        blankEnvironmentTemplateFields.has(assignment[1]) &&
        assignment[2].trim() !== ""
      ) {
        findings.push(
          `${path}: non-blank owner-supplied environment template field ${assignment[1]}`,
        );
      }
    }
  }
  for (const rule of secretRules) {
    rule.pattern.lastIndex = 0;
    if (rule.pattern.test(text)) {
      findings.push(`${path}: ${rule.label}`);
    }
  }
}

if (process.argv.includes("--history")) {
  const commits = execFileSync("git", ["rev-list", "--all"], {
    encoding: "utf8",
  })
    .split(/\r?\n/u)
    .filter(Boolean);
  for (const commit of commits) {
    const arguments_ = ["grep", "-I", "-l", "-E"];
    for (const pattern of historyPatterns) {
      arguments_.push("-e", pattern);
    }
    arguments_.push(commit, "--");
    try {
      const matches = execFileSync("git", arguments_, {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      })
        .split(/\r?\n/u)
        .filter(Boolean);
      for (const match of matches) {
        findings.push(`${match}: credential-like reachable-history content`);
      }
    } catch (error) {
      if (
        typeof error !== "object" ||
        error === null ||
        !("status" in error) ||
        error.status !== 1
      ) {
        throw error;
      }
    }
  }
}

if (findings.length > 0) {
  process.stderr.write(
    `Tracked-secret scan failed:\n${findings.map((finding) => `- ${finding}`).join("\n")}\n`,
  );
  process.exitCode = 1;
} else {
  process.stdout.write(
    `Tracked-secret scan passed (${String(trackedFiles.length)} files checked).\n`,
  );
}
