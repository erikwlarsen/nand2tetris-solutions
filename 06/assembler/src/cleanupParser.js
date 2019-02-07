const { Transform } = require('stream');
const symbolTable = require('./symbolTable')();
const { convertToBinary } = require('./utils');

const testForBinary = (str) => {
  const binarySet = new Set(['0', '1']);
  const filteredStr = str.split('').filter(s => s !== '\n').join('');
  return (
    filteredStr.length === 16
    && filteredStr.split('').every(char => binarySet.has(char))
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
  return null;
};

const storeSymbol = ({ chunk, varRegister }) => {
  symbolTable.addEntry(chunk, varRegister);
  cleanupParser.emit('incrementVarRegister');
  return convertToBinary(varRegister);
};

class CleanupParser extends Transform {
  constructor() {
    super();
    // Initial register for storing non-instruction variables
    this.varRegister = 16;
  }

  _transform(chunk, encoding, done) {
    const strChunk = String(chunk);
    const parsedData = parseChunk({ chunk: strChunk, varRegister: this.varRegister });
    this.push((parsedData || strChunk).concat('\n'));
    done();
  }
}

const cleanupParser = new CleanupParser();
cleanupParser.on('incrementVarRegister', () => {
  cleanupParser.varRegister += 1;
});

module.exports = { cleanupParser };
