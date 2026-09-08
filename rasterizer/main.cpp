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

ld lin_to_sRGB(ld lin_val) {
  // TODO: Can't tell if my correction is just off slihtly or there's a fundamental flaw
  // return pow(lin_val, 1/2.2);
  ld threshold = 0.0031308;
  ld gamma = 2.4;

  if (lin_val <= threshold) return lin_val * 12.92;
  return 1.055 * pow(lin_val, 1/gamma) - 0.055;
}

ld sRGB_to_lin(ld sRGB_val) {
  // return pow(sRGB_val, 2.;2);
  ld threshold = 0.04045;
  ld gamma = 2.4;

  if (sRGB_val <= threshold) return sRGB_val / 12.92;
  return pow((sRGB_val + 0.055) / 1.055, gamma);
  // return sRGB_val;
}

// Convert float between 0 and 1 to 8 bit color val
uint8_t ftobyte(ld float_val, bool gamma_correct) {
  if (gamma_correct) {
    float_val = lin_to_sRGB(float_val);
  }
  return floor(float_val * 255.0);
  // return floor(clamp(float_val * 255.0, 0, 255.0));
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


  //// State Flags
  bool depth_enabled = false;
  bool sRGB_convert = false;
  bool hyp_interp = false;
  int fsaa_mode = 1;
  bool cull_backface = false;
  bool decals = false; // debug to include vertex colors behind transparent texture samples
  bool frustum_clipping = false; 

  int verbosity = 0; // Inverse; 0 means print everything, higher restricts to more and more important things

  //// Uniforms
  std::string filename;
  Image img;

  //// Constructor 
  Context(int width, int height) : img(Image(width, height)) {}

  //// Methods

  // Print if specified level is above verbosity state
  template<typename... Args>
  void cprintf(int level, const char *__restrict__ __format, Args&&... args) {
    if (level >= this->verbosity) printf(__format, std::forward<Args>(args)...);
  }

  template<typename... Args>
  void cprintf(const char *__restrict__ __format, Args&&... args) {
    cprintf(0, __format, std::forward<Args>(args)...);
  }

  // TODO: handling of this needs to be massively reworked
  // Overload here bc it might be a state-based thing whether or not we gamma correct
  uint8_t ftobyte_rgb(ld float_val) { 
    uint8_t val = ::ftobyte(float_val, sRGB_convert);
    // printf(" %Lf -> %u ", float_val, val);
    return val;
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
    for (int i = 4; i < PIX_SIZE; i++) target.p[i] = pre_div.p[i]; // FMSBL THEY WEREN'T W-CORRECTING THE COLORS
    return target;
  }

  // Divide by (1/w), only applies to non-position parts
  PixVec undiv_w(const PixVec& post_div) {
    PixVec target = div_w(post_div);
    for (int i = 0; i < 3; i++) target.p[i] = post_div.p[i];
    for (int i = 4; i < PIX_SIZE; i++) target.p[i] = post_div.p[i];
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
    if (
      xi >= 0 && xi < img.width() &&
      yi >= 0 && yi < img.height()) {
      cprintf("Pushing pixel at [%d, %d] from: %s \n", xi, yi, pv_to_s(pixel).c_str());
      img[int(y)][int(x)] = {ftobyte_rgb(r), ftobyte_rgb(g), ftobyte_rgb(b), ftobyte(a, false)};
    } else {
      cprintf("Pixel at [%d, %d] rejected!\n", xi, yi);
    }
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
    cprintf("Row at y=%d from %Lf to %Lf\n", y, left, right);
    int x = ceil(left);
    pixel_t white{255, 255, 255, 255};
    // cprintf(" -> pushing at x of ");
    while (x < right) {
      push_pixel(x, y, white);
      // cprintf("%d, ", x);
      x++;
    }
    // cprintf("\n");
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

  void scan_white(const Vec4& aw, const Vec4& bw, const Vec4& cw) {
    int width = img.width(), height = img.height();
    Vec2 av = aw.viewport(width, height);
    Vec2 bv = bw.viewport(width, height);
    Vec2 cv = cw.viewport(width, height);

    Vec2 t = miny(av, miny(bv, cv));
    Vec2 b = maxy(av, maxy(bv, cv));
    Vec2 m = (t != av && b != av)? av : ((t != bv && b != bv)? bv: cv);

    cprintf("a, b, c: \n - %s\n - %s\n - %s\n", av.to_str().c_str(), bv.to_str().c_str(), cv.to_str().c_str());
    cprintf("t, m, b: \n - %s\n - %s\n - %s\n", t.to_str().c_str(), m.to_str().c_str(), b.to_str().c_str());

    // dda_white(t, b);
    // dda_white(t, m);
    // dda_white(m, b);

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
      drawElementTriangle(eb[i], eb[i+1], eb[i+2]);
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
  int draw_call_num = 0;
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
      case "s_drawArraysTriangles"_hash:{
        draw_call_num++;
        gl.cprintf("Incrementing triangle #");
      break;}
      case "drawArraysTriangles"_hash:{
        int start = std::stoi(cmd[1]);
        int num_tri = std::stoi(cmd[2]) / 3; // Assume multiple of 3 indices given
        
        gl.drawArraysTriangles(start, num_tri);
        draw_call_num++;
      break;}
      default:
        printf("Unknown action: %s\n", name.c_str());
    }
  }


  gl.img.save(gl.filename.c_str());
  printf("Image saved with dims %d by %d to output %s \n", gl.img.width(), gl.img.height(), gl.filename.c_str());
}

