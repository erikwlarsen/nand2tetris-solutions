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

const parseChunk = chunk => {
  if (!testForBinary(chunk)) {
    const address = symbolTable.getAddress(chunk);
    if (address) {
      return convertToBinary(address);
    }
  }
};

class CleanupParser extends Transform {
  constructor() {
    super();
  }

  _transform(chunk, encoding, done) {
    chunk = String(chunk);
    const parsedData = parseChunk(chunk);
    this.push((parsedData || chunk) + '\n');
    done();
  }

}

exports.cleanupParser = new CleanupParser();