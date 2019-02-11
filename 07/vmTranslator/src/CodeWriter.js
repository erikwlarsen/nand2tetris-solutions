const { Transform } = require('stream');
const { commandTypes, arithmeticCmds } = require('./constants');

/**
 * CodeWriter extends node's Transform stream and parses incoming objects
 * describing lines of VM code into Hack assembly code
 * Should be part of a streaming pipeline:
 * VM file -> MakeLines -> Parser -> CodeWriter -> Hack asm file
 */
class CodeWriter extends Transform {
  constructor() {
    super({ writableObjectMode: true });
    this._initialized = false;
    this.jumpCounter = 0;
  }

  _initializeStream() {
    this._loadConstant(256);
    this._loadAIntoD();
    this._loadAddressOfStackPointer();
    this._loadDIntoM();
    this._initialized = true;
  }

  _writeArithmetic({ command, done }) {
    // Initialize jump labels for EQ/GT/LT commands
    let trueLabel;
    let continueLabel;

    this._decrementStackPointer();
    this._loadContentsOfStackPointer();
    switch (command) {
      case arithmeticCmds.ADD:
        this._loadMIntoD();
        this._decrementStackPointer();
        this._loadContentsOfStackPointer();
        this.push('M=M+D\n');
        break;
      case arithmeticCmds.SUB:
        this._loadMIntoD();
        this._decrementStackPointer();
        this._loadContentsOfStackPointer();
        this.push('M=M-D\n');
        break;
      case arithmeticCmds.AND:
        this._loadMIntoD();
        this._decrementStackPointer();
        this._loadContentsOfStackPointer();
        this.push('M=D&M\n');
        break;
      case arithmeticCmds.OR:
        this._loadMIntoD();
        this._decrementStackPointer();
        this._loadContentsOfStackPointer();
        this.push('M=D|M\n');
        break;
      case arithmeticCmds.NEG:
        this.push('M=!M\n');
        break;
      case arithmeticCmds.NOT:
        this.push('M=-M\n');
        break;
      case arithmeticCmds.EQ:
        trueLabel = this._createJumpLabel();
        continueLabel = this._createJumpLabel();
        this._loadMIntoD();
        this._decrementStackPointer();
        this._loadContentsOfStackPointer();
        this.push('D=M-D\n');
        this._loadConstant(trueLabel);
        this._jumpIfZero();
        this._loadContentsOfStackPointer();
        this._setMToFalse();
        this._loadConstant(continueLabel);
        this._jump();
        this._addJumpLabel(trueLabel);
        this._loadContentsOfStackPointer();
        this._setMToTrue();
        this._addJumpLabel(continueLabel);
        break;
      case arithmeticCmds.GT:
        trueLabel = this._createJumpLabel();
        continueLabel = this._createJumpLabel();
        this._loadMIntoD();
        this._decrementStackPointer();
        this._loadContentsOfStackPointer();
        this.push('D=M-D\n');
        this._loadConstant(trueLabel);
        this._jumpIfGt();
        this._loadContentsOfStackPointer();
        this._setMToFalse();
        this._loadConstant(continueLabel);
        this._jump();
        this._addJumpLabel(trueLabel);
        this._loadContentsOfStackPointer();
        this._setMToTrue();
        this._addJumpLabel(continueLabel);
        break;
      case arithmeticCmds.LT:
        trueLabel = this._createJumpLabel();
        continueLabel = this._createJumpLabel();
        this._loadMIntoD();
        this._decrementStackPointer();
        this._loadContentsOfStackPointer();
        this.push('D=M-D\n');
        this._loadConstant(trueLabel);
        this._jumpIfLt();
        this._loadContentsOfStackPointer();
        this._setMToFalse();
        this._loadConstant(continueLabel);
        this._jump();
        this._addJumpLabel(trueLabel);
        this._loadContentsOfStackPointer();
        this._setMToTrue();
        this._addJumpLabel(continueLabel);
        break;
      default:
    }
    this._incrementStackPointer();
    return done();
  }

  _createJumpLabel() {
    const label = `RET${this.jumpCounter}`;
    this.jumpCounter += 1;
    return label;
  }

  _writePushPop({
    commandType,
    segment,
    index,
    done,
  }) {
    if (commandType === commandTypes.C_PUSH) {
      if (segment === 'constant') {
        this._loadConstant(index);
        this._loadAIntoD();
      }
      this._loadContentsOfStackPointer();
      this._loadDIntoM();
      this._incrementStackPointer();
    }
    return done();
  }

  _setMToFalse() {
    this.push('M=0\n');
  }

  _setMToTrue() {
    this.push('M=-1\n');
  }

  _addJumpLabel(label) {
    this.push(`(${label})\n`);
  }

  _loadContentsOfStackPointer() {
    this._loadAddressOfStackPointer();
    this._loadMIntoA();
  }

  _incrementStackPointer() {
    this._loadAddressOfStackPointer();
    this.push('M=M+1\n');
  }

  _decrementStackPointer() {
    this._loadAddressOfStackPointer();
    this.push('M=M-1\n');
  }

  _jumpIfZero() {
    this.push('D;JEQ\n');
  }

  _jumpIfGt() {
    this.push('D;JGT\n');
  }

  _jumpIfLt() {
    this.push('D;JLT\n');
  }

  _jump() {
    this.push('0;JMP\n');
  }

  _loadConstant(num) {
    this.push(`@${num}\n`);
  }

  _loadAddressOfStackPointer() {
    this.push('@SP\n');
  }

  _loadDIntoM() {
    this.push('M=D\n');
  }

  _loadAIntoD() {
    this.push('D=A\n');
  }

  _loadMIntoA() {
    this.push('A=M\n');
  }

  _loadMIntoD() {
    this.push('D=M\n');
  }

  _transform({ commandType, arg1, arg2 }, encoding, done) {
    if (!this._initialized) {
      this._initializeStream();
    }
    switch (commandType) {
      case commandTypes.C_ARITHMETIC:
        return this._writeArithmetic({ command: arg1, done });
      case commandTypes.C_PUSH:
      case commandTypes.C_POP:
        return this._writePushPop({
          commandType,
          segment: arg1,
          index: arg2,
          done,
        });
      default:
        return done();
    }
  }
}

module.exports = { CodeWriter };
