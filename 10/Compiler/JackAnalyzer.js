// Accepts file name and directory
// Creates read stream from file
// Creates write stream from directory + xml extension
// Pipes read -> JackTokenizer -> CompilationEngine -> write
const fs = require('fs');
const { pipeline } = require('stream');
const JackTokenizer = require('./JackTokenizer');
const CompilationEngine = require('./CompilationEngine');

module.exports = class JackAnalyzer {
  constructor(filePath, dirPath) {
    this.readStream = fs.createReadStream(filePath);
    const pathParts = filePath.split('.');
    const writePath = pathParts.slice(0, -1).join('.').concat('.xml');
    this.writeStream = fs.createWriteStream(`${dirPath}/${writePath}`);
  }

  run() {
    return new Promise((resolve, reject) => {
      pipeline(
        this.readStream,
        new JackTokenizer(),
        new CompilationEngine(),
        this.writeStream,
        (err) => {
          if (err) return reject (err);
          resolve();
        }
      )
    });
  }
};
