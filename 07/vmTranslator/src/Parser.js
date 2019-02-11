const { Transform } = require('stream');
const { commandTypes } = require('./constants');
const { getCommandType, stripString } = require('./utils');

const getArgs = ({ line, commandType }) => {
  const trimmedLine = line.replace(/\s+/g, ' ');
  const splitLine = trimmedLine.split(' ');
  let arg1;
  let arg2;
  switch (commandType) {
    case commandTypes.C_ARITHMETIC:
      [arg1] = splitLine;
      arg2 = null;
      break;
    case commandTypes.C_PUSH:
    case commandTypes.C_POP:
    case commandTypes.C_FUNCTION:
    case commandTypes.C_CALL:
      [, arg1, arg2] = splitLine;
      break;
    case commandTypes.C_LABEL:
    case commandTypes.C_GOTO:
    case commandTypes.C_IF:
      [, arg1] = splitLine;
      arg2 = null;
      break;
    default:
      arg1 = null;
      arg2 = null;
  }
  return { arg1, arg2 };
};

/**
 * Parser extends node's Transform stream and parses incoming VM bytecode lines
 * into objects describing each line.
 * Should be part of a streaming pipeline:
 * VM file -> MakeLines -> Parser -> CodeWriter -> Hack asm file
 */
class Parser extends Transform {
  constructor() {
    super({ readableObjectMode: true });
  }

  /**
   * Pushes objects to the output stream with the following properties:
   * commandType{string}: one of the COMMAND_TYPES constants,
   * arg1{string}: first argument of command
   * arg2{int}: second argument of command
   */
  _transform(chunk, encoding, done) {
    const line = String(chunk);
    const strippedLine = stripString({ line });
    if (!strippedLine.length) return done();
    const commandType = getCommandType({ line });
    const { arg1, arg2 } = getArgs({ line, commandType });
    this.push({ commandType, arg1, arg2 });
    return done();
  }
}

module.exports = { Parser };
