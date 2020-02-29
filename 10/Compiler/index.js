// accept file input
// Determine if is file or directory. If directory, enter it append file names to list
// Create and run new JackAnalyzers for each file
const path = require('path');
const fs = require('fs');
const JackAnalyzer = require('./JackAnalyzer');

(async () => {
  try {
    const [,, filePath] = process.argv;
    const fullPath = path.resolve(process.cwd(), filePath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`could not find file or directory at path ${fullPath}`);
    }
    const filesToProcess = [];
    const stats = fs.lstatSync(fullPath);
    if (stats.isDirectory()) {
      const files = fs.readdirSync(fullPath);
      files.forEach(file => filesToProcess.push(`${fullPath}/${file}`));
    }
    await Promise.all(filesToProcess.map((fPath) => {
      const pathParts = fPath.split('.');
      const extension = pathParts.pop();
      if (extension !== 'jack') {
        console.warn(`Input file ${filePath} does not have correct extension, skipping`);
        return Promise.resolve();
      }
      const directory = fPath.split('/').slice(0, -1).join('/');
      const jackAnalyzer = new JackAnalyzer(fPath, directory);
      return jackAnalyzer.run();
    }));
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
