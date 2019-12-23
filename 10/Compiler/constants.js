module.exports = {
  MULTILINE_COMMENT_OPEN: '/*',
  MULTILINE_COMMENT_CLOSE: '*/',
  ONELINE_COMMENT_OPEN: '//',
  TOKEN_TYPES: {
    KEYWORD: 'KEYWORD',
    SYMBOL: 'SYMBOL',
    IDENTIFIER: 'IDENTIFIER',
    INT_CONST: 'INT_CONST',
    STRING_CONST: 'STRING_CONST',
  },
  KEYWORDS: {
    class: 'class',
    constructor: 'constructor',
    function: 'function',
    method: 'method',
    field: 'field',
    static: 'static',
    var: 'var',
    int: 'int',
    char: 'char',
    boolean: 'boolean',
    void: 'void',
    true: 'true',
    false: 'false',
    null: 'null',
    this: 'this',
    let: 'let',
    do: 'do',
    if: 'if',
    else: 'else',
    while: 'while',
    return: 'return',
  },
  SYMBOLS: {
    '{': '{',
    '}': '}',
    '(': '(',
    ')': ')',
    '[': '[',
    ']': ']',
    '.': '.',
    ',': ',',
    ';': ';',
    '+': '+',
    '-': '-',
    '*': '*',
    '/': '/',
    '&': '&',
    '|': '|',
    '<': '<',
    '>': '>',
    '=': '=',
    '~': '~',
  },
};
