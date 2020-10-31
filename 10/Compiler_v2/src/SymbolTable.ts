import { Scope, VarDetails, VarType, VarKind, PartialVarDetails } from './types';

export default class SymbolTable {
  parent?: SymbolTable;
  scope: Scope;
  scopeName: string;
  fnType: string;
  currentLabel: 0;

  constructor(scopeName: string, fnType: string, parent?: SymbolTable) {
    this.parent = parent;
    this.scopeName = scopeName;
    this.fnType = fnType;
    this.scope = {};
    this.currentLabel = 0;
  }

  declare(name: string, type: VarType, kind: string) {
    if (name in this.scope) {
      throw new SyntaxError(`Identifier ${name} has already been declared`);
    }
    const index = this.getIndex(kind);
    this.scope[name] = { type, kind, index };
  }

  getIndex(varKind: string) {
    return (Math.max(-1, ...Object.values(this.scope)
      .filter(({ kind }) => varKind === kind)
      .map(({ index }) => index)
    )) + 1;
  }

  getVariable(name: string): VarDetails|false {
    if (name in this.scope) {
      return this.scope[name];
    }
    if (this.parent) {
      return this.parent.getVariable(name);
    }
    return false;
  }

  getParentScopeName() {
    if (!this.parent) {
      throw new Error('Attempted to access parent scope that does not exist');
    }
    return this.parent.scopeName;
  }

  getNewLabel() {
    const label = `${this.getParentScopeName()}_${this.scopeName}_${this.currentLabel}`;
    this.currentLabel += 1;
    return label;
  }

  // addPendingKind(kind: VarKind) {
  //   if (this.pendingVar) {
  //     throw new Error('Attempted to initialize conflicting variables');
  //   }
  //   this.pendingVar = { kind };
  // }

  // addPendingType(type: VarType) {
  //   if (!this.pendingVar) {
  //     throw new Error('Attempted declare type of variable before kind');
  //   }
  //   this.pendingVar.type = type;
  // }

  // resolvePendingVar(name: string) {
  //   if (this.pendingVar) {
  //     if (!this.pendingVar.type) {
  //       throw new Error('Attempted to initialize variable without type');
  //     }
  //     this.declare(name, this.pendingVar.type, this.pendingVar.kind);
  //     delete this.pendingVar;
  //   }
  // }
}