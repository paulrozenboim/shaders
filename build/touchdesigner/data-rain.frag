// Data Stream Rain
// Paul Rozenboim — unapaulogetic.art
// Original: shadertoy.com/view/wfGBzh
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
    // Density control (30% chance for a cell to contain data)
    if (hash(p_id) < 0.7) { return 0.0; }

    // Determine random length and position of the horizontal segment
    float rand_len = hash(p_id + vec2(1.0)) * 0.8 + 0.05; 
    float rand_pos = hash(p_id + vec2(2.0)) * (1.0 - rand_len); 

    // Draw the segment horizontally and vertically
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
    
    // floor selects the scrolling cell; fract gives its local coordinates.
    // Segments stay within their cell, so no neighbouring-row blend is needed.
    return get_row_mask_value(floor(grid_uv_scrolled), fract(grid_uv_scrolled));
}


// --- Main ShaderToy Entry Point ---
void mainImage(out vec4 fragColor, in vec2 fragCoord)
{
    float u_time = iTime;

    // UV coordinates
    vec2 frag_uv = fragCoord.xy / iResolution.xy;
    vec2 uv = frag_uv;
    
    // =================================================================
    // 1. STATIC SETTINGS (No Interaction)
    // =================================================================
    
    // Control 1: Set the constant scroll speed
    // (Previously MIN_SPEED was 10.0, range up to 30.0)
    float FIXED_SPEED = 15.0; 
    
    // Control 2: Set the constant column density/width
    // (Higher number = thinner columns. Range approx 20.0 to 120.0)
    float FIXED_SCALE_X = 70.0; 

    // =================================================================
    // 2. DATA STREAM GENERATION
    // =================================================================
    
    float data_mask = get_data_mask(uv, FIXED_SPEED, u_time, FIXED_SCALE_X);
    
    // =================================================================
    // 3. FINAL COLOR
    // =================================================================
    
    fragColor = vec4(vec3(data_mask), 1.0);
}

void main() {
  vec4 color;
  mainImage(color, gl_FragCoord.xy);
  fragColor = TDOutputSwizzle(color);
}
