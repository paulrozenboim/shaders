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
  isf/             .fs   - for Resolume, VDMX, Millumin, CoGe
  webgl/           .frag - for a web page


TOUCHDESIGNER

  1. Add a GLSL TOP.
  2. Open its Pixel Shader and paste the file in.
  3. On the TOP's Vectors page, add a uniform named uTime, and point it at
     absTime.seconds. Nothing renders until you do this - a shader with no
     clock is a still frame.
  4. For the shaders that follow the pointer, add a vec4 named uMouse and
     feed x and y from a Mouse In CHOP, normalised 0 to 1.

  The top of each file repeats these steps.


RESOLUME AND OTHER ISF HOSTS

  Drop the .fs file into the ISF folder and it appears as a source.

    Resolume   Documents/Resolume Arena/Extra Effects/ISF
    VDMX       Library/Graphics/ISF
    Millumin   Documents/Millumin/ISF

  Restart the host if it does not show up. Shaders that follow the pointer
  expose a "mouse" point control in the host's own interface.


A WEB PAGE

  The webgl/ files are GLSL ES 1.00, which is what WebGL1 takes. They expect
  four uniforms: iResolution (vec3), iTime (float), iMouse (vec4) and
  iFrame (int). viewer.js in the repository is a working example of feeding
  them, and it is about a hundred lines.


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

const page = path.join(ROOT, 'index.html');
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
  console.log(`  index.html  -> "Download all ${count}", ${kb} KB`);
}
console.log();
