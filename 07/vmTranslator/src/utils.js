const {
  commandTypes: {
    C_PUSH,
    C_ARITHMETIC,
    C_CALL,
    C_FUNCTION,
    C_GOTO,
    C_IF,
    C_LABEL,
    C_POP,
    C_RETURN,
  },
} = require('./constants');

const commandRegex = [
  { type: C_PUSH, regex: /^push/ },
  { type: C_POP, regex: /^pop/ },
  { type: C_ARITHMETIC, regex: /^(add|sub|neg|eq|gt|lt|and|or|not)/ },
  { type: C_CALL, regex: /notimplementedyet/ },
  { type: C_FUNCTION, regex: /notimplementedyet/ },
  { type: C_GOTO, regex: /notimplementedyet/ },
  { type: C_IF, regex: /notimplementedyet/ },
  { type: C_LABEL, regex: /notimplementedyet/ },
  { type: C_RETURN, regex: /notimplementedyet/ },
];

const utilRegex = {
  COMMENT: /\/\/.*/,
  WHITESPACE: /\s/g,
};

module.exports = {
  getCommandType({ line }) {
    return commandRegex.find(({ regex }) => regex.test(line)).type;
  },
  stripString({ line }) {
    return line.replace(utilRegex.COMMENT, '').replace(utilRegex.WHITESPACE, '');
  },
  vmFileRegex: /\.vm/,
};
