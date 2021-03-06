module.exports = {
  commandTypes: {
    C_ARITHMETIC: 'C_ARITHMETIC',
    C_PUSH: 'C_PUSH',
    C_POP: 'C_POP',
    C_LABEL: 'C_LABEL',
    C_GOTO: 'C_GOTO',
    C_IF: 'C_IF',
    C_FUNCTION: 'C_FUNCTION',
    C_CALL: 'C_CALL',
    C_RETURN: 'C_RETURN',
  },
  arithmeticCmds: {
    ADD: 'add',
    SUB: 'sub',
    NEG: 'neg',
    EQ: 'eq',
    GT: 'gt',
    LT: 'lt',
    AND: 'and',
    OR: 'or',
    NOT: 'not',
  },
  segments: {
    CONSTANT: 'constant',
    LOCAL: 'local',
    ARGUMENT: 'argument',
    THIS: 'this',
    THAT: 'that',
    POINTER: 'pointer',
    TEMP: 'temp',
    STATIC: 'static',
  },
  SYS_INIT: 'Sys.init',
};
