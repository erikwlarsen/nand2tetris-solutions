"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var keywordRegex = /^(CLASS|METHOD|FUNCTION|CONSTRUCTOR|INT|BOOLEAN|CHAR|VOID|VAR|STATIC|FIELD|LET|DO|IF|ELSE|WHILE|RETURN|TRUE|FALSE|NULL|THIS)/;
var symbolRegex = /^({|}|\(|\)|\[|]|\.|,|;|\+|-|\*|\/|&|\||<|>|=|~)/;
var identifierRegex = /^[a-zA-Z][a-zA-Z0-9_]*/;
var integerRegex = /^\d+/;
var stringRegex = /^".*"/;
var removeMultilineComments = function (text) { return text.replace(/\/\*[\s\S]*?\*\//g, ''); };
var removeOnelineComments = function (text) { return text.replace(/\/\/.*/g, ''); };
var extractToken = function (token, text, regex, tokenType) {
    if (token.exists) {
        return { token: token, text: text };
    }
    var value = (text.match(regex) || [''])[0];
    return {
        token: { value: value, exists: !!value, tokenType: tokenType },
        text: text
    };
};
var removeToken = function (token, text) {
    return text.slice(token.length);
};
var extractTokens = function (tokens, text) {
    var trimmedText = text.trim();
    if (!trimmedText) {
        return tokens;
    }
    var tokenTypes = [
        { regex: keywordRegex, tokenType: 'KEYWORD' },
        { regex: symbolRegex, tokenType: 'SYMBOL' },
        { regex: identifierRegex, tokenType: 'IDENTIFIER' },
        { regex: integerRegex, tokenType: 'INT_CONST' },
        { regex: stringRegex, tokenType: 'STRING_CONST' },
    ];
    var token = tokenTypes.reduce(function (_a, _b) {
        var token = _a.token, text = _a.text;
        var regex = _b.regex, tokenType = _b.tokenType;
        return extractToken(token, text, regex, tokenType);
    }, { token: { value: '', exists: false, tokenType: 'NONE' }, text: trimmedText }).token;
    return extractTokens(tokens.concat(token), removeToken(token.value, trimmedText));
};
exports.default = (function (text) {
    return extractTokens([], removeOnelineComments(removeMultilineComments(text)));
});
