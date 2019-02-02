// This file is part of www.nand2tetris.org
// and the book "The Elements of Computing Systems"
// by Nisan and Schocken, MIT Press.
// File name: projects/04/Fill.asm

// Runs an infinite loop that listens to the keyboard input.
// When a key is pressed (any key), the program blackens the screen,
// i.e. writes "black" in every pixel;
// the screen should remain fully black as long as the key is pressed. 
// When no key is pressed, the program clears the screen, i.e. writes
// "white" in every pixel;
// the screen should remain fully clear as long as no key is pressed.

// Put your code here.
// store max pixel register
  @24575
  D=A
  @maxreg
  M=D
// set/reset current pixel register
(SETUP)
  @16384
  D=A
  @counter
  M=D
  @LISTEN
  0;JMP
// key listening section
(LISTEN)
  @24576
  D=M
  @WHITE
  D;JEQ
  @BLACK
  0;JMP
// screen whitening section
(WHITE)
  // Check if current pixel register has reached the max register value
  // If so, jump to setup to reset current pixel register
  @counter
  D=M
  @maxreg
  D=M-D
  @SETUP
  D;JLT
  @counter
  A=M
  D=0
  M=D
  @counter
  M=M+1
  @WHITE
  0;JMP
// screen blackening section
(BLACK)
  // Check if current pixel register has reached the max register value
  // If so, jump to setup to reset current pixel register
  @counter
  D=M
  @maxreg
  D=M-D
  @SETUP
  D;JLT
  @counter
  A=M
  D=0
  D=!D
  M=D
  @counter
  M=M+1
  @BLACK
  0;JMP
