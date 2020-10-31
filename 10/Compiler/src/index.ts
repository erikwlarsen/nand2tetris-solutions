import * as fs from 'fs';
import * as path from 'path';
import tokenize from './tokenize';
import toAst from './toAst';
import toXml from './toXml';
import compile from './compile';

const XML_FLAG = '--xml';

try {
  const [,, filePath] = process.argv;
  const xmlFlag = process.argv.includes(XML_FLAG);
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
        console.error(`Input file ${filePath}.${extension} does not have jack extension, skipping`);
        return;
      }
      const text = fs.readFileSync(fPath, 'utf8');
      const finalFunc = xmlFlag ? toXml : compile;
      const output = finalFunc(toAst(tokenize(text)));
      fs.writeFileSync(pathParts.join('.').concat(xmlFlag ? '.xml' : '.vm'), output);
  });
} catch (e) {
  console.error(e);
  process.exit(1);
}
