#version 300 es
precision mediump float;

uniform vec3 u_lightPos;
uniform vec3 u_camPos;
uniform sampler2D u_texture;

in vec3 v_pos;
in vec3 v_normal;
in vec2 v_texCoord;
out vec4 frag_color;

void main () {

    // vec2 texCoord = v_pos.xy*0.5 + 0.5; // Impromptu, since our world coordinates *are* just [-1,1], [-1, 1]

    // float spec_frac = 0.6;
    float diff_frac = 1.0;

    // Terminology referencing https://cs418.cs.illinois.edu/website/text/lighting.html

    vec3 to_light = u_lightPos - v_pos;
    vec3 l = normalize(to_light);
    vec3 e = normalize(u_camPos - v_pos);
    vec3 n = normalize(v_normal);

    // if (dot(e, n) > 0.0) discard;

    //// Diffuse ////
    // vec3 diffuse_color = vec3(0.8, 0.6, 0.4);
    // vec3 diffuse_color = vec3(v_texCoord, 0.6);
    vec3 diffuse_color = texture(u_texture, v_texCoord).rgb;
    to_light /= length(to_light);
    float len = length(v_normal);
    float k = 0.9;
    float ld = max(pow(-dot(l, n), k)*pow(-dot(e, n), 1.0-k), 0.0);

    vec3 diffuse = ld*diffuse_color;


    
    frag_color = vec4(diff_frac*diffuse, 1);
    // frag_color = vec4(1);


    // frag_color = vec4(1.0-l, -l, l, 1);
    // frag_color = vec4(v_normal, 1);


    // vec3 norm_color = v_normal * vec3(0.5) + vec3(0.5);
    // frag_color = vec4(norm_color.rg, u_lightPos.z, 1);
}