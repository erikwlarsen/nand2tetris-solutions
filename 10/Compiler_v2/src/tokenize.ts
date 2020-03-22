import { TokenType, TokenDetails } from './types/tokenize.types';

const keywordRegex = /^(class|method|function|constructor|int|boolean|char|void|var|static|field|let|do|if|else|while|return|true|false|null|this)/;
const symbolRegex = /^({|}|\(|\)|\[|]|\.|,|;|\+|-|\*|\/|&|\||<|>|=|~)/;
const identifierRegex = /^[a-zA-Z][a-zA-Z0-9_]*/;
const integerRegex = /^\d+/;
const stringRegex = /^".*"/;

export const removeMultilineComments = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, '');

export const removeOnelineComments = (text: string) => text.replace(/\/\/.*/g, '');

export const removeToken = (token: string, text: string) => {
  return text.slice(token.length);
};

export const extractToken = (prevToken: TokenDetails, text: string, regex: RegExp, tokenType: TokenType): { token: TokenDetails, text: string } => {
  if (prevToken.exists) {
    return { token: prevToken, text };
  }
  const [value] = text.match(regex) || [''];
  return {
    token: { value, exists: !!value, tokenType },
    text
  };
};

export const extractTokens = (tokens: TokenDetails[], text: string): TokenDetails[] => {
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
    { token, text }: { token: TokenDetails, text: string },
    { regex, tokenType }
  ) => {
    return extractToken(token, text, regex, tokenType);
  }, {
    token: { value: '', exists: false, tokenType: 'NONE' },
    text: trimmedText
  });
  return extractTokens(tokens.concat(token), removeToken(token.value, trimmedText));
};

export default (text: string) =>
  extractTokens([], removeOnelineComments(removeMultilineComments(text)));

