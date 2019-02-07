const symbol = /[^0-9](\w|\$|\.|:)*/;
const register = /[0-9]+/;

module.exports = {
  commands: {
    A_COMMAND: 'A_COMMAND',
    C_COMMAND: 'C_COMMAND',
    L_COMMAND: 'L_COMMAND',
    SKIP: 'SKIP'
  },
  regex: {
    COMMENT: /\/\/.*/,
    WHITESPACE: /\s/g,
    A_COMMAND_SYMBOL: new RegExp('^@' + symbol.source),
    A_COMMAND_REGISTER: new RegExp('^@' + register.source),
    C_COMMAND_EQUAL: new RegExp('^' + symbol.source + '\='),
    C_COMMAND_JUMP_SYMBOL: new RegExp('^' + symbol.source + ';'),
    C_COMMAND_JUMP_REGISTER: new RegExp('^' + register.source + ';'),
    L_COMMAND: new RegExp('\(' + symbol.source + '\)')
  },
  registers: {
    SP: 0,
    LCL: 1,
    ARG: 2,
    THIS: 3,
    THAT: 4,
    R0: 0,
    R1: 1,
    R2: 2,
    R3: 3,
    R4: 4,
    R5: 5,
    R6: 6,
    R7: 7,
    R8: 8,
    R9: 9,
    R10: 10,
    R11: 11,
    R12: 12,
    R13: 13,
    R14: 14,
    R15: 15,
    SCREEN: 16384,
    KBD: 24576
  },
  TO_REPLACE: '__TO_REPLACE__'
};
