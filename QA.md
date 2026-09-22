# Shader QA — 2026-09-22

All requested fixes are applied, all three build commands completed, and
the generated files, ZIP and local website copies are consistent.

| Shader | Change | WebGL | TD adapter | ISF adapter |
|---|---|---|---|---|
| Abstract Lines Rain | Replace reversed smoothstep with its defined complement; correct description | PASS | PASS | PASS |
| Cartwheel Effect | Replace reversed separator smoothstep with its defined complement | PASS | PASS | PASS |
| Data Stream Rain | Remove neighbouring-row mask that always evaluates to zero | PASS | PASS | PASS |
| Interactive Data Rain | Same cleanup; correct speed 10–30 and density 20–120 comments | PASS | PASS | PASS |
| Hero Grid | ISF mouse default [0,0] restores automatic motion | PASS | PASS | PASS |
| Wave Lines | ISF mouse default [0,0] restores automatic motion | PASS | PASS | PASS |

All six ISF exports declare `ISFVSN: "2.0"`. Interactive Data Rain retains
its [0.5,0.5] default. TouchDesigner outputs explicitly use location 0.
The generator now resolves URL-encoded filesystem paths correctly.
Host instructions were corrected in README.md, the ZIP, generated TD headers,
and the sibling website's shader page.

## Evidence

Commands completed successfully:

```text
node tools/port.mjs
node tools/pack.mjs
node tools/publish.mjs
node tools/verify.mjs --published --baseline=54537ef9bc4fb11cb224c8d7aa6366d348b595db
```

- 18 generated assets: six shaders in each of three formats.
- Chrome 153 / SwiftShader compiled, linked and rendered every export.
  WebGL uses GLSL ES 1.00; ISF adds its documented uniforms to an ES 1.00
  context; TD uses ES 3.00 with a TD output-info struct and identity swizzle.
- 486 baseline comparisons: each export at 320×180, 180×320 and 512×512,
  times 0, 1.25 and 37 seconds, and pointer positions [0,0], [0.5,0.5], [1,1].
  Maximum RGBA byte difference was **0**, comparing equivalent inputs with
  the original WebGL shader from the baseline commit.
- Additional checks verify non-flat, opaque grayscale output, advancing
  animation, pointer response, source inclusion and ISF input metadata.
- The ZIP contains 19 entries (18 shaders and README.txt), 31,127 bytes.
  Decompressed shader bytes match build/. All 26 published asset files match
  this repository. The gallery download label says six shaders and 30 KB.
- Diff whitespace validation passed.

## Remaining limits and observations

No compilation, rendering or asset-parity errors were found in these checks.
Native TouchDesigner, Resolume Wire, VDMX and Millumin were not launched;
their runtime compilation, UI bindings, colour pipeline and performance
remain unverified. Browser adapters do not certify native host support.

The existing website viewer initialises its pointer at the centre, so Hero
Grid and Wave Lines use a centred attractor there until the pointer moves.
This existing visual behaviour was preserved. Their automatic paths are
available through zero mouse input, including the corrected ISF defaults.
The original one-pixel pointer activation thresholds also remain unchanged.

Publishing here means copying into `HOME PAGE/dist/lab/shaders/`; it does
not commit, push or deploy the website. Both checkouts contain local changes.

## Host references

- [ISF metadata specification](https://docs.isf.video/ref_json.html)
- [TouchDesigner GLSL TOP setup](https://docs.derivative.ca/Write_a_GLSL_TOP)
- [Resolume Wire ISF workflow](https://resolume.com/support/en/isf)
- [VDMX asset locations](https://docs.vidvox.net/vdmx/vdmx_assets)
- [Millumin generator installation](https://help.millumin.com/v4/tutorials/create-images-and-effects-with-shaders/)
