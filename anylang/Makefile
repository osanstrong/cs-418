.PHONEY: build, run

build: program

run: program
	./program $(file)

program: main.cpp uselibpng.c
	g++ -O3 -I. main.cpp uselibpng.c -lpng -o program

