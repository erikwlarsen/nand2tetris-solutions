"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class SymbolTable {
    constructor(scopeName, fnType, parent) {
        this.parent = parent;
        this.scopeName = scopeName;
        this.fnType = fnType;
        this.scope = {};
        this.currentLabel = 0;
    }
    declare(name, type, kind) {
        if (name in this.scope) {
            throw new SyntaxError(`Identifier ${name} has already been declared`);
        }
        const index = this.getIndex(kind);
        this.scope[name] = { type, kind, index };
    }
    getIndex(varKind) {
        return (Math.max(-1, ...Object.values(this.scope)
            .filter(({ kind }) => varKind === kind)
            .map(({ index }) => index))) + 1;
    }
    getVariable(name) {
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
}
exports.default = SymbolTable;
//# sourceMappingURL=SymbolTable.js.map