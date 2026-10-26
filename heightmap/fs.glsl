#version 300 es
precision mediump float;

uniform vec3 u_lightPos;
uniform vec3 u_camPos;

in vec3 v_pos;
in vec3 v_normal;
out vec4 frag_color;

// A constant array of red, green, blue
const vec3 COLORS[6] = vec3[](
    vec3(1.0, 0.0, 0.0),
    vec3(0.717, 0.717, 0.0),
    vec3(0.0, 1.0, 0.0),
    vec3(0.0, 0.717, 0.717),
    vec3(0.0, 0.0, 1.0),
    vec3(0.717, 0.0, 0.717)
);

vec3 getColor(float z) {
    int num_colors = 6;
    float loop_z = 0.03;
    float norm_z = (z+0.5) / loop_z;

    int idx = int(norm_z) % num_colors;
    float t = norm_z - floor(norm_z);

    int idx2 = idx + 1;
    idx2 = idx2 == 6 ? 0 : idx2;
    return vec3((1.0-t)*COLORS[idx] + t*COLORS[idx2]);
    // return COLORS[idx2 % num_colors];
}


void main () {

    float spec_frac = 0.6;
    float diff_frac = 1.0;

    // Terminology referencing https://cs418.cs.illinois.edu/website/text/lighting.html

    vec3 to_light = u_lightPos - v_pos;
    vec3 l = normalize(to_light);
    vec3 e = normalize(u_camPos - v_pos);
    vec3 n = normalize(v_normal);

    // if (dot(e, n) > 0.0) discard;

    //// Diffuse ////
    
    
    vec3 diffuse_color = getColor(v_pos[2]);
    // diffuse_color = vec3(0.8, 0.6, 0.4);



    
    to_light /= length(to_light);
    float len = length(v_normal);
    float k = 0.9;
    float ld = max(pow(-dot(l, n), k)*pow(-dot(e, n), 1.0-k), 0.0);

    vec3 diffuse = ld*diffuse_color;

    //// Specular (Blinn-Phong) ////
    vec3 spec_color = vec3(1.0);
    // halfway or 'reflection axis' vector
    vec3 h = normalize(l + e);
    float hardness = 18.0; 
    float ls = pow(-dot(h, n), hardness);
    vec3 specular = ls*spec_color;
    

    
    frag_color = vec4(diff_frac*diffuse + spec_frac*specular, 1);
    // frag_color = vec4(diffuse_color, 1);


    // frag_color = vec4(1.0-l, -l, l, 1);
    // frag_color = vec4(v_normal, 1);


    // vec3 norm_color = v_normal * vec3(0.5) + vec3(0.5);
    // frag_color = vec4(norm_color.rg, u_lightPos.z, 1);
}