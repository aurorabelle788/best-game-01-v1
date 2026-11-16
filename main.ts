// Emberkeep — the entry program for best-game-01 (Node 22, stdlib only).
//
// What it hands in: the game in game/ (static files, game/index.html and
// its ES modules, no library, no network), the four screenshots in
// screenshots/, and dossier.json, the summary the judge reads, built by
// the vendored make.fun library.
//
// The game itself: a tower defence about the last hearth in a frozen
// night. Frost wraiths crawl from three gates to snuff the fire; the
// Keeper builds braziers, mortars and lanterns on plots, earns embers,
// and holds the hearth for ten waves, ending with the Frost King.
//
// Play it locally: `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for
// /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The scorer's own caps (reference/gate.json): text_max_bytes shapes the
// dossier bytes; the rest refuse an entry the scorer would refuse —
// more than 4 screenshots or one over 256 KiB, more than 993 files in
// game/ or 48 MiB of game files in all, or a path under game/ over
// 1000 bytes.
const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function copyTree(source, dest) {
  mkdirSync(dest, { recursive: true });
  cpSync(source, dest, { recursive: true });
}

copyTree(join(repoRoot, 'game'), join(outputDir, 'game'));
if (existsSync(join(repoRoot, 'screenshots'))) {
  copyTree(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'));
}

writeFileSync(join(outputDir, 'dossier.json'), buildDossier(outputDir, CAPS));
