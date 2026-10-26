#version 300 es
precision mediump float;

uniform mat4 u_proj;

layout(location=0) in vec4 a_position;
layout(location=1) in vec3 a_normal;

out vec3 v_normal;
out vec3 v_pos;


void main() {

  gl_Position = u_proj*a_position;
  v_pos = a_position.xyz;
  gl_PointSize = 4.0;
  v_normal = normalize(a_normal);
}