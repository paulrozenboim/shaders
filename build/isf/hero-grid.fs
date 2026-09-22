/*{
  "ISFVSN": "2.0",
  "DESCRIPTION": "The mesh from the events page hero. A surface that travels in a slow wave and swells wherever you point.",
  "CREDIT": "Paul Rozenboim — unapaulogetic.art",
  "CATEGORIES": [
    "Generator",
    "grid",
    "mesh",
    "wave",
    "interactive"
  ],
  "INPUTS": [
    {
      "NAME": "mouse",
      "TYPE": "point2D",
      "DEFAULT": [
        0,
        0
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

// Hero Grid
// Paul Rozenboim — unapaulogetic.art
// Free to use. A credit is welcome and not required.
#define iTime TIME
#define iResolution vec3(RENDERSIZE, 1.0)
#define iMouse vec4(mouse * RENDERSIZE, 0.0, 0.0)
#define iFrame int(TIME * 60.0)

// HERO GRID
// The mesh from the events page hero, as a shader.
//
// Ported from the canvas version in events-page/components/WaveGrid.tsx, and
// deliberately to the same numbers rather than to something that merely looks
// similar: 26 by 15 cells, a base swell of 10, a pointer reaction of 44 and a
// reach of 360px. Change them there and change them here.
//
// Pointer: the swell follows it. Left alone it walks a slow figure of its own,
// the same walk the site does on a phone, where there is no pointer to follow.

#define COLS 26.0
#define ROWS 15.0
#define SWELL 10.0      // GRID_SWELL
#define REACTION 44.0   // GRID_REACTION
#define REACH 360.0     // GRID_REACH, in the virtual pixels below

// Everything above is in pixels, because the original was. So the shader
// works in a virtual canvas of a fixed height and lets the width follow the
// aspect - otherwise the wave would get finer on a bigger screen, and the
// site's mesh does not do that.
#define VH 760.0

// How bright a line gets near the attractor. The canvas version brightens a
// whole row or column by its closest approach, not per pixel, and for an
// axis-aligned line that closest approach is just the perpendicular distance
// - so this is exact rather than an approximation of it.
float lit(float d) {
    if (d >= REACH) return 0.0;
    float k = 1.0 - d / REACH;
    return k * k;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    float unit = VH / iResolution.y;          // virtual pixels per real pixel
    vec2 px = fragCoord * unit;               // this pixel, in virtual pixels
    float VW = iResolution.x * unit;

    float t = iTime * 0.72;                   // 0.012 a frame at 60fps

    // The attractor. Untouched, it walks: two periods of about 24 and 38
    // seconds, unequal on purpose so the path takes minutes to come round.
    vec2 a = vec2(VW * (0.5 + 0.36 * sin(t * 0.37)),
                  VH * (0.46 + 0.3  * cos(t * 0.23)));
    if (iMouse.x > 1.0 || iMouse.y > 1.0) {
        a = iMouse.xy * unit;
    }

    // Cell size, from a mesh spread wider than the frame so no seam shows.
    vec2 origin = vec2(-VW * 0.06, -VH * 0.08);
    vec2 cell = vec2(VW * 1.12 / COLS, VH * 1.16 / ROWS);

    // The travelling wave, sampled here.
    float wave = sin(px.x * 0.011 + t) * cos(px.y * 0.015 - t * 0.7)
               + sin((px.x + px.y) * 0.006 + t * 1.3) * 0.5;

    float amp = SWELL + lit(distance(px, a)) * REACTION;

    // The canvas moves vertices forward. A fragment shader has to go the
    // other way - ask which vertex landed here - so the displacement is
    // subtracted. At these amplitudes the difference is invisible.
    vec2 q = px - vec2(wave * amp * 0.35, wave * amp);

    vec2 g = (q - origin) / cell;
    vec2 nearest = origin + floor(g + 0.5) * cell;     // the gridline itself
    vec2 d = abs(q - nearest);                         // distance to it

    float lw = 1.3 * unit;                             // 1.3 real pixels
    vec2 line = vec2(1.0) - smoothstep(vec2(lw * 0.4), vec2(lw * 1.4), d);

    // A row is brightened by its closest approach to the attractor, and a
    // column by its own. Same rule as the canvas, one axis at a time.
    float rowLit = lit(abs(nearest.y - a.y));
    float colLit = lit(abs(nearest.x - a.x));

    float v = max(line.y * (0.12 + rowLit * 0.5),
                  line.x * (0.12 + colLit * 0.5));

    fragColor = vec4(vec3(v), 1.0);
}

void main() {
  mainImage(gl_FragColor, gl_FragCoord.xy);
}
