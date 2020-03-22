export type TokenType = 'KEYWORD'|'SYMBOL'|'IDENTIFIER'|'INT_CONST'|'STRING_CONST'|'NONE';
export interface TokenDetails {
  tokenType: TokenType;
  value: string;
  exists: boolean;
}
