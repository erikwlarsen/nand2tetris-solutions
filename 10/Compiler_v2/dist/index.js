"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const tokenize_1 = __importDefault(require("./tokenize"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
try {
    const [, , filePath] = process.argv;
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
    else {
        filesToProcess.push(fullPath);
    }
    filesToProcess.forEach((fPath) => {
        const pathParts = fPath.split('.');
        const extension = pathParts.pop();
        if (extension !== 'jack') {
            console.log(`Input file ${filePath}.${extension} does not have jack extension, skipping`);
            return;
        }
        const text = fs.readFileSync(fPath, 'utf8');
        const output = tokenize_1.default(text);
        fs.writeFileSync(pathParts.join('.').concat('.json'), JSON.stringify(output, null, 2));
    });
}
catch (e) {
    console.error(e);
    process.exit(1);
}
//# sourceMappingURL=index.js.map