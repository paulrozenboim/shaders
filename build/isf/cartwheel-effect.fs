/*{
  "DESCRIPTION": "The famous Wagon Cartwheel Effect with lines",
  "CREDIT": "Paul Rozenboim — unapaulogetic.art",
  "CATEGORIES": [
    "Generator",
    "lines",
    "opticalillusion",
    "motion",
    "cartwheel"
  ],
  "INPUTS": []
}*/

// Cartwheel Effect
// Paul Rozenboim — unapaulogetic.art
// Original: shadertoy.com/view/Wfcyzs
// Free to use. A credit is welcome and not required.
#define iTime TIME
#define iResolution vec3(RENDERSIZE, 1.0)
#define iMouse vec4(0.0)
#define iFrame int(TIME * 60.0)

// WAGON WHEEL EFFECT GENERATOR
// --------------------------------------------------------
// Adjust these parameters to change the nature of the illusion

#define ROWS 10.0           // How many rows fit in half the screen height
#define LINE_DENSITY 20.0   // How many vertical lines appear across the width
#define BASE_SPEED 0.05      // Speed of the center row
#define SPEED_EXP 1.4       // How much faster each subsequent row gets (Exponential)
#define LINE_WIDTH 0.25      // Thickness of the white lines (0.0 to 1.0)

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    // 1. Normalize coordinates
    // Center the UVs so (0,0) is in the middle of the screen
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;

    // 2. Define Row Geometry
    // We take the absolute value of Y to create the mirroring effect
    // (Bottom mirrors Top).
    // floor() creates the discrete "steps" or rows.
    float rowIndex = floor(abs(uv.y) * ROWS * 2.0);
    
    // 3. Calculate Exponential Speed
    // Logic: Speed = Base * (Multiplier ^ RowIndex)
    // The center (index 0) moves at BASE_SPEED.
    // The edges move significantly faster.
    float speed = BASE_SPEED * pow(SPEED_EXP, rowIndex);
    
    // 4. Create the Movement
    // We add time * speed to the x-coordinate to simulate motion.
    float xPos = uv.x + iTime * speed;
    
    // 5. Draw the Vertical Lines
    // fract() repeats the pattern from 0.0 to 1.0
    // step() turns it into sharp black and white bars
    float pattern = fract(xPos * LINE_DENSITY);
    float bars = step(1.0 - LINE_WIDTH, pattern);
    
    // 6. Visual Cleanup: Row Separators
    // This adds a small black line between rows so you can see them clearly
    float rowLocalY = fract(abs(uv.y) * ROWS * 2.0);
    float separator = smoothstep(0.0, 0.1, rowLocalY) * smoothstep(1.0, 0.9, rowLocalY);
    
    // 7. Output
    // Combine bars and separators
    vec3 color = vec3(bars * separator);
    
    fragColor = vec4(color, 1.0);
}

void main() {
  mainImage(gl_FragColor, gl_FragCoord.xy);
}
