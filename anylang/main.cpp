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

int main(int argc, char* argv[]) {

  if (argc < 2) {
    // No path argument
    return 1;
  }


  char* filepath = argv[1];
  StringVec raw_commands = get_lines(filepath);
  CommandVec commands = get_commands(filepath);
  Command imgdef = commands.front(); // Assume first command is initializing the image 
  Image img = Image(std::stoi(imgdef[1]), std::stoi(imgdef[2]));
  auto filename = imgdef[3].c_str();

  commands.erase(commands.begin());


  // Position / color buffers
  Int8Vec color_buffer;
  IntVec pos_buffer;


  for (int i = 0; i < commands.size(); i++) {
    Command cmd = commands[i];
    std::string raw_command = raw_commands[i];


    // printf("Running command '%s' with %lu args\n", cmd[0].c_str(), cmd.size()-1);
    // printf("Running command: '%s'\n", raw_command.c_str());
    std::cout << raw_command << std::endl << "==========" << std::endl;
    
    std::string name = cmd[0];

    switch (hash(name)) {
      case "png"_hash:{
        std::cerr << "command 'png' should only be used at start of file";
        break;}
      case "position"_hash:{
        // Assume only position-2 is given
        pos_buffer.clear();
        for (int i = 2; i < cmd.size(); i+=2) {
          pos_buffer.push_back(std::stoi(cmd[i]));
          printf("Pushing back from x index %d\n", i);
          pos_buffer.push_back(std::stoi(cmd[i+1]));
          printf("Pushing back from y index %d\n", i+1);
        }
        break;}
      case "color"_hash:{
        // Assume only color-4 is given
        color_buffer.clear();
        for (int i = 2; i < cmd.size(); i+=4) {
          printf("Pushing back from index %d\n", i);
          color_buffer.push_back(std::stoi(cmd[i]));
          printf("Pushing back from index %d\n", i+1);
          color_buffer.push_back(std::stoi(cmd[i+1]));
          printf("Pushing back from index %d\n", i+2);
          color_buffer.push_back(std::stoi(cmd[i+2]));
          printf("Pushing back from index %d\n", i+3);
          color_buffer.push_back(std::stoi(cmd[i+3]));
          printf("Pushed back from index %d to %d\n", i, i+3);
        }
        break;}
      case "drawPixels"_hash:{
        printf("Running draw pixel command");
        int num_pixels = std::stoi(cmd[1]);
        for (int i = 0; i < num_pixels; i++) {
          printf("Pushing pixel %d of %d\n", i, num_pixels);
          int x = pos_buffer[i*2+0], y = pos_buffer[i*2+1];
          img[y][x].red = color_buffer[i*4+0];
          img[y][x].green = color_buffer[i*4+1];
          img[y][x].blue = color_buffer[i*4+2];
          img[y][x].alpha = color_buffer[i*4+3];
          
          // pos_buffer.erase(pos_buffer.begin(), pos_buffer.begin() + 2);
          // color_buffer.erase(color_buffer.begin(), color_buffer.begin() + 4);
        } 
        break;}
      default:
        printf("Unknown action: %s\n", name.c_str());
    }
  }


  img.save(filename);
  printf("Image saved with dims %d by %d to output %s \n", img.width(), img.height(), filename);
}

