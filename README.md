# Shaders

Fragment shaders for projection and live visuals, by Paul Rozenboim.
Live at **shaders.unapaulogetic.art**.

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

## The gallery

`index.html` runs each shader in its own WebGL context, and only while it is
on screen — four full-rate fragment shaders at once will heat a laptop. It
respects `prefers-reduced-motion` properly rather than as a gesture: these are
optical illusions built to make your eyes misfire, so those visitors get a
still frame and a Play button.

No build step. It is a folder of static files.
