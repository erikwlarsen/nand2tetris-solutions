import tokenize from './tokenize';
import { readFileSync } from 'fs';
import { resolve } from 'path';
console.log('bloop'); 
const text = readFileSync(resolve(__dirname, '../../ArrayTest/Main.jack')).toString();
console.log(text);
console.log(tokenize(text));
