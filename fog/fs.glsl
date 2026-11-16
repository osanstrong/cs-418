#version 300 es
precision mediump float;

uniform vec3 u_lightPos;
uniform vec3 u_camPos;
uniform vec3 u_fogColor;
uniform float u_fogFactor;

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

    //// Diffuse ////
    vec3 diffuse_color = vec3(0.8, 0.6, 0.4);
    to_light /= length(to_light);
    float len = length(v_normal);
    float k = 0.9;
    // float ld = max(pow(-dot(l, n), k)*pow(-dot(e, n), 1.0-k), 0.0);
    float ld = pow(max(-dot(l, n), 0.0), k) * pow(max(-dot(e, n), 0.0), 1.0-k);
    // ld = 1.0;

    vec3 diffuse = ld*diffuse_color;

    //// Specular (Blinn-Phong) ////
    vec3 spec_color = vec3(1.0);
    // halfway or 'reflection axis' vector
    vec3 h = normalize(l + e);
    float hardness = 18.0; 
    float ls = pow(max(-dot(h, n), 0.0), hardness);
    vec3 specular = ls*spec_color;


    //// FOG ////
    float f = u_fogFactor;
    float d = 1.0 / gl_FragCoord.w;
    float v = exp(-f*d);

    vec3 fog_color = u_fogColor;


    frag_color = vec4((diff_frac*diffuse + spec_frac*specular)*v + fog_color*(1.0-v), 1);
    // frag_color.rgb = any(isnan(v_normal))? vec3(1, 0, 0) : frag_color.rgb;
    // if (isnan(ld)) {
    //     // frag_color.rgb = vec3(1, 0, 0);
    // }
    // frag_color.rgb = u_fogColor + 0.001*diffuse_color;

}