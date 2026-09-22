/**
 * Everything in one file.
 *
 *     node tools/pack.mjs
 *
 * Twelve downloads is eleven too many. This writes shaders-pack.zip with the
 * three built folders and a README, so somebody setting up for a gig clicks
 * once.
 *
 * WHY THIS IS WRITTEN BY HAND
 * Node has no zip writer, and the people this is for are not going to run
 * `npm install` to get a shader. A stored-and-deflated zip is about sixty
 * lines of well-documented format, so the repo stays dependency-free and
 * `node tools/pack.mjs` works on any machine with Node on it.
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { deflateRawSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/* ---- crc32, which the zip format wants for every entry ------------------ */
const TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/* ---- one fixed timestamp, so the same input makes the same zip ---------- */
const DOS_TIME = 0;      // 00:00:00
const DOS_DATE = (2026 - 1980) << 9 | (1 << 5) | 1;   // 2026-01-01

function zip(entries) {
  const locals = [];
  const central = [];
  let offset = 0;

  for (const { name, data } of entries) {
    const nameBuf = Buffer.from(name, 'utf8');
    const deflated = deflateRawSync(data, { level: 9 });
    /* Deflate is not always smaller. Store when it is not. */
    const useDeflate = deflated.length < data.length;
    const body = useDeflate ? deflated : data;
    const method = useDeflate ? 8 : 0;
    const sum = crc32(data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);   // signature
    local.writeUInt16LE(20, 4);           // version needed
    local.writeUInt16LE(0, 6);            // flags
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(DOS_TIME, 10);
    local.writeUInt16LE(DOS_DATE, 12);
    local.writeUInt32LE(sum, 14);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);           // extra field length
    locals.push(local, nameBuf, body);

    const dir = Buffer.alloc(46);
    dir.writeUInt32LE(0x02014b50, 0);
    dir.writeUInt16LE(20, 4);             // version made by
    dir.writeUInt16LE(20, 6);             // version needed
    dir.writeUInt16LE(0, 8);
    dir.writeUInt16LE(method, 10);
    dir.writeUInt16LE(DOS_TIME, 12);
    dir.writeUInt16LE(DOS_DATE, 14);
    dir.writeUInt32LE(sum, 16);
    dir.writeUInt32LE(body.length, 20);
    dir.writeUInt32LE(data.length, 24);
    dir.writeUInt16LE(nameBuf.length, 28);
    dir.writeUInt16LE(0, 30);             // extra
    dir.writeUInt16LE(0, 32);             // comment
    dir.writeUInt16LE(0, 34);             // disk number
    dir.writeUInt16LE(0, 36);             // internal attrs
    dir.writeUInt32LE(0, 38);             // external attrs
    dir.writeUInt32LE(offset, 42);
    central.push(dir, nameBuf);

    offset += local.length + nameBuf.length + body.length;
  }

  const centralBuf = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);                       // this disk
  end.writeUInt16LE(0, 6);                       // disk with central dir
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);                      // comment length

  return Buffer.concat([...locals, centralBuf, end]);
}

/* ---- what goes in ------------------------------------------------------- */
const meta = JSON.parse(readFileSync(path.join(ROOT, 'shaders.json'), 'utf8'));

const README = `SHADERS
Paul Rozenboim - unapaulogetic.art

${meta.length} fragment shaders, each in three formats. Free to use, including
at paid work. A credit is welcome and not required. You do not need to
ask first.


WHAT IS IN HERE

  touchdesigner/   .frag - for a GLSL TOP
  isf/             .fs   - for Resolume Wire, VDMX, Millumin, CoGe
  webgl/           .frag - for a web page


TOUCHDESIGNER

  1. Add a GLSL TOP using GLSL 3.30 or newer; set its output resolution.
  2. Paste the file into its Pixel Shader DAT. TD supplies the version line.
  3. On the Vectors page, set Uniform Name to uTime. Set the first value
     to absTime.seconds in Python expression mode. Without an advancing
     clock, the shader renders a still frame.
  4. For interactive shaders, add Uniform Name uMouse with four values.
     Feed x,y normalised 0 to 1, with a bottom-left origin; leave z,w at 0.
     Remap Mouse In CHOP channels as needed. Hero Grid and Wave Lines use
     x,y = 0 for automatic motion. Interactive Data Rain can start at 0.5,0.5.

  The top of each file repeats these steps.


RESOLUME WIRE AND OTHER ISF HOSTS

  These are ISF 2.0 generators (sources, with no input image).
  Resolume Wire: create an ISF node and load the .fs Fragment Shader resource.
  Connect it to the patch output; compile a Source patch for Arena/Avenue.
  Raw .fs files do not belong in Arena's Extra Effects folder.
  VDMX: install in ~/Library/Graphics/ISF (per user) or /Library/Graphics/ISF.
  Millumin: install these generators in ~/Library/Millumin/ISF-source,
  then launch Millumin and find them in the library's shaders group.
  Other ISF hosts: use their documented shader import workflow.

  The "mouse" point is a normalised host parameter, not necessarily a cursor.
  Hero Grid and Wave Lines default to [0,0] for automatic motion. Reset the
  point to [0,0] to restore it. Hero Grid follows when either pixel coordinate
  exceeds 1; Wave Lines follows when x exceeds 1 pixel (y is ignored).
  Interactive Data Rain defaults to [0.5,0.5]; x controls speed 10 to 30,
  y controls column density 120 to 20. Coordinates use a bottom-left origin.

  Host references:
  https://resolume.com/support/en/isf
  https://docs.vidvox.net/vdmx/vdmx_assets
  https://help.millumin.com/v4/tutorials/create-images-and-effects-with-shaders/


A WEB PAGE

  The webgl/ files are GLSL ES 1.00, which is what WebGL1 takes. They expect
  four uniforms: iResolution (vec3), iTime (float), iMouse (vec4) and
  iFrame (int). There is a working example of feeding them, about a hundred
  lines, at unapaulogetic.art/lab/shaders/shaders.js
  iResolution.xy is the drawing-buffer size in pixels; iTime is seconds.
  iMouse.xy is in drawing-buffer pixels, bottom-left origin. Use [0,0]
  for Hero Grid / Wave Lines automatic motion; the current gallery starts
  at the centre instead. Uniforms unused by a shader may be optimised away.


THE SHADERS

${meta.map(m => `  ${m.name}\n    ${m.description}${m.usesMouse ? '\n    Follows the pointer.' : ''}`).join('\n\n')}


All three versions are generated from one source by tools/port.mjs, so they
never drift apart. Sources and originals:

  https://github.com/paulrozenboim/shaders
  https://www.shadertoy.com/user/paulrozenboim
`;

const entries = [{ name: 'README.txt', data: Buffer.from(README, 'utf8') }];

for (const dir of ['touchdesigner', 'isf', 'webgl']) {
  const from = path.join(ROOT, 'build', dir);
  if (!existsSync(from)) { console.error(`  ! build/${dir} is missing - run tools/port.mjs first`); process.exit(1); }
  for (const file of readdirSync(from).sort()) {
    entries.push({ name: `${dir}/${file}`, data: readFileSync(path.join(from, file)) });
  }
}

mkdirSync(path.join(ROOT, 'downloads'), { recursive: true });
const out = path.join(ROOT, 'downloads', 'unapaulogetic-shaders.zip');
const buf = zip(entries);
writeFileSync(out, buf);

const kb = Math.round(buf.length / 1024);
console.log(`\n  ${entries.length} files -> downloads/unapaulogetic-shaders.zip  (${kb} KB)`);

/* ---- and tell the page what it is handing over -------------------------
   "Download all four, 19 KB" is true today and wrong the moment a fifth
   shader lands. A button that lies about its own contents is worse than one
   that says nothing, so the count and the weight are written from here
   rather than typed into the HTML. */
const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven',
               'eight', 'nine', 'ten', 'eleven', 'twelve'];
const count = WORDS[meta.length] ?? String(meta.length);

/* The page lives in the website repo now, not here. Patch it there. */
const page = path.resolve(ROOT, '..', '..', 'HOME PAGE', 'dist', 'lab', 'shaders', 'index.html');
if (!existsSync(page)) {
  console.log('  ! No page at dist/lab/shaders/index.html - button not updated');
  console.log(`    Looked in ${page}`);
  process.exit(0);
}
let html = readFileSync(page, 'utf8');

/* Test that each marker is actually there. Comparing the before and after
   text does not work: when the count and the size have not changed, a
   perfectly good substitution produces an identical file, which reads as a
   failure. Ask whether the pattern matched, not whether the string moved. */
const edits = [
  [/(<span data-pack="label">)[^<]*(<\/span>)/, `$1Download all ${count}$2`, 'label'],
  [/(<span class="pack-note" data-pack="size">)[^<]*(<\/span>)/, `$1zip, ${kb}&#8239;KB$2`, 'size'],
];

const missing = edits.filter(([re]) => !re.test(html)).map(([, , what]) => what);
if (missing.length) {
  console.log(`  ! index.html is missing the ${missing.join(' and ')} marker - button left alone`);
} else {
  for (const [re, to] of edits) html = html.replace(re, to);
  writeFileSync(page, html);
  console.log(`  the site page  -> "Download all ${count}", ${kb} KB`);
}
console.log();
