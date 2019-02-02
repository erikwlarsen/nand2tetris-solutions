// This file is part of www.nand2tetris.org
// and the book "The Elements of Computing Systems"
// by Nisan and Schocken, MIT Press.
// File name: projects/04/Mult.asm

// Multiplies R0 and R1 and stores the result in R2.
// (R0, R1, R2 refer to RAM[0], RAM[1], and RAM[2], respectively.)

// Put your code here.
// load R0 into A
// set D = A
// load R1 into A
// set D = D * A
// 
  @R0
  D=M // D = R0
  @dec
  M=D // dec = R0
  @R2
  M=0 // R2 (product) = 0
  @END
  D;JLE // if D <= 0 jump to END
(LOOP)
  @R1
  D=M // D = R1
  @R2
  M=M+D
  @dec
  M=M-1 // decrement
  D=M
  @LOOP
  D;JGT // jump back to beginning of loop if D (dec) > 0
(END)
  @END
  0;JMP


