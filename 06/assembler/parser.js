const { Transform } = require('stream');
const {
  commands,
  regex,
  registers,
  jumps,
  DEST_NULL,
  comps,
} = require('./constants');
const symbolTable = require('./symbolTable')();
const { convertToBinary } = require('./utils');

const stripString = ({ chunk }) => chunk.replace(regex.COMMENT, '').replace(regex.WHITESPACE, '');

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
    : register;
};

const getBinComp = ({ comp }) => {
  if (!comp) throw new Error('Comp information missing in C command');
  return comps[comp];
};

const getBinDest = ({ dest }) => {
  if (!dest) return DEST_NULL;
  const a = dest.includes('A') ? '1' : '0';
  const d = dest.includes('D') ? '1' : '0';
  const m = dest.includes('M') ? '1' : '0';
  return a + d + m;
};

const getBinJump = ({ jump }) => (jump ? jumps[jump] : jumps.NULL);

const parseCCommand = ({ command }) => {
  // Initialize binary command with first 3 digits for all C commands
  const binStart = '111';
  // Command format: dest=comp;jump
  const [destAndComp, jump] = command.split(';');
  let [dest, comp] = destAndComp.split('=');
  // If there is no equals sign, then there is no dest
  if (!comp) {
    comp = dest;
    dest = null;
  }
  const binComp = getBinComp({ comp });
  const binDest = getBinDest({ dest });
  const binJump = getBinJump({ jump });
  return binStart + binComp + binDest + binJump;
};

const parseLCommand = ({ command, line }) => {
  // Exclude parentheses
  const symbol = command.slice(1, command.length - 1);
  symbolTable.addEntry(symbol, line);
  return null;
};

const addNewLine = val => val.concat('\n');

class Parser extends Transform {
  constructor() {
    super();
    this.line = 0;
  }

  _transform(chunk, encoding, done) {
    const chunkStr = String(chunk);
    const command = stripString({ chunk: chunkStr });
    if (!command.length) return done();
    const commandType = getCommandType({ command });
    const pushValue = getPushValue({ command, commandType, line: this.line });
    if (pushValue) {
      this.line += 1;
      this.push(addNewLine(pushValue));
    }
    return done();
  }
}

exports.parser = new Parser();
