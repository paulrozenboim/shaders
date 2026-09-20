/*{
  "DESCRIPTION": "Graph paper with something invisible moving underneath it. The grid never changes, only the coordinates.",
  "CREDIT": "Paul Rozenboim — unapaulogetic.art",
  "CATEGORIES": [
    "Generator",
    "grid",
    "distortion",
    "opart",
    "lens"
  ],
  "INPUTS": [
    {
      "NAME": "mouse",
      "TYPE": "point2D",
      "DEFAULT": [
        0.5,
        0.5
      ],
      "MIN": [
        0,
        0
      ],
      "MAX": [
        1,
        1
      ]
    }
  ]
}*/

// Lens Grid
// Paul Rozenboim — unapaulogetic.art
// Free to use. A credit is welcome and not required.
#define iTime TIME
#define iResolution vec3(RENDERSIZE, 1.0)
#define iMouse vec4(mouse * RENDERSIZE, 0.0, 0.0)
#define iFrame int(TIME * 60.0)

// LENS GRID
// Graph paper with something invisible moving underneath it.
//
// The grid is perfectly regular and never changes. Only the coordinates
// handed to it are bent, which is the whole trick - your eye insists the
// paper is stretching when nothing about the paper is moving at all.

#define TAU 6.28318530718

// Push coordinates away from a point, or pull them toward it, with the
// effect falling off to nothing at `radius`. Negative strength inverts,
// which reads as a dent rather than a bulge.
vec2 bend(vec2 p, vec2 centre, float radius, float strength) {
    vec2 d = p - centre;
    float fall = 1.0 - smoothstep(0.0, radius, length(d));
    return d * fall * strength;
}

// Lines in both directions. Smooth profile for the same reason as the
// gratings in moire-drift: no derivatives, so no extension, so the file
// behaves the same in TouchDesigner, ISF and a browser.
float grid(vec2 p, float freq, float sharp) {
    vec2 bar = 0.5 + 0.5 * cos(p * freq * TAU);
    vec2 line = pow(bar, vec2(sharp));
    return max(line.x, line.y);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;

    float mx = iMouse.x / iResolution.x;
    float my = iMouse.y / iResolution.y;

    // Three lenses on slow orbits at unrelated speeds, so the pattern never
    // quite comes back round. Prime-ish ratios rather than round numbers.
    vec2 c1 = vec2(cos(iTime * 0.31), sin(iTime * 0.23)) * 0.42;
    vec2 c2 = vec2(cos(iTime * -0.19 + 2.0), sin(iTime * 0.27 + 1.0)) * 0.54;
    vec2 c3 = vec2(cos(iTime * 0.13 + 4.0), sin(iTime * -0.17 + 3.0)) * 0.30;

    // Untouched, this sits at a strong bulge and a middling grid. Both are
    // the interesting end of their range.
    float push  = 0.55 + mx * 0.55;
    float scale = 8.0 + my * 12.0;

    vec2 p = uv;
    p += bend(uv, c1, 0.34,  0.62 * push);
    p += bend(uv, c2, 0.26, -0.45 * push);
    p += bend(uv, c3, 0.20,  0.38 * push);

    fragColor = vec4(vec3(grid(p, scale, 7.0)), 1.0);
}

void main() {
  mainImage(gl_FragColor, gl_FragCoord.xy);
}
