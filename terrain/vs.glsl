#version 300 es
precision mediump float;

layout(location=0) in vec4 a_position;


void main() {

  gl_Position = a_position;
  gl_PointSize = 4.0;
}