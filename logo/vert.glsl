#version 300 es
uniform mat4 proj;
layout(position=0) in vec4 a_position;


void main() {
    // float rad = sqrt((float(gl_VertexID)+0.5)/float(count));
    // float ang = 2.399963229728653 * float(gl_VertexID) + seconds;
    // gl_Position = vec4(rad*cos(ang), rad*sin(ang), 0, 1);
    // gl_PointSize = 4.0;
    gl_Position = proj * a_position;
    gl_PointSize = 4.0;
}