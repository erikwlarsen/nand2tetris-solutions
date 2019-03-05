class ReadableHelper {
  constructor(readable) {
    this._r = readable;
  }

  loadContentsOfLocal(index) {
    this.loadConstant(index);
    this.loadAIntoD();
    this.loadAddressOfLocal();
    this._r.push('A=M+D\n'); // get pointer to correct local location
    this.loadMIntoD();
  }

  loadAddressOfLocal() {
    this._r.push('@LCL\n');
  }

  loadContentsOfArgument(index) {
    this.loadConstant(index);
    this.loadAIntoD();
    this.loadAddressOfArgument();
    this._r.push('A=M+D\n');
    this.loadMIntoD();
  }

  loadAddressOfArgument() {
    this._r.push('@ARG\n');
  }

  loadContentsOfThis(index) {
    this.loadConstant(index);
    this.loadAIntoD();
    this.loadAddressOfThis();
    this._r.push('A=M+D\n');
    this.loadMIntoD();
  }

  loadAddressOfThis() {
    this._r.push('@THIS\n');
  }

  loadContentsOfThat(index) {
    this.loadConstant(index);
    this.loadAIntoD();
    this.loadAddressOfThat();
    this._r.push('A=M+D\n');
    this.loadMIntoD();
  }

  loadAddressOfThat() {
    this._r.push('@THAT\n');
  }

  loadContentsOfTemp(index) {
    this.loadConstant(`R${5 + Number(index)}`);
    this.loadMIntoD();
  }

  loadContentsOfPointer(index) {
    this.loadConstant(`R${3 + Number(index)}`);
    this.loadMIntoD();
  }

  loadContentsOfStatic(index) {
    this.loadConstant(`${this._className}.${index}`);
    this.loadMIntoD();
  }

  setMToFalse() {
    this._r.push('M=0\n');
  }

  setMToTrue() {
    this._r.push('M=-1\n');
  }

  addJumpLabel(label) {
    this._r.push(`(${label})\n`);
  }

  loadContentsOfStackPointer() {
    this.loadAddressOfStackPointer();
    this.loadMIntoA();
  }

  loadConstantOntoStack(constant) {
    this.loadConstant(constant);
    this.loadAIntoD();
    this.loadContentsOfStackPointer();
    this.loadDIntoM();
    this.incrementStackPointer();
  }

  incrementStackPointer() {
    this.loadAddressOfStackPointer();
    this._r.push('M=M+1\n');
  }

  decrementStackPointer() {
    this.loadAddressOfStackPointer();
    this._r.push('M=M-1\n');
  }

  jumpIfZero() {
    this._r.push('D;JEQ\n');
  }

  jumpIfGt() {
    this._r.push('D;JGT\n');
  }

  jumpIfLt() {
    this._r.push('D;JLT\n');
  }

  jump() {
    this._r.push('0;JMP\n');
  }

  loadConstant(constant) {
    this._r.push(`@${constant}\n`);
  }

  loadAddressOfStackPointer() {
    this._r.push('@SP\n');
  }

  loadDIntoM() {
    this._r.push('M=D\n');
  }

  loadAIntoD() {
    this._r.push('D=A\n');
  }

  loadMIntoA() {
    this._r.push('A=M\n');
  }

  loadMIntoD() {
    this._r.push('D=M\n');
  }
}

module.exports = { ReadableHelper };
