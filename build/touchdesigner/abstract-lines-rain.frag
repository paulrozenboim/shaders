// Abstract Lines Rain
// Paul Rozenboim — unapaulogetic.art
// Original: shadertoy.com/view/t3GGDy
// Free to use. A credit is welcome and not required.
// --- TouchDesigner setup ----------------------------------------------
// Paste into the Pixel Shader DAT of a GLSL TOP (GLSL 3.30 or newer).
// On the TOP's Vectors page, set Uniform Name to uTime and its first
// value to absTime.seconds in Python expression mode. This drives animation.
// uMouse is unused; no mouse binding is needed.
// Set the TOP's output resolution as required. TD supplies the version line.
// ----------------------------------------------------------------------
layout(location = 0) out vec4 fragColor;

uniform float uTime;
uniform vec4  uMouse;

#define iTime uTime
#define iResolution vec3(uTDOutputInfo.res.zw, 1.0)
#define iMouse (uMouse * vec4(uTDOutputInfo.res.zw, 1.0, 1.0))
#define iFrame int(uTime * 60.0)

// Wavy flowing horizontal lines with real deformation

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);

    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));

    vec2 u = f * f * (3.0 - 2.0 * f);

    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float aspect = iResolution.x / iResolution.y;
    uv.x *= aspect;

    float numLines = 50.0;
    float lineSpacing = 1.0 / numLines;
    float thickness = 0.003; // line weight

    float lineIndex = floor(uv.y * numLines);
    float baseY = lineIndex * lineSpacing;

    // Here's the fix: deform Y based on X with noise
    float wave = noise(vec2(uv.x * 5.0, lineIndex * 0.2 + iTime * 0.8));
    float offset = (wave - 0.3) * 0.08; // center & scale

    float deformedY = baseY + offset;

    float dist = abs(uv.y - deformedY);
    float line = 1.0 - smoothstep(0.0, thickness, dist);

    fragColor = vec4(vec3(line), 1.0);
}

void main() {
  vec4 color;
  mainImage(color, gl_FragCoord.xy);
  fragColor = TDOutputSwizzle(color);
}
