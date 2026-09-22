/*{
  "ISFVSN": "2.0",
  "DESCRIPTION": "Flowing abstract lines animated by procedural noise.",
  "CREDIT": "Paul Rozenboim — unapaulogetic.art",
  "CATEGORIES": [
    "Generator",
    "lines",
    "abstract",
    "rain",
    "white",
    "black"
  ],
  "INPUTS": []
}*/

// Abstract Lines Rain
// Paul Rozenboim — unapaulogetic.art
// Original: shadertoy.com/view/t3GGDy
// Free to use. A credit is welcome and not required.
#define iTime TIME
#define iResolution vec3(RENDERSIZE, 1.0)
#define iMouse vec4(0.0)
#define iFrame int(TIME * 60.0)

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
  mainImage(gl_FragColor, gl_FragCoord.xy);
}
