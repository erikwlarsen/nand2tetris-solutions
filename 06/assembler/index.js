const { createReadStream, createWriteStream, unlinkSync } = require('fs');
const { promisify } = require('util');
const { pipeline } = require('stream');
const pipePromise = promisify(pipeline);
const { parser } = require('./parser');
const { MakeLines } = require('./makeLines');
const { cleanupParser } = require('./cleanupParser');

// Parse input and read file
const filePath = process.argv[2];
if (!filePath) throw new Error('Missing file argument');
const fileArr = filePath.split('/');
const [fileAndExt] = fileArr.splice(fileArr.length - 1, 1);
const [filename, extension] = fileAndExt.split('.');
if (extension !== 'asm') {
  throw new Error(`File argument must have asm extension, ${extension} supplied.`);
}

(async function() {
  try {
    const tempFilename = `.${filename}-temp.hack`
    const readable = createReadStream(filePath);
    const tempWritable = createWriteStream(tempFilename);
    const writable = createWriteStream(fileArr.concat(`${filename}.hack`).join('/'));

    await pipePromise(readable, new MakeLines(), parser, tempWritable)
    await pipePromise(
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
