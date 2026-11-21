// Neon Sunset Cover Studio — an entry for make.fun's "Make GTA 6 Cover Art" bounty.
//
// v2 (21 November 2026): the caption moved off the photos onto its own strip;
// two new samples (Rooftop, Skate); Neon Nights lost its cyan cast on skin;
// undo and per-panel remove; screenshot scenes frame each face by its own
// focus point. Written in this session from the v2 fix list, not patched over v1.
//
// The app is this directory's app/ folder: plain static files a desktop browser loads
// offline. app/index.html is the studio; app/src/cover.js paints the three-panel poster
// (diagonal white gutters, a colour grade, bold Anton lettering) onto a canvas; the
// studio exports that canvas as a PNG in 1080x1080, 1080x1350 or 1920x1080. Photos come
// from the person's own machine and are never uploaded; the two bundled samples under
// app/samples/ were made for make.fun with an image model and are free to use.
//
// This program hands the entry in: it copies app/ and screenshots/ from beside this
// file into /output and writes /output/dossier.json, the summary the judge reads, with
// the vendored make.fun library (vendor/makefun-app.ts, unchanged).
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// Node 22, standard library only, no network.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'app'), join(outputDir, 'app'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
const shotDir = join(repoRoot, 'screenshots');
if (existsSync(shotDir)) cpSync(shotDir, join(outputDir, 'screenshots'), { recursive: true });

// The scorer's caps, from the kit's gate: the dossier text is trimmed at
// text_max_bytes; the other limits refuse an entry the scorer would refuse — at
// most 4 screenshots, none over 256 KiB; app/ holds at most 993 files and 48 MiB
// in all, with no path over 1000 bytes. /output shares a 1000-entry cap.
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);
