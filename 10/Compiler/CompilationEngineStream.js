const { Transform } = require('stream');
const {
  TOKEN_TYPES,
  KEYWORDS,
  SYMBOLS,
  ANY,
  ZERO_OR_MORE,
  ZERO_OR_ONE,
} = require('./constants');

const classVarDecForm = [
  [
    { type: TOKEN_TYPES.KEYWORD, value: KEYWORDS.static },
    { type: TOKEN_TYPES.KEYWORD, value: KEYWORDS.field },
  ],
  [
    { type: TOKEN_TYPES.KEYWORD, value: KEYWORDS.int },
    { type: TOKEN_TYPES.KEYWORD, value: KEYWORDS.char },
    { type: TOKEN_TYPES.KEYWORD, value: KEYWORDS.boolean },
    { type: TOKEN_TYPES.IDENTIFIER, value: ANY }, // className
  ],
];

const subroutineDecForm = [

];

const classForm = [
  [{ type: TOKEN_TYPES.KEYWORD, value: KEYWORDS.class }],
  [{ type: TOKEN_TYPES.IDENTIFIER, value: ANY }], // className
  [{ type: TOKEN_TYPES.SYMBOL, value: SYMBOLS['{'] }],
  [{ type: classVarDecForm, quantity: ZERO_OR_MORE }],
  [{ type: subroutineDecForm, quanity: ZERO_OR_MORE }],
  [{ type: TOKEN_TYPES.SYMBOL, value: SYMBOLS['}'] }],
];

const formTagMap = new Map([
  [classForm, 'class'],
  [classVarDecForm, 'classVarDec'],
  [subroutineDecForm, 'subroutineDec'],
  [TOKEN_TYPES.KEYWORD, 'keyword'],
  [TOKEN_TYPES.SYMBOL, 'symbol'],
  [TOKEN_TYPES.IDENTIFIER, 'identifier'],
  [TOKEN_TYPES.INT_CONST, 'integerConstant'],
  [TOKEN_TYPES.STRING_CONST, 'stringConstant'],
]);

module.exports = class CompilationEngine extends Transform {
  constructor() {
    super({ writableObjectMode: true });
    this.formStack = [];
    this.stackLocator = [];
    this.initialized = false;
  }

  _transform({ tokenType, tokenValue }, _encoding, done) {
    if (!this.initialized) {
      this.init();
    }
    const tokenProcessed = this.processToken(tokenType, tokenValue);
    if (!tokenProcessed) {
      throw new Error(`Syntax error: unexpected token ${tokenValue}`);
    }
    return done();
  }

  init() {
    // All files should start with a class declaration
    this.openTag(classForm);
    this.formStack.push(classForm);
    this.stackLocator.push(0);
    this.initialized = true;
  }

  openTag(formType) {
    const tag = formTagMap.get(formType);
    this.push(`<${tag}>\n`);
  }

  closeTag(formType) {
    const tag = formTagMap.get(formType);
    this.push(`</${tag}>\n`);
  }

  getTopForm() {
    return this.formStack[this.formStack.length - 1];
  }

  getTopLocator() {
    return this.stackLocator[this.stackLocator.length - 1];
  }

  processToken(tokenType, tokenValue) {
    const currentForm = this.getTopForm();
    const currentIndex = this.getTopLocator();
    // how to resolve ambiguous steps? Current token could have more than one possible path
    const currentStep = currentForm[currentIndex];
  }
};
