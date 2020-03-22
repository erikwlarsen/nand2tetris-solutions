type TokenType = 'KEYWORD'|'SYMBOL'|'IDENTIFIER'|'INT_CONST'|'STRING_CONST'|'NONE';
interface TokenBase {
  tokenType: TokenType;
  value: string;
  exists: boolean;
}

const keywordRegex = /^(CLASS|METHOD|FUNCTION|CONSTRUCTOR|INT|BOOLEAN|CHAR|VOID|VAR|STATIC|FIELD|LET|DO|IF|ELSE|WHILE|RETURN|TRUE|FALSE|NULL|THIS)/;
const symbolRegex = /^({|}|\(|\)|\[|]|\.|,|;|\+|-|\*|\/|&|\||<|>|=|~)/;
const identifierRegex = /^[a-zA-Z][a-zA-Z0-9_]*/;
const integerRegex = /^\d+/;
const stringRegex = /^".*"/;

const removeMultilineComments = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, '');

const removeOnelineComments = (text: string) => text.replace(/\/\/.*/g, '');

const extractToken = (token: TokenBase, text: string, regex: RegExp, tokenType: TokenType): { token: TokenBase, text: string } => {
  if (token.exists) {
    return { token, text };
  }
  const [value] = text.match(regex) || [''];
  return {
    token: { value, exists: !!value, tokenType },
    text
  };
};

const removeToken = (token: string, text: string) => {
  return text.slice(token.length);
}

const extractTokens = (tokens: TokenBase[], text: string): TokenBase[] => {
  const trimmedText = text.trim();
  if (!trimmedText) {
    return tokens;
  }
  const tokenTypes: { regex: RegExp, tokenType: TokenType }[] = [
    { regex: keywordRegex, tokenType: 'KEYWORD' },
    { regex: symbolRegex, tokenType: 'SYMBOL' },
    { regex: identifierRegex, tokenType: 'IDENTIFIER' },
    { regex: integerRegex, tokenType: 'INT_CONST' },
    { regex: stringRegex, tokenType: 'STRING_CONST' },
  ];
  const { token } = tokenTypes.reduce((
    { token, text }: { token: TokenBase, text: string},
    { regex, tokenType }: { regex: RegExp, tokenType: TokenType }
  ) => {
    return extractToken(token, text, regex, tokenType);
  }, { token: { value: '', exists: false, tokenType: 'NONE' }, text: trimmedText });
  return extractTokens(tokens.concat(token), removeToken(token.value, trimmedText));
};

export default (text: string) =>
  extractTokens([], removeOnelineComments(removeMultilineComments(text)));
