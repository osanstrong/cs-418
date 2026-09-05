#include "./uselibpng.h"
#include "./argparse.hpp"

#include <stdio.h>
#include <iostream>
#include <fstream>
#include <vector>
#include <string.h>
#include <bits/stdc++.h>

int main(int argc, char* argv[]) {

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

