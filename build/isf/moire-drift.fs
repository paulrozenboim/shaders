/*{
  "DESCRIPTION": "Two line gratings turning against each other. Everything you see is the beat between them.",
  "CREDIT": "Paul Rozenboim — unapaulogetic.art",
  "CATEGORIES": [
    "Generator",
    "moire",
    "lines",
    "interference",
    "opticalillusion"
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

// Moire Drift
// Paul Rozenboim — unapaulogetic.art
// Free to use. A credit is welcome and not required.
#define iTime TIME
#define iResolution vec3(RENDERSIZE, 1.0)
#define iMouse vec4(mouse * RENDERSIZE, 0.0, 0.0)
#define iFrame int(TIME * 60.0)

// MOIRE DRIFT
// Two line gratings turning slowly against each other. Neither one is worth
// looking at on its own. Everything you see is the beat between them - the
// same thing that happens when two window screens overlap.
//
// Pointer: x opens the angle between the gratings, y sets how fine they are.
// It drifts on its own if nothing touches it, so it works unattended.

#define TAU 6.28318530718

// Parallel bars running at `angle`, `freq` of them across the frame.
//
// A cosine rather than a hard edge, and that is deliberate. A square wave
// this fine turns to mud the moment it is minified or projected off-axis,
// and fixing that properly needs fwidth, which means an extension directive
// that WebGL1 does not have by default. A smooth profile costs nothing,
// needs no extension, and is the same shader in all four hosts.
float grating(vec2 p, float angle, float freq, float sharp) {
    float s = sin(angle), c = cos(angle);
    float y = p.x * s + p.y * c;
    float bar = 0.5 + 0.5 * cos(y * freq * TAU);
    return pow(bar, sharp);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    // Centred and square, so turning the gratings does not stretch them.
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;

    // Zero when nothing has touched it, which is also the state a GLSL TOP
    // starts in. Both defaults have to look right, so the numbers below are
    // chosen to be good at 0 rather than good at 0.5.
    float mx = iMouse.x / iResolution.x;
    float my = iMouse.y / iResolution.y;

    float turn  = iTime * 0.035;          // both gratings, together
    float freq  = 26.0 + my * 44.0;

    // The angle between them is the whole shader, and it wants to be tiny.
    // The moire period goes roughly as pitch / angle, so a quarter radian
    // gives a fine crosshatch and a hundredth gives bands a foot across on
    // a wall. First version had it ten times too wide and looked like
    // window mesh. It also breathes on its own, so the unattended state
    // travels between the two rather than sitting on one.
    float breathe = 0.5 + 0.5 * sin(iTime * 0.08);
    float split   = 0.008 + mx * 0.085 + breathe * 0.028;

    float a = grating(uv, turn - split, freq, 1.6);
    float b = grating(uv, turn + split, freq, 1.6);

    // The product carries both the fine bars and the slow difference
    // frequency underneath them. The threshold is what pulls that second
    // one forward: without it the moire is there but grey and polite.
    float m = smoothstep(0.16, 0.44, a * b);

    fragColor = vec4(vec3(m), 1.0);
}

void main() {
  mainImage(gl_FragColor, gl_FragCoord.xy);
}
