class SymbolTable {
  constructor() {
    this._symbols = {};
  }

  _contains(symbol) {
    return symbol in this._symbols;
  }

  addEntry(symbol, address) {
    this._symbols[symbol] = address;
  }

  getAddress(symbol) {
    return this._symbols[symbol];
  }
}

let symbolTable;
module.exports = () => {
  if (!symbolTable) {
    return symbolTable = new SymbolTable();
  }
  return symbolTable;
}