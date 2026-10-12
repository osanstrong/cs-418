#version 300 es
uniform mat4 proj;
// layout(location=0) in vec4 a_position;
// layout(location=1) in vec4 a_test2;
layout(location=0) in vec4 a_position;
layout(location=1) in vec4 a_color;

out vec4 v_color;

void main() {
    // float rad = sqrt((float(gl_VertexID)+0.5)/float(count));
    // float ang = 2.399963229728653 * float(gl_VertexID) + seconds;
    // gl_Position = vec4(rad*cos(ang), rad*sin(ang), 0, 1);
    // gl_PointSize = 4.0;
    vec4 pos = a_position;
    // pos.xy = vec2(0.);
    // pos.z = 1.0;
    // pos.y = a_test2.x;
    v_color = a_color;

    gl_Position = proj * pos;
    gl_PointSize = 40.0;
}