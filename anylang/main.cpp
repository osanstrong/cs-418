#include "./uselibpng.h"
#include <stdio.h>
#include <iostream>
#include <fstream>
#include <vector>
#include <string.h>
#include <bits/stdc++.h>


using StringVec = std::vector<std::string>;
using CommandVec = std::vector<StringVec>;

auto get_lines(char* const filepath) -> StringVec {
    // Open the text file for reading
    std::ifstream f(filepath);

    // Check if the file was opened successfully
    if (!f.is_open()) {
        std::cerr << "Error opening the file!";
    }
    printf("Opening file %s\n", filepath);


    StringVec commands;
    std::string s;

    // Read each line from the file
    while (std::getline(f, s))
        commands.push_back(s);

    // Close the file
    f.close();

    return commands;
}

auto split(std::string target, char delim) -> StringVec {
  StringVec tokens;
  std::string s;

  std::stringstream ss(target);

  while (std::getline(ss, s, delim)) {
    tokens.push_back(s);
  }
  return tokens;
}

auto get_commands(char* const filepath) -> CommandVec {
  printf("Getting file from %s.\n", filepath);
  CommandVec commands;
  StringVec raw_commands = get_lines(filepath);
  for (auto cmd : raw_commands) {
    printf("Raw string: '%s'\n", cmd);
    StringVec tokens = split(cmd, ' ');
    commands.push_back(tokens);
  }
  return commands;
}

int main(int argc, char* argv[]) {
  if (argc > 1) {
    auto filepath = argv[1];
    // int res = print_file(filepath);
    StringVec commands = get_lines(filepath);
    for (auto cmd : commands) {
      // std::cout << cmd << std::endl;
      StringVec tokens = split(cmd, ' ');
      printf("Command of length %lu with %lu tokens.\n", cmd.length(), tokens.size());
    }
  }

  if (argc < 2) {
    // No path argument
    return 1;
  }

  auto filepath = argv[1];
  auto commands = get_commands(filepath);
  for (auto cmd : commands) {
    printf("Running command '%s' with %lu args\n", cmd[0].c_str(), cmd.size()-1);
  }


  /* ... */
  Image img = Image(500, 500);
  /* ... */
  // int x = 0, y = 1;
  uint8_t test_val = 255;
  for (int x = 0; x < 100; x++) {
    for (int y = 100; y < 200; y++) {
      img[y][x].red = test_val;
      img[y][x].green = test_val;
      img[y][x].blue = test_val;
      img[y][x].alpha = test_val;
    }
  }
  /* ... */
  auto filename = "testout.png";
  img.save(filename);
  printf("Image saved with dims %d by %d\n", img.width(), img.height());
}

