#include "./uselibpng.h"
#include "./argparse.hpp"

#include <stdio.h>
#include <iostream>
#include <fstream>
#include <vector>
#include <span>
#include <string.h>
#include <bits/stdc++.h>


using Int8Vec = std::vector<uint8_t>;
using IntVec = std::vector<int>;
using FloatVec = std::vector<double>;

using ld = long double;
using LDVec = std::vector<ld>;

ld max(ld a, ld b) {return a > b ? a : b;}
ld min(ld a, ld b) {return a < b ? a : b;}

struct Vec2 {
  ld x, y;

  Vec2(ld x) : Vec2{x, 0} {} 
  Vec2(ld x, ld y) : x{x}, y{y} {}

  bool operator==(const Vec2& rhs) const {
    return (this->x == rhs.x) && (this->y == rhs.y);
  }

  bool operator!=(const Vec2& rhs) const {
    return !(*this == rhs);
  }

  Vec2 operator-(const Vec2& rhs) const {
    return Vec2{this->x - rhs.x, this->y - rhs.y};
  }

  Vec2 operator+(const Vec2& rhs) const {
    return Vec2{this->x + rhs.x, this->y + rhs.y};
  }

  Vec2 operator*(ld rhs) const {
    return Vec2{this->x * rhs, this->y * rhs};
  }

  Vec2 operator/(ld rhs) const {
    return Vec2{this->x / rhs, this->y / rhs}; // yes precision breaking but im lazy
  }

  void operator+=(const Vec2& rhs) {
    this->x += rhs.x;
    this->y += rhs.y;
  }

  std::string to_str() {
    return "< " + std::to_string(this->x) + ", " + std::to_string(this->y) + " >";
  }
};

struct Vec4 {
  ld x, y, z, w;

  Vec4(ld x) : Vec4{x, 0} {} 
  Vec4(ld x, ld y) : Vec4{x, y, 0} {}
  Vec4(ld x, ld y, ld z) : Vec4{x, y, z, 1} {}
  Vec4(ld x, ld y, ld z, ld w) : x{x}, y{y}, z{z}, w{w} {}

  Vec2 viewport(ld width, ld height) const {
    return Vec2{(x/w + 1) * (width/2), (y/w + 1) * (height/2)};
  }
};

Vec2 maxy(const Vec2& a, const Vec2& b) {
  if (a.y > b.y) return a; else return b;
}

Vec2 miny(const Vec2& a, const Vec2& b) {
  if (a.y < b.y) return a; else return b;
}

struct Context {
  
  // Position / color buffers
  Int8Vec color_buffer; //linear 0-1, not sRGB
  int color_size; // Either 3 or 4
  LDVec pos_buffer;
  int pos_size; // Either 2, 3, or 4
  FloatVec tc_buffer; //texture coords, always size 2
  FloatVec ps_buffer; //Point size


  // State Flags
  bool depth_enabled = false;
  bool sRGB_convert = false;
  bool hyp_interp = false;
  int fsaa_mode = 1;
  bool cull_backface = false;
  bool decals = false; // debug to include vertex colors behind transparent texture samples
  bool frustum_clipping = false; 

  // Uniforms
  std::string filename;
  Image img;

  // Constructor 
  Context(int width, int height) : img(Image(width, height)) {}

  // Methods
  void push_pixel(int x, int y, const pixel_t& color) {
    img[y][x] = color;
  }

  void dda_white(const Vec2& a, const Vec2& b) {
    // Just dda in y for now
    Vec2 top = miny(a, b);
    Vec2 bot = maxy(a, b);
    if (top.y == bot.y) return;

    Vec2 del = bot - top;
    Vec2 s = del / del.y; // Delta scaled to unit y
    ld e = ceil(top.y) - top.y; // To first integer
    Vec2 o = s * e;

    Vec2 p = top + o;
    pixel_t white{255, 255, 255, 255};
    while (p.y < bot.y) {
      push_pixel(int(p.x), int(p.y), white);
      p += s;
    }
  }

  void row_white(ld ax, ld bx, int y) {
    ld left = min(ax, bx);
    ld right = max(ax, bx);
    printf("Row at y=%d from %Lf to %Lf\n", y, left, right);
    int x = ceil(left);
    pixel_t white{255, 255, 255, 255};
    // printf(" -> pushing at x of ");
    while (x < right) {
      push_pixel(x, y, white);
      // printf("%d, ", x);
      x++;
    }
    // printf("\n");
  }

  void scan_white(const Vec4& aw, const Vec4& bw, const Vec4& cw) {
    int width = img.width(), height = img.height();
    Vec2 av = aw.viewport(width, height);
    Vec2 bv = bw.viewport(width, height);
    Vec2 cv = cw.viewport(width, height);

    Vec2 t = miny(av, miny(bv, cv));
    Vec2 b = maxy(av, maxy(bv, cv));
    Vec2 m = (t != av && b != av)? av : ((t != bv && b != bv)? bv: cv);

    printf("a, b, c: \n - %s\n - %s\n - %s\n", av.to_str().c_str(), bv.to_str().c_str(), cv.to_str().c_str());
    printf("t, m, b: \n - %s\n - %s\n - %s\n", t.to_str().c_str(), m.to_str().c_str(), b.to_str().c_str());

    // dda_white(t, b);
    // dda_white(t, m);
    // dda_white(m, b);

    pixel_t white{255, 255, 255, 255};

    if (t.y == b.y) return;
    Vec2 del_b = b - t;
    Vec2 s_b = del_b / del_b.y;
    ld e = ceil(t.y) - t.y;
    Vec2 o_b = s_b * e;
    Vec2 p_b = t + o_b;

    Vec2 del_m = m - t;
    Vec2 s_m = del_m / del_m.y;
    Vec2 o_m = s_m * e;
    Vec2 p_m = t + o_m;

    while (p_m.y < m.y) {
      row_white(p_m.x, p_b.x, p_m.y);
      p_m += s_m;
      p_b += s_b;
    }
    del_m = b - m;
    s_m = del_m / del_m.y;
    e = ceil(m.y) - m.y;
    o_m = s_m * e;
    p_m = m + o_m;
    
    while (p_m.y < b.y) {
      row_white(p_m.x, p_b.x, p_m.y);
      p_m += s_m;
      p_b += s_b;
    }
    
  }
};

int main(int argc, char* argv[]) {

  if (argc < 2) {
    // No path argument
    return 1;
  }


  char* filepath = argv[1];
  StringVec raw_commands = get_lines(filepath);
  CommandVec commands = get_commands(filepath);


  // Read output info
  Command imgdef = commands.front(); // Assume first command is initializing the image
  Context gl{std::stoi(imgdef[1]), std::stoi(imgdef[2])};
  gl.filename = imgdef[3];

  // for (int i = 0; i < commands.size(); i++) {
  //   auto raw = raw_commands[i];
  //   if (raw.empty()) continue;
  //   printf("> '%s'\n", raw.c_str());
  // }

  for (int i = 1; i < commands.size(); i++) {
    Command cmd = commands[i];
    std::string raw_command = raw_commands[i];
    if (raw_command.empty()) continue;


    // printf("Running command '%s' with %lu args\n", cmd[0].c_str(), cmd.size()-1);
    std::cout << "==========" << std::endl << raw_command << std::endl;
    printf("Running command: '%s'\n", raw_command.c_str());
    
    std::string name = cmd[0];

    switch (hash(name)) {
      case "#"_hash:{
        printf("Note: %s\n", raw_command.c_str());
      break;}
      case "png"_hash:{
        std::cerr << "command 'png' should only be used at start of file";
        break;}
      case "position"_hash:{
        gl.pos_buffer.clear();
        gl.pos_size = std::stoi(cmd[1]);
        for (int i = 2; i < cmd.size(); i++) gl.pos_buffer.push_back(std::stold(cmd[i]));
        break;}
      case "color"_hash:{
        gl.color_buffer.clear();
        gl.color_size = std::stoi(cmd[1]);
        for (int i = 2; i < cmd.size(); i++) gl.color_buffer.push_back(std::stoi(cmd[i]));
        break;}
      case "drawPixels"_hash:{
        printf("Running draw pixel command with buffers of size %lu, %lu into image of dims %d, %d\n", gl.pos_buffer.size(), gl.color_buffer.size(), gl.img.width(), gl.img.height());
        int num_pixels = std::stoi(cmd[1]);
        for (int i = 0; i < num_pixels; i++) {
          printf("Pushing pixel %d of %d\n", i, num_pixels);
          int x = gl.pos_buffer[i*2+0], y = gl.pos_buffer[i*2+1];
          // Image& img = gl.img;
          Int8Vec& cb = gl.color_buffer;
          int i4 = i*4;
          gl.push_pixel(x, y, {cb[i4], cb[i4+1], cb[i4+2], cb[i4+3]});
        } 
        break;}
      case "drawArraysTriangles"_hash:{
        int start = std::stoi(cmd[1]);
        int num_tri = std::stoi(cmd[2]) / 3; // Assume multiple of 3 indices given
        for (int t = 0; t < num_tri; t++) {
          auto read_pos = [](LDVec pb, int i, int size) {
            if (size == 2)
              return Vec4{pb[i], pb[i+1]};
            else if (size == 3)
              return Vec4{pb[i], pb[i+1], pb[i+2]};
            else // if (size == 4)
              return Vec4{pb[i], pb[i+1], pb[i+2], pb[i+3]};
          };

          LDVec& pb = gl.pos_buffer;
          // printf("Position buffer: [");
          // for (ld p : pb) printf("\t%Le,\n", p);
          // printf("]\n");
          int psz = gl.pos_size;
          int ai = (start + t*3)*psz;
          int bi = ai + psz;
          int ci = bi + psz;
          // printf("Indexing into position array of size %d at indices %d, %d, %d\n", pb.size(), ai, bi, ci);
          Vec4 a = read_pos(pb, ai, psz);
          Vec4 b = read_pos(pb, bi, psz);
          Vec4 c = read_pos(pb, ci, psz);

          gl.scan_white(a, b, c);
        }
      break;}
      default:
        printf("Unknown action: %s\n", name.c_str());
    }
  }


  gl.img.save(gl.filename.c_str());
  printf("Image saved with dims %d by %d to output %s \n", gl.img.width(), gl.img.height(), gl.filename.c_str());
}

