import { createRequire } from "node:module";
import { copyFileSync, mkdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import process from "node:process";
import { fileURLToPath, URL } from "node:url";

const frontendRequire = createRequire(
  new URL("../apps/frontend/package.json", import.meta.url),
);
const reactEntryPath = frontendRequire.resolve("@elevenlabs/react");
const reactRequire = createRequire(reactEntryPath);
const clientEntryPath = reactRequire.resolve("@elevenlabs/client");
const libsamplerateEntryPath = frontendRequire.resolve(
  "@alexanderolsen/libsamplerate-js",
);

const worklets = [
  {
    destination: "elevenlabs-raw-audio-processor.js",
    source: join(
      dirname(dirname(clientEntryPath)),
      "worklets",
      "rawAudioProcessor.js",
    ),
  },
  {
    destination: "libsamplerate.worklet.js",
    source: join(dirname(libsamplerateEntryPath), "libsamplerate.worklet.js"),
  },
];

const destinationDirectory = fileURLToPath(
  new URL("../apps/frontend/public/worklets/", import.meta.url),
);
mkdirSync(destinationDirectory, { recursive: true });

for (const worklet of worklets) {
  if (statSync(worklet.source).size === 0) {
    throw new Error(
      `Refusing to copy an empty worklet: ${worklet.destination}`,
    );
  }
  copyFileSync(worklet.source, join(destinationDirectory, worklet.destination));
}

process.stdout.write(
  `Prepared ${String(worklets.length)} pinned ElevenLabs audio worklets.\n`,
);
