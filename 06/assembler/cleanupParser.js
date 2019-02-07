const { Transform } = require('stream');
const symbolTable = require('./symbolTable')();
const { convertToBinary } = require('./utils');

const testForBinary = str => {
  const binarySet = new Set(['0', '1']);
  str = str.split('').filter(s => s !== '\n').join('');
  return (
    str.length === 16 &&
    str.split('').every(char => binarySet.has(char))
  );
};

const parseChunk = ({ chunk, varRegister }) => {
  if (!testForBinary(chunk)) {
    const address = symbolTable.getAddress(chunk);
    if (address) {
      return convertToBinary(address);
    }
    return address
      ? convertToBinary(address)
      : storeSymbol({ chunk, varRegister });
  }
};

const storeSymbol = ({ chunk, varRegister }) => {
  symbolTable.addEntry(chunk, varRegister);
  cleanupParser.emit('incrementVarRegister');
  return convertToBinary(varRegister);
}

class CleanupParser extends Transform {
  constructor() {
    super();
    // Initial register for storing non-instruction variables
    this.varRegister = 16;
  }

  _transform(chunk, encoding, done) {
    chunk = String(chunk);
    const parsedData = parseChunk({ chunk, varRegister: this.varRegister });
    this.push((parsedData || chunk) + '\n');
    done();
  }

}

const cleanupParser = new CleanupParser();
cleanupParser.on('incrementVarRegister', () => cleanupParser.varRegister += 1);

module.exports = { cleanupParser };