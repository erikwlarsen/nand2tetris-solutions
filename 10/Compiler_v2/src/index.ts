import tokenize from './tokenize';
import * as fs from 'fs';
import * as path from 'path';

try {
  const [,, filePath] = process.argv;
  const fullPath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`could not find file or directory at path ${fullPath}`);
  }
  const filesToProcess: string[] = [];
  const stats = fs.lstatSync(fullPath);
  if (stats.isDirectory()) {
    const files = fs.readdirSync(fullPath);
    files.forEach(file => filesToProcess.push(`${fullPath}/${file}`));
  } else {
    filesToProcess.push(fullPath);
  }
  filesToProcess.forEach((fPath) =>{
    const pathParts = fPath.split('.');
      const extension = pathParts.pop();
      if (extension !== 'jack') {
        console.log(`Input file ${filePath}.${extension} does not have jack extension, skipping`);
        return;
      }
      const text = fs.readFileSync(fPath, 'utf8');
      const output = tokenize(text);
      fs.writeFileSync(pathParts.join('.').concat('.json'), JSON.stringify(output, null, 2));
  });
} catch (e) {
  console.error(e);
  process.exit(1);
}
