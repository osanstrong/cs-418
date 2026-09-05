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
