/**
 * Copy the page into the main site.
 *
 *     node tools/publish.mjs
 *
 * The shaders do not get a subdomain. They live at
 * unapaulogetic.art/lab/shaders/, next to the Interference pages, because
 * the point was somewhere to look at them and play with them - not another
 * deploy to keep alive.
 *
 * This repository stays the source of truth: sources in src/, the harness in
 * tools/, and a GitHub page people can read. The website gets a one-way
 * copy of the published files, so the two cannot disagree about a shader -
 * there is only ever one direction for a change to travel.
 *
 * Run it after port.mjs and pack.mjs.
 */
import { readdirSync, statSync, mkdirSync, copyFileSync, existsSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = path.resolve(ROOT, '..', '..', 'HOME PAGE', 'dist', 'lab', 'shaders');

/* The site is a sibling checkout, not a submodule, so say something useful
   rather than creating a folder in a place nobody expected. */
const distLab = path.resolve(ROOT, '..', '..', 'HOME PAGE', 'dist', 'lab');
if (!existsSync(distLab)) {
  console.error(`  ! Cannot find the website at ${distLab}`);
  console.error(`    Expected this repo to sit at WEBSITE/LAB/shaders next to WEBSITE/HOME PAGE.`);
  process.exit(1);
}

const FILES = ['index.html', 'style.css', 'viewer.js', 'shaders.json'];
const DIRS = ['build', 'downloads', 'src'];

let copied = 0;

function copyDir(from, to) {
  mkdirSync(to, { recursive: true });
  for (const entry of readdirSync(from)) {
    const src = path.join(from, entry);
    const dst = path.join(to, entry);
    if (statSync(src).isDirectory()) copyDir(src, dst);
    else { copyFileSync(src, dst); copied++; }
  }
}

/* Clear the built folders first. A shader deleted from src/ would otherwise
   linger on the website forever, still downloadable and no longer real. */
for (const dir of DIRS) {
  const target = path.join(SITE, dir);
  if (existsSync(target)) rmSync(target, { recursive: true, force: true });
}

mkdirSync(SITE, { recursive: true });
for (const file of FILES) { copyFileSync(path.join(ROOT, file), path.join(SITE, file)); copied++; }
for (const dir of DIRS) { if (existsSync(path.join(ROOT, dir))) copyDir(path.join(ROOT, dir), path.join(SITE, dir)); }

console.log(`\n  ${copied} files -> HOME PAGE/dist/lab/shaders/`);
console.log(`  Commit the website repo too; this only copies.\n`);
