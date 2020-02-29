// Accepts file name and directory
// Creates read stream from file
// Creates write stream from directory + xml extension
// Pipes read -> JackTokenizer -> CompilationEngine -> write
const fs = require('fs');
const { pipeline } = require('stream');
const MakeLines = require('./MakeLines');
const RemoveComments = require('./RemoveComments');
const JackTokenizer = require('./JackTokenizer');
const CompilationEngine = require('./CompilationEngine');

module.exports = class JackAnalyzer {
  constructor(filePath) {
    this.readStream = fs.createReadStream(filePath);
    const pathParts = filePath.split('.');
    const writePath = pathParts.slice(0, -1).join('.').concat('.xml');
    this.writeStream = fs.createWriteStream(writePath);
  }

  // split into lines
  // remove comments
  // split into words
  // classify tokens
  // compile them into XML
  run() {
    return new Promise((resolve, reject) => {
      pipeline(
        this.readStream,
        new MakeLines(),
        new RemoveComments(),
        new JackTokenizer(),
        new CompilationEngine(),
        this.writeStream,
        (err) => {
          if (err) return reject(err);
          console.log('done parsing!');
          return resolve();
        },
      );
    });
  }
};
