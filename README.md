# Shaders

Fragment shaders for projection and live visuals, by Paul Rozenboim.
Live at **unapaulogetic.art/lab/shaders/** - no subdomain; the page is
copied into the main site by `tools/publish.mjs`.

Each shader is written once, in the Shadertoy dialect, and converted into the
three forms anything else wants:

| Folder | For | Notes |
|---|---|---|
| `build/touchdesigner/` | A GLSL TOP | Bind `uTime`, plus `uMouse` for interactive shaders; see each file's header |
| `build/isf/` | Resolume Wire, VDMX, Millumin, CoGe | ISF 2.0 — the JSON header is part of the file |
| `build/webgl/` | A web page | GLSL ES 1.00, what WebGL1 takes |

## Adding one

Put the Shadertoy source in `src/<slug>.frag`, add an entry to
`shaders.json`, then:

    node tools/port.mjs
    node tools/pack.mjs

The first writes all three versions. Nothing is converted by hand, so a fix to
a shader reaches every host at once — which is the whole reason the harness
exists.

The second rebuilds `downloads/unapaulogetic-shaders.zip`, which is what the
page's one download button hands over. **Run both.** `build/` and the zip are
committed, so skipping the second leaves the page serving the previous set of
shaders to anybody who takes the pack rather than the individual files.

**Write the source the way Shadertoy does**: a `mainImage(out vec4, in vec2)`
using `iTime`, `iResolution` and `iMouse`. Do not declare those uniforms
yourself — each wrapper supplies them, and the harness refuses a file that
declares its own rather than emitting something that will not compile.

## Where the page is

Not here. It is in the website repo at `dist/lab/shaders/`, built into the
site template with the real header and footer, and styled by the site's own
stylesheet. `tools/publish.mjs` copies `build/`, `downloads/` and `src/`
across; the page and its viewer are the site's.

That split is on purpose. A second copy of the gallery living here would be
a second thing to keep in step, and the whole point of `port.mjs` is that
there is only ever one source for anything.

To see a change, run all three and serve the website:

    node tools/port.mjs && node tools/pack.mjs && node tools/publish.mjs

## Host setup

TouchDesigner: paste the shader into a GLSL TOP's Pixel Shader DAT, using
GLSL 3.30 or newer. On Vectors, name a uniform `uTime` and set its first
value to `absTime.seconds` in Python expression mode. For interactive
shaders, bind `uMouse` with x,y normalised to 0–1 (bottom-left origin) and
z,w = 0. Remap Mouse In CHOP channels as needed. Set the output resolution.

ISF exports are generators. In [Resolume Wire](https://resolume.com/support/en/isf),
load the `.fs` resource into an ISF node; compile a Source patch for
Arena/Avenue. Raw `.fs` files are not Extra Effects plugins.
[VDMX](https://docs.vidvox.net/vdmx/vdmx_assets) uses
`~/Library/Graphics/ISF` or `/Library/Graphics/ISF`.
[Millumin](https://help.millumin.com/v4/tutorials/create-images-and-effects-with-shaders/)
uses `~/Library/Millumin/ISF-source` for these generators; relaunch it and
look in the library's shaders group. For other hosts, use their import workflow.

ISF's `mouse` is a normalised point parameter, not necessarily a cursor.
Hero Grid and Wave Lines default to `[0,0]` for automatic motion; resetting
the point restores it. Hero Grid follows when either coordinate exceeds
1 pixel, and Wave Lines follows when x exceeds 1 pixel, ignoring y.
Interactive Data Rain defaults to `[0.5,0.5]`: x sets speed from 10 to 30,
and y sets column density from 120 to 20. `mouseDefault` in `shaders.json`
controls ISF defaults and the suggested TouchDesigner setup.

WebGL expects drawing-buffer pixels for `iResolution.xy` and `iMouse.xy`,
a bottom-left mouse origin, and seconds for `iTime`. The existing site
viewer starts the pointer at the centre; callers can send `[0,0]` to use
Hero Grid / Wave Lines automatic motion. Unused uniforms can be optimised away.

## Verification

Run `node tools/verify.mjs --published` after the three build steps. It uses
Chrome (override its location with `CHROME_PATH`) to compile and render every
export, compare sampled frames with the WebGL shaders in `HEAD`, and check
the ZIP and website copies. Use `--baseline=<git-ref>` to choose a baseline.
TouchDesigner and ISF are checked with host-variable shims, not their native
applications. See [QA.md](QA.md) for the recorded results and limitations.
