#version 300 es
precision mediump float;

uniform mat4 proj;

layout(location=0) in vec4 a_position;


void main() {

  gl_Position = proj*a_position;
  gl_PointSize = 4.0;
}