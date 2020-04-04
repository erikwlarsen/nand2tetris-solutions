"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const DEFAULT_SPACING = 4;
const tokenTypeXmlMap = {
    KEYWORD: 'keyword',
    SYMBOL: 'symbol',
    IDENTIFIER: 'identifier',
    INT_CONST: 'integerConstant',
    STRING_CONST: 'stringConstant',
};
const toXml = (node, spaces = 0) => {
    const whitespace = ' '.repeat(spaces);
    if (node.isTerminal) {
        const tag = tokenTypeXmlMap[node.tokenType];
        return `${whitespace}<${tag}>${node.value}</${tag}>\n`;
    }
    const tag = node.value;
    return `${whitespace}<${tag}>
${node.children.map(nodelet => toXml(nodelet, spaces + DEFAULT_SPACING)).join('')}${whitespace}</${tag}>\n`;
};
exports.default = toXml;
//# sourceMappingURL=toXml.js.map