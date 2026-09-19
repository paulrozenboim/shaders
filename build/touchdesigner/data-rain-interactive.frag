// Interactive Data Rain
// Paul Rozenboim — unapaulogetic.art
// Original: shadertoy.com/view/Wc3czs
// Free to use. A credit is welcome and not required.
// --- TouchDesigner setup ----------------------------------------------
// Drop this in a GLSL TOP, then on the TOP's Vectors page add:
//     uTime   float   ->  absTime.seconds        (or a Speed CHOP)
//     uMouse  vec4    ->  x,y from a Mouse In CHOP, normalised 0..1
//                         z,w can stay 0
// Nothing else needs changing.
// ----------------------------------------------------------------------
out vec4 fragColor;

uniform float uTime;
uniform vec4  uMouse;

#define iTime uTime
#define iResolution vec3(uTDOutputInfo.res.zw, 1.0)
#define iMouse (uMouse * vec4(uTDOutputInfo.res.zw, 1.0, 1.0))
#define iFrame int(uTime * 60.0)

// --- Utility Functions ---

// 2D Hash function for pseudo-random randomness
float hash(vec2 p) {
    p  = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * (p.x + p.y));
}

// Helper function to calculate the data mask for a given integer row/column ID (p_id) 
// and the pixel position inside the block (uv_in_block).
float get_row_mask_value(vec2 p_id, vec2 uv_in_block) {
    // 5. Density control (30% chance for a cell to contain data)
    if (hash(p_id) < 0.7) { return 0.0; }

    // 6. Determine random length and position of the horizontal segment
    float rand_len = hash(p_id + vec2(1.0)) * 0.8 + 0.05; 
    float rand_pos = hash(p_id + vec2(2.0)) * (1.0 - rand_len); 

    // 7. Draw the segment horizontally and vertically
    float x_mask = step(rand_pos, uv_in_block.x) * step(uv_in_block.x, rand_pos + rand_len);
    
    // v_mask uses the Y coordinate inside the block. 
    float v_mask = step(0.1, uv_in_block.y) * step(uv_in_block.y, 0.9); 
    
    return x_mask * v_mask;
}


// Function to generate the horizontal segment data mask (Seamless Scroll)
float get_data_mask(vec2 uv, float base_speed, float u_time, float grid_scale_x) {
    
    // 1. Apply Dynamic Grid Scale (X-axis width control, Y-axis kept constant)
    float grid_scale_y = 80.0;
    vec2 grid_uv = uv * vec2(grid_scale_x, grid_scale_y);
    
    float column_id = floor(grid_uv.x);

    // 2. Column Parallax Speed Variation (based on column ID)
    float column_rand_seed = hash(vec2(column_id, 0.0)) * 0.7; 
    float column_rand_speed = column_rand_seed + 0.3; 
    float column_speed = base_speed * column_rand_speed;

    // 3. Apply scrolling 
    vec2 grid_uv_scrolled = grid_uv;
    grid_uv_scrolled.y += u_time * column_speed; 
    
    // --- Seamless Blending Logic ---
    vec2 p0_id = floor(grid_uv_scrolled); 
    float f = fract(grid_uv_scrolled.y);  

    // Mask 0: Current row
    vec2 uv_in_block0 = vec2(fract(grid_uv_scrolled.x), f);
    float mask0 = get_row_mask_value(p0_id, uv_in_block0);

    // Mask 1: Next row sliding in
    vec2 p1_id = p0_id + vec2(0.0, 1.0);
    vec2 uv_in_block1 = vec2(fract(grid_uv_scrolled.x), f - 1.0);
    float mask1 = get_row_mask_value(p1_id, uv_in_block1);
    
    return max(mask0, mask1); 
}


// --- Main ShaderToy Entry Point ---
void mainImage(out vec4 fragColor, in vec2 fragCoord)
{
    float u_time = iTime;
    
    // Normalized continuous mouse input (0.0 to 1.0)
    float u_mouse_x = iMouse.x / iResolution.x;
    float u_mouse_y = iMouse.y / iResolution.y;

    // UV coordinates
    vec2 frag_uv = fragCoord.xy / iResolution.xy;
    vec2 uv = frag_uv;
    
    // =================================================================
    // 1. CONTROL MAPPING (Adjust these constants for easier speed control)
    // =================================================================
    
    // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
    // CHANGE THESE TWO VALUES TO EASILY CONTROL THE SCROLL SPEED RANGE:
    const float MIN_SPEED = 10.0; // The speed when mouse is fully on the left (0.0)
    const float SPEED_RANGE = 20.0; // The difference between max and min speed (Max Speed = 0.5 + 2.0 = 2.5)
    // <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<


    // Control 1: Base speed controlled by mouse X (slow to fast)
    float base_speed = MIN_SPEED + u_mouse_x * SPEED_RANGE; 
    
    // Control 2: Column Width controlled by mouse Y (thin to wide)
    // Range: 30.0 (wide) to 130.0 (thin)
    float grid_scale_x = 20.0 + (1.0 - u_mouse_y) * 100.0; 

    // =================================================================
    // 2. DATA STREAM GENERATION (No Glitch)
    // =================================================================
    
    float data_mask = get_data_mask(uv, base_speed, u_time, grid_scale_x);
    
    // =================================================================
    // 3. FINAL COLOR (Pure Black & White)
    // =================================================================
    
    // Output the final grayscale color
    fragColor = vec4(vec3(data_mask), 1.0);
}

void main() {
  vec4 color;
  mainImage(color, gl_FragCoord.xy);
  fragColor = TDOutputSwizzle(color);
}
