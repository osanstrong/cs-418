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

struct Context {
  
  // Position / color buffers
  Int8Vec color_buffer; //linear 0-1, not sRGB
  int color_size; // Either 3 or 4
  IntVec pos_buffer;
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


  for (int i = 1; i < commands.size(); i++) {
    Command cmd = commands[i];
    std::string raw_command = raw_commands[i];


    // printf("Running command '%s' with %lu args\n", cmd[0].c_str(), cmd.size()-1);
    // printf("Running command: '%s'\n", raw_command.c_str());
    std::cout << "==========" << std::endl << raw_command << std::endl;
    
    std::string name = cmd[0];

    switch (hash(name)) {
      case "png"_hash:{
        std::cerr << "command 'png' should only be used at start of file";
        break;}
      case "position"_hash:{
        gl.pos_buffer.clear();
        for (int i = 2; i < cmd.size(); i++) gl.pos_buffer.push_back(std::stoi(cmd[i]));
        break;}
      case "color"_hash:{
        gl.color_buffer.clear();
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
      default:
        printf("Unknown action: %s\n", name.c_str());
    }
  }


  gl.img.save(gl.filename.c_str());
  printf("Image saved with dims %d by %d to output %s \n", gl.img.width(), gl.img.height(), gl.filename.c_str());
}

