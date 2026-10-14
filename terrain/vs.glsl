#version 300 es
precision mediump float;

out vec4 v_vert_coord;

void main() {
  int v = gl_VertexID;
  float x = v==0||v>3 ? -1.0 : 1.0;
  float y = v==5||v<2 ? -1.0 : 1.0;
  gl_Position = vec4(x, y, 0, 1);
  v_vert_coord = gl_Position;
}