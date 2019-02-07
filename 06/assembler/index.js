const { createReadStream, createWriteStream, unlinkSync } = require('fs');
const { promisify } = require('util');
const { pipeline } = require('stream');
const pipelineProm = promisify(pipeline);
const { parser } = require('./parser');
const { MakeLines } = require('./makeLines');
const { cleanupParser } = require('./cleanupParser');

// Parse input and read file
const filePath = process.argv[2];
if (!filePath) throw new Error('Missing file argument');
const fileArr = filePath.split('/');
const [filename, extension] = fileArr[fileArr.length - 1].split('.');
if (extension !== 'asm') {
  throw new Error(`File argument must have asm extension, ${extension} supplied.`);
}

// Initialize string to be written to output file
const tempFilename = `.${filename}-temp.hack`
const readable = createReadStream(filePath);
const tempWritable = createWriteStream(tempFilename);
const writable = createWriteStream(`${filename}.hack`);

(async function() {
  try {
    await pipelineProm(readable, new MakeLines(), parser, tempWritable)
    await pipelineProm(
      createReadStream(tempFilename),
      new MakeLines(),
      cleanupParser,
      writable
    );
    unlinkSync(tempFilename);
  } catch (err) {
    throw err;
  }
}());
