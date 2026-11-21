// Neon Sunset Cover Studio — the entrypoint.
//
// Copies app/ and screenshots/ to the output directory and writes the
// dossier (makefun/dossier/v1) with the kit's buildDossier library.
// The program is deterministic: the same repository writes the same bytes.
//
// Run it outside the grader with:
//   MAKEFUN_OUTPUT_DIR=out node main.ts
// (inside the grader the output directory is /output).

import { buildDossier } from "./vendor/makefun-app.ts";
import { cpSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoDir = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";

mkdirSync(outDir, { recursive: true });
cpSync(join(repoDir, "app"), join(outDir, "app"), { recursive: true, force: true });
if (existsSync(join(repoDir, "screenshots"))) {
  cpSync(join(repoDir, "screenshots"), join(outDir, "screenshots"), {
    recursive: true,
    force: true,
  });
}

const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
});
writeFileSync(join(outDir, "dossier.json"), dossier);
console.log(`dossier: ${dossier.length} bytes -> ${join(outDir, "dossier.json")}`);
