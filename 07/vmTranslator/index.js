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
const init = process.argv[3] === 'init';
const isDirectory = lstatSync(filePath).isDirectory();

const filePaths = isDirectory
  ? readdirSync(filePath)
    .filter(path => vmFileRegex.test(path))
    .map(path => resolve(filePath, path))
  : [filePath];

let outputPath;
const fileArr = filePath.split('/');
const name = fileArr[fileArr.length - 2];
switch (filePath[filePath.length - 1]) {
  case '/':
    outputPath = filePath.concat(`${name}.asm`);
    break;
  case 'm': // assume this is vm extension
    outputPath = filePath.slice(0, filePath.length - 3).concat('.asm');
    break;
  default:
    outputPath = filePath.concat('.asm');
}

try {
  if (existsSync(outputPath)) unlinkSync(outputPath);
  filePaths.reduce(async (prevProm, file, idx) => {
    // because airbnb does not like for-of loops!
    await prevProm;
    const filePathArr = file.split('/');
    // extract file name without extension for naming static variables
    const [className] = filePathArr[filePathArr.length - 1].split('.vm');
    const readStream = createReadStream(file);
    const writeStream = createWriteStream(outputPath, { flags: 'a' });
    return pipePromise(
      readStream,
      new MakeLines(),
      new Parser(),
      new CodeWriter({ className, init: init && idx === 0 }),
      writeStream,
    );
  }, Promise.resolve());
} catch (err) {
  throw err;
}
