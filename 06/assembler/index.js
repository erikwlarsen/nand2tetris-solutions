const { createReadStream, createWriteStream, unlinkSync } = require('fs');
const { promisify } = require('util');
const { pipeline } = require('stream');
const { parser } = require('./src/parser');
const { MakeLines } = require('./src/makeLines');
const { cleanupParser } = require('./src/cleanupParser');

const pipePromise = promisify(pipeline);

// Parse input and read file
const filePath = process.argv[2];
if (!filePath) throw new Error('Missing file argument');
const fileArr = filePath.split('/');
const [fileAndExt] = fileArr.splice(fileArr.length - 1, 1);
const [filename, extension] = fileAndExt.split('.');
if (extension !== 'asm') {
  throw new Error(`File argument must have asm extension, ${extension} supplied.`);
}

(async function assembler() {
  try {
    const tempFilename = `.${filename}-temp.hack`;
    const readable = createReadStream(filePath);
    const tempWritable = createWriteStream(tempFilename);
    const writable = createWriteStream(fileArr.concat(`${filename}.hack`).join('/'));

    await pipePromise(readable, new MakeLines(), parser, tempWritable);
    await pipePromise(
      createReadStream(tempFilename),
      new MakeLines(),
      cleanupParser,
      writable,
    );
    unlinkSync(tempFilename);
  } catch (err) {
    throw err;
  }
}());
