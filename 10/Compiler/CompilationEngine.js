const { Transform } = require('stream');
const {
  TAB_LENGTH,
  TOKEN_TYPES,
  KEYWORDS,
  SYMBOLS,
} = require('./constants');

const padLeft = (str, spaces) => ' '.repeat((spaces || 0) * TAB_LENGTH).concat(str);

class UnexpectedTokenError extends Error {}

module.exports = class CompilationEngine extends Transform {
  constructor() {
    super({ writableObjectMode: true });
    this.tokens = [];
    this.index = 0;
    this.indentation = 0;
    this.compileCheckMap = new Map([
      [this.compileClassVarDec, this.checkForClassVarDec],
    ]);
  }

  // Push all tokens to one array, as they will all get processed at once
  _transform(token, _encoding, done) {
    this.tokens.push(token);
    return done();
  }

  _flush(done) {
    this.compileClass();
    return done();
  }

  indentPush(line) {
    this.push(padLeft(line, this.indentation));
  }

  tagStart(name) {
    this.indentPush(`<${name}>\n`);
  }

  tagEnd(name) {
    this.indentPush(`</${name}>\n`);
  }

  incrementIndex() {
    this.index += 1;
  }

  incrementIndentation() {
    this.indentation += 1;
  }

  decrementIndentation() {
    this.indentation -= 1;
    if (this.indentation < 0) {
      throw new Error('Indentation less than zero, W.T.F.!');
    }
  }

  getCurrentToken() {
    return this.tokens[this.index];
  }

  compileClass() {
    this.tagStart(KEYWORDS.class);
    this.incrementIndentation();
    this.compileTerminal(TOKEN_TYPES.KEYWORD, KEYWORDS.class);
    this.compileTerminal(TOKEN_TYPES.IDENTIFIER);
    this.compileTerminal(TOKEN_TYPES.SYMBOL, SYMBOLS['{']);
    this.zeroOrMore(this.compileClassVarDec);
    this.decrementIndentation();
    this.tagEnd(KEYWORDS.class);
  }

  compileTerminal(expectedType, expectedValue) {
    const { tokenType, tokenValue } = this.getCurrentToken();
    if (expectedValue && tokenValue !== expectedValue) {
      throw new UnexpectedTokenError(`Unexpected token ${tokenValue}, expected ${expectedValue}`);
    }
    if (expectedType && tokenType !== expectedType) {
      throw new UnexpectedTokenError(`Unexpected token ${tokenValue}, expected a(n) ${expectedType}`);
    }
    this.indentPush(`<${tokenType}>${tokenValue}</${tokenType}>\n`);
    this.incrementIndex();
  }

  chooseOneTerminal(options) {
    let errorCount = 0;
    options.reduce((successOrError, { expectedType, expectedValue }) => {
      if (successOrError.expectedType) {
        return successOrError;
      }
      try {
        this.compileTerminal(expectedType, expectedValue);
      } catch (err) {
        if (err instanceof UnexpectedTokenError) {
          errorCount += 1;
          return err;
        }
        throw err;
      }
    }, null);
    // If every attempt threw an error, then no terminal worked
    if (errorCount === options.length) {
      throw mostRecentError;
    }
  }

  compileClassVarDec() {
    this.tagStart('classVarDec');
    this.incrementIndentation();
  }

  checkForClassVarDec() {

  }

  zeroOrMore(method) {
    const checker = this.compileCheckMap.get(method);
    while (checker.call(this)) {
      method.call(this);
    }
  }

  oneOrMore(method) {
    let methodCalledCounter = 0;
    const checker = this.compileCheckMap.get(method);
    while (checker.call(this)) {
      methodCalledCounter += 1;
      method.call(this);
    }
    return methodCalledCounter;
  }
};
