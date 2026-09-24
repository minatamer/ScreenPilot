import { rmSync } from "node:fs";
import { normalize, sep } from "node:path";
import process from "node:process";
import { fileURLToPath, URL } from "node:url";

const backendBuildDirectory = normalize(
  fileURLToPath(new URL("../apps/backend/dist", import.meta.url)),
).replace(/[\\/]+$/u, "");
const expectedSuffix = ["apps", "backend", "dist"].join(sep);

if (!backendBuildDirectory.endsWith(expectedSuffix)) {
  throw new Error("Refusing to clean an unexpected backend build directory.");
}

rmSync(backendBuildDirectory, { force: true, recursive: true });
process.stdout.write("Cleaned the generated backend build directory.\n");
