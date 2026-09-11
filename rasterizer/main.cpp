#include "./uselibpng.h"
#include "./argparse.hpp"

#include <stdio.h>
#include <iostream>
#include <fstream>
#include <vector>
#include <array>
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
ld clamp(ld val, ld hi, ld lo) {
  return max(lo, min(val, hi));
}

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

#define PIX_SIZE 10
typedef union {
  ld p[PIX_SIZE];
  struct {
    ld x, y, z, w, r, g, b, a, s, t;
  };
} PixVec;

PixVec pix_p4c3(Vec4 xyzw, ld r, ld g, ld b) {
  auto [x, y, z, w] = xyzw;
  return PixVec{x, y, z, w, r, g, b, 1, 0, 0};
}

PixVec operator+(const PixVec& lhs, const PixVec& rhs) {
  PixVec target{};
  for (int i = 0; i < PIX_SIZE; i++) target.p[i] = lhs.p[i] + rhs.p[i];
  return target;
}

PixVec& operator+=(PixVec& lhs, const PixVec& rhs) {
  for (int i = i; i < PIX_SIZE; i++) lhs.p[i] += rhs.p[i];
  return lhs;
}

PixVec operator-(const PixVec& lhs, const PixVec& rhs) {
  PixVec target{};
  for (int i = 0; i < PIX_SIZE; i++) target.p[i] = lhs.p[i] - rhs.p[i];
  return target;
}

PixVec operator/(const PixVec& lhs, ld rhs) {
  PixVec target{};
  for (int i = 0; i < PIX_SIZE; i++) target.p[i] = lhs.p[i] / rhs;
  return target;
}

PixVec operator*(const PixVec& lhs, ld rhs) {
  PixVec target{};
  for (int i = 0; i < PIX_SIZE; i++) target.p[i] = lhs.p[i] * rhs;
  return target;
}

bool operator==(const PixVec& lhs, const PixVec& rhs) {
  for (int i = 0; i < PIX_SIZE; i++) {
    if (lhs.p[i] != rhs.p[i]) return false;
  }
  return true;
}

bool operator!=(const PixVec& lhs, const PixVec& rhs) { return !(lhs == rhs); }

ld cross2d(PixVec a, PixVec b) {
  return a.x*b.y - a.y*b.x;
}

// PixVec which minimize/maximize the target component
PixVec argmax(const PixVec& a, const PixVec& b, int i) {
  if (a.p[i] > b.p[i]) return a; else return b;
}
PixVec argmin(const PixVec& a, const PixVec& b, int i) {
  if (a.p[i] < b.p[i]) return a; else return b;
}
PixVec maxx(const PixVec& a, const PixVec& b) {return argmax(a, b, 0);}
PixVec minx(const PixVec& a, const PixVec& b) {return argmin(a, b, 0);}
PixVec maxy(const PixVec& a, const PixVec& b) {return argmax(a, b, 1);}
PixVec miny(const PixVec& a, const PixVec& b) {return argmin(a, b, 1);}

std::string pv_to_s(const PixVec& val) {
  std::string result = "< ";
  for (int i = 0; i < PIX_SIZE-1; i++) result += std::to_string(val.p[i]) + ", ";
  result += std::to_string(val.p[PIX_SIZE-1]) + " >";
  return result;
}

// Blend b on top of a, both rgba 8888 bit
pixel_t alpha_blend(pixel_t dst, pixel_t src) {
  pixel_t res;
  ld src_a = ld(src.a) / 255.0;
  ld dst_a = ld(dst.a) / 255.0;

  ld res_a = src_a + dst_a*(1-src_a);
  // printf("Using src opacity: %Le, from 8-bit value %d\n", t, b.a);
  for (int i = 0; i < 3; i++) {
    res.p[i] = uint8_t(
      (src_a/res_a)*src.p[i] + ((1-src_a)*dst_a/res_a)*dst.p[i]
    );
    // printf(" - %d: went %Le from %d to %d, ending at %d\n", i, t, a.p[i], b.p[i], res.p[i]);
  }
  res.a = uint8_t(res_a*255);
  return res;
}

ld lin_to_sRGB(ld lin_val) {
  // TODO: Can't tell if my correction is just off slihtly or there's a fundamental flaw
  ld threshold = 0.0031308;
  ld gamma = 2.4;

  if (lin_val <= threshold) return lin_val * 12.92;
  return 1.055 * pow(lin_val, 1/gamma) - 0.055;
}

ld lin_to_sRGB_old(ld lin_val) {
  return pow(lin_val, 1/2.2);
}

ld sRGB_to_lin(ld sRGB_val) {
  ld threshold = 0.04045;
  ld gamma = 2.4;

  if (sRGB_val <= threshold) return sRGB_val / 12.92;
  return pow((sRGB_val + 0.055) / 1.055, gamma);
}

ld sRGB_to_lin_old(ld sRGB_val) {
  return pow(sRGB_val, 2.2);
}

// Convert float between 0 and 1 to 8 bit color val
uint8_t ftobyte(ld float_val) {
  return uint8_t(float_val * 255.0);
}


struct Context {
  
  //// Position / color buffers
  LDVec color_buffer; //linear 0-1, not sRGB
  int color_size; // Either 3 or 4
  LDVec pos_buffer;
  int pos_size; // Either 2, 3, or 4
  IntVec element_buffer; // Indices of elements to draw
  FloatVec tc_buffer; //texture coords, always size 2
  FloatVec ps_buffer; //Point size
  LDVec depth_buffer; //Depth at each texture coordinate


  //// State Flags
  bool depth_enabled = false;
  bool sRGB_convert = false;
  bool hyp_interp = false;
  int fsaa_mode = 1;
  bool cull_backface = false;
  bool decals = false; // debug to include vertex colors behind transparent texture samples
  bool frustum_clipping = false; 
  bool blend_alpha = false;

  int verbosity = 0; // Inverse; 0 means print everything, higher restricts to more and more important things

  //// Uniforms
  std::string filename;
  Image img;

  //// Constructor 
  Context(int width, int height) : img(Image(width, height)) {
    // Assign max depth (1)

    depth_buffer.assign(width*height, 1);
  }

  //// Methods

  // Depth data (2d, to match image)
  int tex_idx(int x, int y) {return img.width() * y + x;}

  // Print if specified level is above verbosity state
  template<typename... Args>
  void cprintf(int level, const char *__restrict__ __format, Args&&... args) {
    if (level >= this->verbosity) printf(__format, std::forward<Args>(args)...);
  }

  template<typename... Args>
  void cprintf(const char *__restrict__ __format, Args&&... args) {
    cprintf(0, __format, std::forward<Args>(args)...);
  }

  // Assumes positions have already been divided by w
  PixVec viewport(PixVec divw_pix) {
    PixVec ported{divw_pix};
    ported.x = (ported.x+1) * (img.width() / 2.0);
    ported.y = (ported.y+1) * (img.height() / 2.0);
    return ported;
  }

  // Divide by w except for w, which becomes the reciprocal
  PixVec div_w(const PixVec& pre_div) {
    PixVec target = pre_div / pre_div.w;
    target.w = 1 / pre_div.w;
    if (!hyp_interp) for (int i = 4; i < PIX_SIZE; i++) target.p[i] = pre_div.p[i]; // Only w-correct if they ask for it
    return target;
  }

  // Divide by (1/w), only applies to non-position parts
  PixVec undiv_w(const PixVec& post_div) {
    PixVec target = div_w(post_div);
    for (int i = 0; i < 3; i++) target.p[i] = post_div.p[i];
    if (!hyp_interp) for (int i = 4; i < PIX_SIZE; i++) target.p[i] = post_div.p[i];
    return target;
  }



  void push_pixel(int x, int y, const pixel_t& color) {
    img[y][x] = color;
  }
  // Equivalent of fragment logic; assumes pixel is fully undivided by w
  void push_pixel(PixVec pixel) {
    auto [x, y, z, w, r, g, b, a, s, t] = pixel.p;
    int xi = int(x);
    int yi = int(y);
  
    if (!(
      xi >= 0 && xi < img.width() &&
      yi >= 0 && yi < img.height()
    )) {
      cprintf("Pixel at [%d, %d] rejected for exceeding bounds [%d, %d]!\n", xi, yi, img.width(), img.height());
      return;
    }

    if (depth_enabled) {
      int di = tex_idx(x, y);
      cprintf("Old depth: %Le\n", depth_buffer.at(di));
      ld old_z(depth_buffer.at(di));
    
      if (z > old_z) {
        cprintf("Pixel at depth z=%Le rejected for being behind depth z=%Le\n", z, old_z);
        return;
      } else {
        depth_buffer.at(di) = z;
      }
    }

    cprintf("Pushing pixel at [%d, %d, %Le] from: %s \n", xi, yi, z, pv_to_s(pixel).c_str());
    pixel_t new_pix{ftobyte(r), ftobyte(g), ftobyte(b), ftobyte(a)};
    
    if (blend_alpha) {
      pixel_t old_pix = img[int(y)][int(x)];
      img[int(y)][int(x)] = alpha_blend(old_pix, new_pix);
    } else {
      img[int(y)][int(x)] = new_pix;
    }
  }
  
  // Assumes points a and b share the same y; Assumes in 1/w space
  void push_row(PixVec a, PixVec b) {
    PixVec left = argmin(a, b, 0);
    PixVec right = argmax(a, b, 0);
    // int y = a.y;
    PixVec left_w = undiv_w(left), right_w = undiv_w(right);

    // TODO: This suggests we have an interpolation error ughhhhh
    // fml their interpolation looks uh linear over color not hyperbolic
    cprintf("Row at y=%Lf or %Lf from %Lf (%Lf) to %Lf (%Lf)\n", a.y, b.y, left.x, (left_w.r), right.x, (right_w.r));
    PixVec del = right - left;
    PixVec s = del / del.x;

    ld e = ceil(left.x) - left.x;
    PixVec o = s * e;
    PixVec p = left + o;
    while (p.x < right.x) {
      PixVec undiv = undiv_w(p);
      push_pixel(undiv);
      p = p + s;
    }
  }

  // Assumes a, b, and c have not been w-divided yet
  void scan(const PixVec& a_undiv, const PixVec& b_undiv, const PixVec& c_undiv) {
    PixVec av = viewport(div_w(a_undiv));
    PixVec bv = viewport(div_w(b_undiv));
    PixVec cv = viewport(div_w(c_undiv));

    if (cull_backface && cross2d(bv-av, bv-cv) <= 0) {
      cprintf("Backface triangle rejected");
      return;
    } 
    
    PixVec t = miny(av, miny(bv, cv));
    PixVec b = maxy(av, maxy(bv, cv));
    PixVec m = (t != av && b != av)? av : ((t != bv && b != bv)? bv: cv);


    
    
    if (t.y == b.y) return;
    PixVec del_b = b - t;
    PixVec s_b = del_b / del_b.y;
    ld e = ceil(t.y) - t.y;
    PixVec o_b = s_b * e;
    PixVec p_b = t + o_b;

    PixVec del_m = m - t;
    PixVec s_m = del_m / del_m.y;
    PixVec o_m = s_m * e;
    PixVec p_m = t + o_m;
    cprintf("Initialized DDA sweep\n");

    while (p_m.y < m.y) {
      cprintf("Pushing a row!\n");
      push_row(p_m, p_b);
      p_m += s_m;
      p_b = p_b + s_b;
    }
    del_m = b - m;
    s_m = del_m / del_m.y;
    e = ceil(m.y) - m.y;
    o_m = s_m * e;
    p_m = m + o_m;
    
    while (p_m.y < b.y) {
      cprintf("Pushing a row!\n");
      push_row(p_m, p_b);
      p_m += s_m;
      p_b = p_b + s_b;
    }
    
  }

  // Draw a single triangle with information from the buffers at the corresponding indices.
  // Assumes buffers are parallel, otherwise would need multi-dimensional element buffers to use, anyways.
  void drawElementTriangle(int ai, int bi, int ci) {
    auto read_poscol = [](LDVec pb, int pi, int psz, LDVec cb, int ci, int csz) {
        PixVec result{0, 0, 0, 1, 0, 0, 0, 1, 0, 0};
        for (int i = 0; i < psz; i++) result.p[i] = pb[pi+i];
        for (int i = 0; i < csz; i++) result.p[i+4] = cb[ci+i];
        return result;
      };
    LDVec& pb = pos_buffer, cb = color_buffer;
    
    int psz = pos_size;
    int api = ai * psz;
    int bpi = bi * psz;
    int cpi = ci * psz;

    int csz = color_size;
    int aci = ai * csz;
    int bci = bi * csz;
    int cci = ci * csz;
    cprintf("Checking out indices %d, %d, %d\n -> %d, %d, %d\n -> %d, %d, %d\n", ai, bi, ci, api, bpi, cpi, aci, bci, cci);
    
    PixVec a = read_poscol(pb, api, psz, cb, aci, csz);
    PixVec b = read_poscol(pb, bpi, psz, cb, bci, csz);
    PixVec c = read_poscol(pb, cpi, psz, cb, cci, csz);
    cprintf("Scanning triangle\n - %s\n - %s\n - %s\n",
      pv_to_s(a).c_str(), 
      pv_to_s(b).c_str(), 
      pv_to_s(c).c_str());
    scan(a, b, c);
  }

  void drawArraysTriangles(int first, int num_triangles) {
    for (int t = 0; t < num_triangles; t++) {

      int psz = pos_size;
      int api = (first + t*3)*psz;
      int bpi = api + psz;
      int cpi = bpi + psz;

      int csz = color_size;
      int aci = (first + t*3)*csz;
      int bci = aci + csz;
      int cci = bci + csz;
      
      int ai = first + t*3, bi = ai + 1, ci = bi + 1;
      drawElementTriangle(ai, bi, ci);
    }
  } 

  void drawElementsTriangles(int count, int offset) {
    for (int i = offset; i < count+offset; i+=3) {
      IntVec& eb = element_buffer;

      cprintf("Looking for elements %d, %d, %d in buffer of size %d\n", i, i+1, i+2, eb.size());
      drawElementTriangle(eb[i], eb[i+1], eb[i+2]);
    }
  }

  void renderDepthMap() {
    for (int x = 0; x < img.width(); x++) {
      for (int y = 0; y < img.height(); y++) {
        int di = tex_idx(x, y);
        float depth = float(depth_buffer[di]);
        int depth_int = int(depth*255.0);
        // if (di % 5 == 0) printf("Depth: %d (from float %e)\n", int(depth_int), depth);
        img[y][x].r = depth_int;
        img[y][x].g = depth_int;
        img[y][x].b = depth_int;
        img[y][x].a = 255;
      }
    }
  }

  void convert_sRGB() {
    for (int x = 0; x < img.width(); x++) {
      for (int y = 0; y < img.height(); y++) {
        img[y][x].r = uint8_t(lin_to_sRGB(ld(img[y][x].r) / 255.0) * 255.0);
        img[y][x].g = uint8_t(lin_to_sRGB(ld(img[y][x].g) / 255.0) * 255.0);
        img[y][x].b = uint8_t(lin_to_sRGB(ld(img[y][x].b) / 255.0) * 255.0);
      }
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

  bool break_early = false;
  for (int i = 1; i < commands.size(); i++) {
    if (break_early) break;
    Command cmd = commands[i];
    std::string raw_command = raw_commands[i];
    if (raw_command.empty() || (raw_command[0] == 's' && raw_command[1] == '_')) continue;


    // printf("Running command '%s' with %lu args\n", cmd[0].c_str(), cmd.size()-1);
    std::cout << "==========" << std::endl << raw_command << std::endl;
    printf("Running command %d: '%s'\n", i, raw_command.c_str());

    // if (i > 50 && i < 70) {
    //   // Print specifically the middle triangle commands
    //   gl.verbosity = 0;
    // } else {
    //   gl.verbosity = 4;
    // }
    gl.verbosity = 0;
    gl.blend_alpha = true;

    std::string name = cmd[0];



    switch (hash(name)) {
      case "#"_hash:{
        printf("Note: %s\n", raw_command.c_str());
      break;}
      case "break"_hash:{
        break_early = true;
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
        for (int i = 2; i < cmd.size(); i++) gl.color_buffer.push_back(std::stold(cmd[i]));
        break;}
      case "elements"_hash:{
        gl.element_buffer.clear();
        for (int i = 1; i < cmd.size(); i++) gl.element_buffer.push_back(std::stoi(cmd[i]));
      break;}
      case "drawArraysTriangles"_hash:{
        int start = std::stoi(cmd[1]);
        int num_tri = std::stoi(cmd[2]) / 3; // Assume multiple of 3 indices given
        
        gl.drawArraysTriangles(start, num_tri);
      break;}
      case "depth"_hash:{
        gl.depth_enabled = true;
      break;}
      case "sRGB"_hash:{
        gl.sRGB_convert = true;
      break;}
      case "hyp"_hash:{
        gl.hyp_interp = true;
      break;}
      case "frustum"_hash:{
        gl.frustum_clipping = true;
      break;}
      case "cull"_hash:{
        gl.cull_backface = true;
      break;}
      case "drawElementsTriangles"_hash:{
        int count = std::stoi(cmd[1]);
        int offset = std::stoi(cmd[2]);

        gl.drawElementsTriangles(count, offset);
      break;}
      default:
        printf("Unknown action: %s\n", name.c_str());
    }
  }

  // gl.renderDepthMap();

  if (gl.sRGB_convert) gl.convert_sRGB();

  gl.img.save(gl.filename.c_str());
  printf("Image saved with dims %d by %d to output %s \n", gl.img.width(), gl.img.height(), gl.filename.c_str());
}

