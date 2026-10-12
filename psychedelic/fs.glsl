#version 300 es
precision mediump float;

uniform float seconds;

in vec4 v_vert_coord;
out vec4 frag_color;

float P2(vec2 pos) {
    vec4 C = vec4(0.2111, 0.9, 0.11, 0.01);
    // return 4.0;
    // vec4 C(12, 0.2111, 2, 203.23);
    // return 3.0;
    vec4 P = vec4(pos.x*pos.x, pos.y*pos.y - pos.y*pos.y, pos.x-pos.y, pos.y);
    return dot(C, P);
    // return C.x*pos.x**2 + (C.x+C.y)*pos.y**2 + C.z*C.w*pos.x*pos.y + C.w*pos.y;
}

void main () {
    vec2 vc = v_vert_coord.xy;
    float p1 = P2(vc);
    float p2 = P2(vc.yx);


    float time_scale = 100.0;
    float iscale = 0.70;
    float c1 = p1*sin(p1*2.1*time_scale*tan(seconds*iscale));
    float c2 = 0.4-(p2*cos(p2*3.0*time_scale*cos(seconds*0.678*iscale)));
    float c3 = cos(vc.x*10.0*sin(P2(vec2(vc.x-vc.y, 7.0*sin(seconds*10.0)))))*0.5+0.5;

    // c1 = vc.x;
    // c2 = vc.y;

    vec3 COL1 = vec3(1, 0.373, 0.01);
    vec3 COL2 = vec3(0.9, 0.173, 0.373);
    vec3 COL3 = vec3(0.075,0.16,0.292)*3.0;



    frag_color = vec4(0,0,0, 1);
    frag_color.rgb = c1*COL1 + c2*COL2 + c3*COL3;
}