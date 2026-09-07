#include <fstream>
#include <vector>
#include <string.h>
#include <bits/stdc++.h>


using StringVec = std::vector<std::string>;
using Command = StringVec;
using CommandVec = std::vector<StringVec>;

auto get_lines(char* const filepath) -> StringVec {
    // Open the text file for reading
    std::ifstream f(filepath);

    // Check if the file was opened successfully
    if (!f.is_open()) {
        std::cerr << "Error opening the file!";
    }
    printf("Opening file %s\n", filepath);


    StringVec lines;
    std::string s;

    // Read each line from the file
    while (std::getline(f, s, '\n')){
      // std::cout << s << std::endl;
      // printf("Adding string %s\n", s.c_str());
      lines.push_back(s);

    }

    // Close the file
    f.close();

    return lines;
}

// Splits a string and optionally ignores empty entries
auto split(std::string target, char delim, bool trim_empty) -> StringVec {
  StringVec tokens;
  std::string s;

  std::stringstream ss(target);

  while (std::getline(ss, s, delim)) {
    if (s.empty() && trim_empty) continue;
    tokens.push_back(s);
  }
  return tokens;
}

auto split(std::string target, char delim) -> StringVec {
  return split(target, delim, true);
}

auto get_commands(char* const filepath) -> CommandVec {
  printf("Getting file from %s.\n", filepath);
  CommandVec commands;
  StringVec raw_commands = get_lines(filepath);
  for (auto cmd : raw_commands) {
    // printf("Raw string: '%s'\n", cmd.c_str());
    Command tokens = split(cmd, ' ');
    commands.push_back(tokens);
  }
  return commands;
}

constexpr uint64_t hash(std::string_view str) {
  uint64_t hash = 0;
  for (char c : str) {
    hash = (hash * 131) + c;
  }
  return hash;
}

constexpr uint64_t operator"" _hash(const char* str, size_t len) {
  return hash(std::string_view(str, len));
}
