"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const keywordRegex = /^(class|method|function|constructor|int|boolean|char|void|var|static|field|let|do|if|else|while|return|true|false|null|this)\b/;
const symbolRegex = /^({|}|\(|\)|\[|]|\.|,|;|\+|-|\*|\/|&|\||<|>|=|~)/;
const identifierRegex = /^[a-zA-Z][a-zA-Z0-9_]*/;
const integerRegex = /^\d+/;
const stringRegex = /^".*"/;
exports.removeMultilineComments = (text) => text.replace(/\/\*[\s\S]*?\*\//g, '');
exports.removeOnelineComments = (text) => text.replace(/\/\/.*/g, '');
exports.removeToken = (token, text) => {
    return text.slice(token.length);
};
exports.extractToken = (prevToken, text, regex, tokenType) => {
    if (prevToken.exists) {
        return { token: prevToken, text };
    }
    const [value] = text.match(regex) || [''];
    return {
        token: { value, exists: !!value, tokenType },
        text
    };
};
exports.extractTokens = (tokens, text) => {
    const trimmedText = text.trim();
    if (!trimmedText) {
        return tokens;
    }
    const tokenTypes = [
        { regex: keywordRegex, tokenType: 'KEYWORD' },
        { regex: symbolRegex, tokenType: 'SYMBOL' },
        { regex: identifierRegex, tokenType: 'IDENTIFIER' },
        { regex: integerRegex, tokenType: 'INT_CONST' },
        { regex: stringRegex, tokenType: 'STRING_CONST' },
    ];
    const { token } = tokenTypes.reduce(({ token, text }, { regex, tokenType }) => {
        return exports.extractToken(token, text, regex, tokenType);
    }, {
        token: { value: '', exists: false, tokenType: 'KEYWORD' },
        text: trimmedText
    });
    return exports.extractTokens(tokens.concat(token), exports.removeToken(token.value, trimmedText));
};
exports.default = (text) => exports.extractTokens([], exports.removeOnelineComments(exports.removeMultilineComments(text)));
//# sourceMappingURL=tokenize.js.map