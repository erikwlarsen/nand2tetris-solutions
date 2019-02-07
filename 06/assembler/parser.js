const { Transform } = require('stream');
const {
  commands,
  regex,
  registers
} = require('./constants');
const symbolTable = require('./symbolTable')();
const { convertToBinary } = require('./utils');

const stripString = ({ chunk }) => {
  return chunk
    .replace(regex.COMMENT, '')
    .replace(regex.WHITESPACE, '');
};

const getCommandType = ({ command }) => {
  switch (true) {
    case regex.A_COMMAND_REGISTER.test(command):
    case regex.A_COMMAND_SYMBOL.test(command):
      return commands.A_COMMAND;
    case regex.C_COMMAND_EQUAL.test(command):
    case regex.C_COMMAND_JUMP_REGISTER.test(command):
    case regex.C_COMMAND_JUMP_SYMBOL.test(command):
      return commands.C_COMMAND;
    case regex.L_COMMAND.test(command):
      return commands.L_COMMAND;
    default:
      throw new Error(`Invalid command type: ${command}`);
  }
};

const getPushValue = ({ command, commandType, line }) => {
  switch (commandType) {
    case commands.A_COMMAND:
      return parseACommand({ command });
    case commands.C_COMMAND:
      return parseCCommand({ command });
    case commands.L_COMMAND:
      return parseLCommand({ command, line });
    default:
      return null;
  }
};

const parseACommand = ({ command }) => {
  const register = command.slice(1);
  const registerNum = !Number.isNaN(Number(register))
    ? Number(register)
    : register in registers
      ? registers[register]
      : symbolTable.getAddress(register);
  return typeof registerNum === 'number'
    ? convertToBinary(registerNum)
    : register
};

const parseCCommand = ({ command }) => {
  return command;
};

const parseLCommand = ({ command, line }) => {
  // Exclude parentheses
  const symbol = command.slice(1, command.length - 1);
  symbolTable.addEntry(symbol, line);
  return null;
};

const addNewLine = val => val + '\n';

class Parser extends Transform {
  constructor() {
    super();
    this.line = 0;
  }

  _transform(chunk, encoding, done) {
    chunk = String(chunk);
    const command = stripString({ chunk });
    if (!command.length) return done();
    const commandType = getCommandType({ command });
    const pushValue = getPushValue({ command, commandType, line: this.line });
    if (pushValue) {
      this.line += 1;
      this.push(addNewLine(pushValue));
    }
    done();
  }
}

exports.parser = new Parser();