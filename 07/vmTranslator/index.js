const {
  lstatSync,
  readdirSync,
  createReadStream,
  createWriteStream,
  unlinkSync,
  existsSync,
} = require('fs');
const { resolve } = require('path');
const { promisify } = require('util');
const { pipeline } = require('stream');
const { CodeWriter } = require('./src/CodeWriter');
const { Parser } = require('./src/Parser');
const { MakeLines } = require('./src/MakeLines');
const { vmFileRegex } = require('./src/utils');

const pipePromise = promisify(pipeline);

const filePath = process.argv[2];
const isDirectory = lstatSync(filePath).isDirectory();

const filePaths = isDirectory
  ? readdirSync(filePath)
    .filter(path => vmFileRegex.test(path))
    .map(path => resolve(filePath, path))
  : [filePath];

let outputPath;
switch (filePath[filePath.length - 1]) {
  case '/':
    outputPath = filePath.slice(0, filePath.length - 1).concat('.asm');
    break;
  case 'm': // assume this is vm extension
    outputPath = filePath.slice(0, filePath.length - 3).concat('.asm');
    break;
  default:
    outputPath = filePath.concat('.asm');
}

(async function vmTranslator() {
  try {
    if (existsSync(outputPath)) unlinkSync(outputPath);
    await filePaths.reduce(async (prevProm, file) => {
      // because airbnb does not like for-of loops!
      await prevProm;
      const readStream = createReadStream(file);
      const writeStream = createWriteStream(outputPath, { flags: 'a' });
      return pipePromise(readStream, new MakeLines(), new Parser(), new CodeWriter(), writeStream);
    }, Promise.resolve());
  } catch (err) {
    throw err;
  }
}());
