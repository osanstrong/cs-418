#version 300 es
precision mediump float;

uniform vec3 u_lightPos;
uniform vec3 u_camPos;

in vec3 v_pos;
in vec3 v_normal;
out vec4 frag_color;

void main () {

    float spec_frac = 0.6;
    float diff_frac = 1.0;

    // Terminology referencing https://cs418.cs.illinois.edu/website/text/lighting.html

    vec3 to_light = u_lightPos - v_pos;
    vec3 l = normalize(to_light);
    vec3 e = normalize(u_camPos - v_pos);
    vec3 n = normalize(v_normal);

    // if (dot(e, n) > 0.0) discard;

    float cliff_thresh = -0.9;

    //// Diffuse ////
    vec3 green = vec3(0.2, 0.6, 0.1);
    vec3 red = vec3(0.6, 0.3, 0.3);
    vec3 diffuse_color = v_normal.z < cliff_thresh? green : red;
    to_light /= length(to_light);
    float len = length(v_normal);
    float k =  0.9;
    float ld = max(pow(-dot(l, n), k)*pow(-dot(e, n), 1.0-k), 0.0);

    vec3 diffuse = ld*diffuse_color;

    //// Specular (Blinn-Phong) ////
    vec3 spec_color = vec3(1.0);
    // halfway or 'reflection axis' vector
    vec3 h = normalize(l + e);
    float hardness =  v_normal.z < cliff_thresh ? 58.0 : 4.0; 
    float ls = pow(-dot(h, n), hardness);
    vec3 specular = ls*spec_color * (v_normal.z < cliff_thresh? 1.0 : 0.2);
    

    
    frag_color = vec4(diff_frac*diffuse + spec_frac*specular, 1);


    // frag_color = vec4(1.0-l, -l, l, 1);
    // frag_color = vec4(v_normal, 1);


    // vec3 norm_color = v_normal * vec3(0.5) + vec3(0.5);
    // frag_color = vec4(norm_color.rg, u_lightPos.z, 1);
}