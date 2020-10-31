export type TokenType = 'KEYWORD'|'SYMBOL'|'IDENTIFIER'|'INT_CONST'|'STRING_CONST';
export interface TokenDetails {
  tokenType: TokenType;
  value: string;
  exists: boolean;
}
export interface TokenListItem {
  tokenType: TokenType
  value: string;
  next?: TokenListItem;
  tail: boolean;
}
export interface XzibitNode {
  value: string;
  children: (TerminalNode|XzibitNode)[];
  isTerminal: false;
}
export interface TerminalNode {
  value: string;
  tokenType: TokenType;
  isTerminal: true;
}
export type SiblingNodes = (XzibitNode|TerminalNode)[];
export type TokenFunc = (token: TokenListItem) =>
  { token: TokenListItem, nodes: SiblingNodes }
export type XOrMore = (token: TokenListItem, fn: TokenFunc, moreThanOne: boolean) =>
  { token: TokenListItem, nodes: SiblingNodes }
export type  MultiTokenFunc = (token: TokenListItem, fns: TokenFunc[]) =>
  { token: TokenListItem, nodes: SiblingNodes }
export type HigherOrderTokenFunc = (values: string[]) => (token: TokenListItem) =>
  { token: TokenListItem, nodes: SiblingNodes }

export type identifier = string;

export type VarKind = 'static'|'field'|'arg'|'var';
export type VarType = 'int'|'string'|identifier;

export interface VarDetails {
  type: VarType;
  kind: string;
  index: number;
}

export interface PartialVarDetails {
  kind: VarKind;
  type?: VarType;
}

export interface Scope {
  [varName: string]: VarDetails;
}

export type SegmentType = 'CONSTANT'|'LOCAL'|'ARGUMENT'|'THIS'|'THAT'|'POINTER'|'TEMP'|'STATIC';
