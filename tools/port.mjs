/**
 * One shader in, four shaders out.
 *
 *     node tools/port.mjs
 *
 * The canonical source in src/ is written the way Shadertoy writes it: a
 * `mainImage(out vec4, in vec2)` and the iTime / iResolution / iMouse
 * uniforms. That is the dialect these were authored in, and keeping it means
 * a shader can go back to Shadertoy unchanged.
 *
 * Every other host wants the same GLSL with a different collar on it. Rather
 * than hand-converting each one — and getting a different answer each time —
 * this puts the collar on mechanically:
 *
 *   webgl/          a plain fragment shader the viewer in this repo runs
 *   touchdesigner/  for a GLSL TOP: TD declares its own output and insists
 *                   the result goes through TDOutputSwizzle
 *   isf/            ISF, for Resolume, VDMX and Millumin: a JSON header and
 *                   RENDERSIZE / TIME in place of the Shadertoy names
 *
 * Nothing here parses GLSL. It prepends declarations and appends an entry
 * point, which is all the difference actually amounts to.
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join, basename } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const SRC = join(ROOT, 'src');
const OUT = join(ROOT, 'build');

const meta = JSON.parse(readFileSync(join(ROOT, 'shaders.json'), 'utf8'));
const metaFor = slug => meta.find(m => m.slug === slug) ?? { name: slug, description: '', usesMouse: false };

const CREDIT = (m) =>
`// ${m.name}
// Paul Rozenboim — unapaulogetic.art${m.shadertoy ? `\n// Original: shadertoy.com/view/${m.shadertoy}` : ''}
// Free to use. A credit is welcome and not required.
`;

/* ---- WebGL ----------------------------------------------------------------
   GLSL ES 1.00, which is what WebGL1 takes and what every browser runs
   without argument. */
const webgl = (body, m) => `${CREDIT(m)}precision highp float;

uniform vec3  iResolution;
uniform float iTime;
uniform vec4  iMouse;
uniform int   iFrame;

${body}

void main() {
  mainImage(gl_FragColor, gl_FragCoord.xy);
}
`;

/* ---- TouchDesigner --------------------------------------------------------
   A GLSL TOP declares its own output and will not accept gl_FragColor.
   iResolution comes free from uTDOutputInfo; iTime and iMouse do not exist,
   so the TOP needs two custom uniforms — named in the header below, because
   this is the step people get wrong. */
const touchdesigner = (body, m) => `${CREDIT(m)}// --- TouchDesigner setup ----------------------------------------------
// Drop this in a GLSL TOP, then on the TOP's Vectors page add:
//     uTime   float   ->  absTime.seconds        (or a Speed CHOP)
${m.usesMouse
  ? `//     uMouse  vec4    ->  x,y from a Mouse In CHOP, normalised 0..1
//                         z,w can stay 0`
  : `//     uMouse  vec4    ->  unused by this shader, leave at 0`}
// Nothing else needs changing.
// ----------------------------------------------------------------------
out vec4 fragColor;

uniform float uTime;
uniform vec4  uMouse;

#define iTime uTime
#define iResolution vec3(uTDOutputInfo.res.zw, 1.0)
#define iMouse (uMouse * vec4(uTDOutputInfo.res.zw, 1.0, 1.0))
#define iFrame int(uTime * 60.0)

${body}

void main() {
  vec4 color;
  mainImage(color, gl_FragCoord.xy);
  fragColor = TDOutputSwizzle(color);
}
`;

/* ---- ISF ------------------------------------------------------------------
   Resolume, VDMX, Millumin and CoGe. The JSON header is the whole format;
   the GLSL underneath is ordinary. */
const isf = (body, m) => {
  const header = {
    DESCRIPTION: m.description || m.name,
    CREDIT: 'Paul Rozenboim — unapaulogetic.art',
    CATEGORIES: ['Generator', ...(m.tags ?? [])],
    INPUTS: m.usesMouse
      ? [{ NAME: 'mouse', TYPE: 'point2D', DEFAULT: [0.5, 0.5], MIN: [0, 0], MAX: [1, 1] }]
      : [],
  };
  return `/*${JSON.stringify(header, null, 2)}*/

${CREDIT(m)}#define iTime TIME
#define iResolution vec3(RENDERSIZE, 1.0)
${m.usesMouse
  ? '#define iMouse vec4(mouse * RENDERSIZE, 0.0, 0.0)'
  : '#define iMouse vec4(0.0)'}
#define iFrame int(TIME * 60.0)

${body}

void main() {
  mainImage(gl_FragColor, gl_FragCoord.xy);
}
`;
};

const TARGETS = [
  { dir: 'webgl', ext: '.frag', make: webgl },
  { dir: 'touchdesigner', ext: '.frag', make: touchdesigner },
  { dir: 'isf', ext: '.fs', make: isf },
];

const files = readdirSync(SRC).filter(f => f.endsWith('.frag'));
if (!files.length) { console.error('nothing in src/'); process.exit(1); }

for (const target of TARGETS) mkdirSync(join(OUT, target.dir), { recursive: true });

let count = 0;
for (const file of files) {
  const slug = basename(file, '.frag');
  const body = readFileSync(join(SRC, file), 'utf8').trim();
  const m = metaFor(slug);

  /* A source that still declares the uniforms itself would collide with the
     ones each wrapper adds. None of ours do; say so rather than silently
     producing a shader that will not compile. */
  if (/^\s*uniform\s/m.test(body)) {
    console.error(`  ! ${slug} declares its own uniforms — the wrappers will clash. Skipped.`);
    continue;
  }

  for (const target of TARGETS) {
    writeFileSync(join(OUT, target.dir, slug + target.ext), target.make(body, m), 'utf8');
  }
  count++;
  console.log(`  ${slug}  ->  ${TARGETS.map(t => t.dir).join(', ')}`);
}

console.log(`\n${count} shader${count === 1 ? '' : 's'} x ${TARGETS.length} targets in build/`);
