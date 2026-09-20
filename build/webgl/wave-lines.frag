// Wave Lines
// Paul Rozenboim — unapaulogetic.art
// Free to use. A credit is welcome and not required.
precision highp float;

uniform vec3  iResolution;
uniform float iTime;
uniform vec4  iMouse;
uniform int   iFrame;

// WAVE LINES
// The drawing at the foot of unapaulogetic.art, as a shader.
//
// Ported from the SVG version in dist/home.js, to the same numbers: 22 lines
// across the middle band of a 1200 by 220 box, a slow drift of six units, and
// a swell of thirty-four where the pointer crosses.
//
// The swell is the point. A line does not simply rise under the pointer - it
// rises by a different amount per line, because the bulge is multiplied by a
// second wave running down the stack. That is what makes it read as a surface
// being lifted rather than twenty-two separate lines moving.
//
// Pointer: x lifts the lines. Left alone it sweeps back and forth.

#define LINES 22
#define VW 1200.0
#define VH 220.0

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    // The box on the site is preserveAspectRatio="none", so it stretches to
    // whatever it is given. Same here: no aspect correction, on purpose.
    // The y flip is because SVG counts down and gl_FragCoord counts up.
    vec2 v = vec2(fragCoord.x / iResolution.x * VW,
                  (1.0 - fragCoord.y / iResolution.y) * VH);

    float phase = iTime * 0.72;              // 0.012 a frame at 60fps

    // Untouched, the swell sweeps. Unequal periods again, so the turn at each
    // end never lands in the same place twice.
    float pointerX = VW * (0.5 + 0.42 * sin(iTime * 0.31) * cos(iTime * 0.11));
    if (iMouse.x > 1.0) pointerX = iMouse.x / iResolution.x * VW;

    // A line is 1.3 real pixels thick however tall the box is. Working in
    // virtual units without this makes the lines thicken on a big screen.
    // Not named `half`: that is a reserved word in GLSL and will not compile.
    float hw = 1.3 * VH / iResolution.y * 0.5;

    float ink = 0.0;
    for (int i = 0; i < LINES; i++) {
        float fi = float(i);

        // Sit in the middle band, leaving room above and below so a tall
        // swell cannot reach the edge and clip.
        float baseY = VH * 0.28 + fi * ((VH * 0.44) / float(LINES - 1));

        float drift = sin(v.x / 150.0 + fi * 0.28 + phase) * 6.0;

        float dx = (v.x - pointerX) / 190.0;
        float bulge = exp(-dx * dx) * 34.0;

        float y = baseY + drift + bulge * sin(fi * 0.4 + phase * 0.6);

        float d = abs(v.y - y);
        ink = max(ink, 1.0 - smoothstep(hw * 0.8, hw * 2.2, d));
    }

    fragColor = vec4(vec3(ink), 1.0);
}

void main() {
  mainImage(gl_FragColor, gl_FragCoord.xy);
}
