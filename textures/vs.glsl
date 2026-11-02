#version 300 es
precision mediump float;

uniform mat4 u_proj;
uniform vec4 u_color;

layout(location=0) in vec4 a_position;
layout(location=1) in vec3 a_normal;

out vec3 v_normal;
out vec3 v_pos;
out vec4 v_color;

void main() {

  gl_Position = u_proj*a_position;
  v_pos = a_position.xyz;
  v_color = u_color;
  gl_PointSize = 4.0;
  v_normal = normalize(a_normal);
}