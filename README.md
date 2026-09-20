# Shaders

Fragment shaders for projection and live visuals, by Paul Rozenboim.
Live at **unapaulogetic.art/lab/shaders/** - no subdomain; the page is
copied into the main site by `tools/publish.mjs`.

Each shader is written once, in the Shadertoy dialect, and converted into the
three forms anything else wants:

| Folder | For | Notes |
|---|---|---|
| `build/touchdesigner/` | A GLSL TOP | Needs two custom uniforms; the header in each file says which |
| `build/isf/` | Resolume, VDMX, Millumin, CoGe | ISF — the JSON header is part of the file |
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
