const { Transform } = require('stream');
const { TOKEN_TYPES, KEYWORDS, SYMBOLS } = require('./constants');

/**
 * Takes a line and does initial token split based on spaces and double quotes
 * @param {string} line
 */
const getSpaceSeparatedTokens = line => line.match(/(".*?"|\S+)/g);
/**
 * Reduces a string that contains symbols and other tokens into an array of separate tokens
 * @param {string} str
 */
const separateSymbols = str => str.split('').reduce((acc, char, idx, arr) => {
  if (isSymbol(char)) {
    if (acc.currToken) {
      acc.tokens.push(acc.currToken);
      acc.currToken = '';
    }
    acc.tokens.push(char);
  } else {
    acc.currToken = acc.currToken.concat(char);
  }
  // If this is the last character and there is a currToken, push it to tokens
  if (arr.length - 1 === idx && acc.currToken) {
    acc.tokens.push(acc.currToken);
  }
  return acc;
}, { tokens: [], currToken: '' }).tokens;
/**
 * Takes an array of space separated tokens and breaks them down further by extracting
 * any symbols into separate tokens
 * @param {string[]} spaceSeparatedTokens
 */
const getAllTokens = spaceSeparatedTokens => spaceSeparatedTokens.reduce((acc, token) => {
  // Split this token into more tokens as needed
  const containsSymbol = (!isString(token) && token.split('').some(isSymbol));
  if (containsSymbol) {
    const splitTokens = separateSymbols(token);
    acc.push(...splitTokens);
  } else {
    acc.push(token);
  }
  return acc;
}, []);
/**
 * Determines if token is a keyword
 * @param {string} token
 */
const isKeyword = token => token in KEYWORDS;
/**
 * Determines if token is a symbol
 * @param {string} token
 */
const isSymbol = token => token in SYMBOLS;
/**
 * Determines if token is an integer constant
 * @param {string} token
 */
const isInt = token => (
  !Number.isNaN(Number(token))
  && (token >= 0)
  && (token <= 32767)
  && (!(token.includes('.')))
);
/**
 * Determines if token is a string constant
 * @param {string} token
 */
const isString = token => /^"[^("\n)]+"$/.test(token);
/**
 * Determines if token is an identifier
 * @param {string} token
 */
const isIdentifier = token => /^[a-zA-Z_][\w]*$/.test(token);
/**
 * Determines type of token and puts it into a format that the CompilationEngine expects
 * @param {string} token
 */
const classifyToken = (token) => {
  if (isKeyword(token)) return { tokenType: TOKEN_TYPES.KEYWORD, tokenValue: KEYWORDS[token] };
  if (isSymbol(token)) return { tokenType: TOKEN_TYPES.SYMBOL, tokenValue: SYMBOLS[token] };
  if (isInt(token)) return { tokenType: TOKEN_TYPES.INT_CONST, tokenValue: Number(token) };
  if (isString(token)) return { tokenType: TOKEN_TYPES.STRING_CONST, tokenValue: token };
  if (isIdentifier(token)) return { tokenType: TOKEN_TYPES.IDENTIFIER, tokenValue: token };
  throw new Error(`token ${token} is invalid`);
};

module.exports = class JackTokenizer extends Transform {
  constructor() {
    super({ readableObjectMode: true });
  }

  _transform(chunk, _encoding, done) {
    const line = String(chunk);
    const spaceSeparatedTokens = getSpaceSeparatedTokens(line);
    const tokens = getAllTokens(spaceSeparatedTokens);
    const classifiedTokens = tokens.map(classifyToken);
    classifiedTokens.forEach(this.push.bind(this));
    return done();
  }
};
