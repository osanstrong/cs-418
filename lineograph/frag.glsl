#version 300 es
precision highp float;
in vec4 v_color;
out vec4 color;
void main() {
    color = vec4(1, 0.373, 0.02, 1);
    color = v_color;
}