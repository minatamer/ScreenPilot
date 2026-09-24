import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import process from "node:process";

const inlineStyleRules = [
  {
    label: "React or HTML inline style attribute",
    pattern: /\bstyle\s*=/gu,
  },
  {
    label: "DOM inline style mutation",
    pattern: /\.style(?:\.|\[)/gu,
  },
  {
    label: "DOM style attribute mutation",
    pattern: /\bsetAttribute\s*\(\s*["']style["']/gu,
  },
];

const browserSourceFiles = execFileSync(
  "git",
  [
    "ls-files",
    "-z",
    "--cached",
    "--others",
    "--exclude-standard",
    "--",
    "apps/frontend/src/**/*.ts",
    "apps/frontend/src/**/*.tsx",
  ],
  { encoding: "utf8" },
)
  .split("\0")
  .filter(Boolean)
  .filter((path) => !path.endsWith(".test.ts") && !path.endsWith(".test.tsx"));

const findings = [];
for (const path of browserSourceFiles) {
  const source = readFileSync(path, "utf8");
  for (const rule of inlineStyleRules) {
    rule.pattern.lastIndex = 0;
    if (rule.pattern.test(source)) {
      findings.push(`${path}: ${rule.label}`);
    }
  }
}

if (findings.length > 0) {
  process.stderr.write(
    `Inline-style scan failed:\n${findings.map((finding) => `- ${finding}`).join("\n")}\n`,
  );
  process.exitCode = 1;
} else {
  process.stdout.write(
    `Inline-style scan passed (${String(browserSourceFiles.length)} browser source files checked).\n`,
  );
}
