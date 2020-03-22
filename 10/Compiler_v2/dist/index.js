"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const tokenize_1 = __importDefault(require("./tokenize"));
const fs_1 = require("fs");
const path_1 = require("path");
console.log('bloop');
const text = fs_1.readFileSync(path_1.resolve(__dirname, '../../ArrayTest/Main.jack')).toString();
console.log(text);
console.log(tokenize_1.default(text));
//# sourceMappingURL=index.js.map