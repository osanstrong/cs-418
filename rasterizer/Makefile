.PHONEY: build, run

build: program

run: program
	./program $(file)

program: main.cpp uselibpng.c uselibpng.h argparse.hpp
	g++ -O0 -I. main.cpp uselibpng.c -lpng -o program

