const { Transform } = require('stream');
const { commandTypes, arithmeticCmds, segments } = require('./constants');
const { ReadableHelper } = require('./ReadableHelper');

/**
 * CodeWriter extends node's Transform stream and parses incoming objects
 * describing lines of VM code into Hack assembly code
 * Should be part of a streaming pipeline:
 * VM file -> MakeLines -> Parser -> CodeWriter -> Hack asm file
 */
class CodeWriter extends Transform {
  constructor({ className }) {
    super({ writableObjectMode: true });
    this._initialized = false;
    this._jumpCounter = 0;
    this._className = className;
    this._rh = new ReadableHelper(this);
  }

  _transform({ commandType, arg1, arg2 }, encoding, done) {
    // if (!this._initialized) {
    //   this._initializeStream();
    // }
    switch (commandType) {
      case commandTypes.C_ARITHMETIC:
        return this._writeArithmetic({ command: arg1, done });
      case commandTypes.C_PUSH:
        return this._writePush({
          segment: arg1,
          index: arg2,
          done,
        });
      case commandTypes.C_POP:
        return this._writePop({
          segment: arg1,
          index: arg2,
          done,
        });
      case commandTypes.C_LABEL:
        return this._writeLabel({
          label: arg1,
          done,
        });
      case commandTypes.C_GOTO:
        return this._writeGoto({
          label: arg1,
          done,
        });
      case commandTypes.C_IF:
        return this._writeIfGoto({
          label: arg1,
          done,
        });
      case commandTypes.C_FUNCTION:
        return this._writeFunction({
          functionName: arg1,
          numLocals: arg2,
          done,
        });
      case commandTypes.C_CALL:
        return this._writeCall({
          functionName: arg1,
          numArgs: arg2,
          done,
        });
      case commandTypes.C_RETURN:
        return this._writeReturn({ done });
      default:
        return done();
    }
  }

  _initializeStream() {
    this._rh.loadConstant(256);
    this._rh.loadAIntoD();
    this._rh.loadAddressOfStackPointer();
    this._rh.loadDIntoM();
    this._initialized = true;
  }

  _writeArithmetic({ command, done }) {
    // Initialize jump labels for EQ/GT/LT commands
    let trueLabel;
    let continueLabel;

    this._rh.decrementStackPointer();
    this._rh.loadContentsOfStackPointer();
    switch (command) {
      case arithmeticCmds.ADD:
        this._rh.loadMIntoD();
        this._rh.decrementStackPointer();
        this._rh.loadContentsOfStackPointer();
        this.push('M=M+D\n');
        break;
      case arithmeticCmds.SUB:
        this._rh.loadMIntoD();
        this._rh.decrementStackPointer();
        this._rh.loadContentsOfStackPointer();
        this.push('M=M-D\n');
        break;
      case arithmeticCmds.AND:
        this._rh.loadMIntoD();
        this._rh.decrementStackPointer();
        this._rh.loadContentsOfStackPointer();
        this.push('M=D&M\n');
        break;
      case arithmeticCmds.OR:
        this._rh.loadMIntoD();
        this._rh.decrementStackPointer();
        this._rh.loadContentsOfStackPointer();
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
        this._rh.loadMIntoD();
        this._rh.decrementStackPointer();
        this._rh.loadContentsOfStackPointer();
        this.push('D=M-D\n');
        this._rh.loadConstant(trueLabel);
        this._rh.jumpIfZero();
        this._rh.loadContentsOfStackPointer();
        this._rh.setMToFalse();
        this._rh.loadConstant(continueLabel);
        this._rh.jump();
        this._rh.addJumpLabel(trueLabel);
        this._rh.loadContentsOfStackPointer();
        this._rh.setMToTrue();
        this._rh.addJumpLabel(continueLabel);
        break;
      case arithmeticCmds.GT:
        trueLabel = this._createJumpLabel();
        continueLabel = this._createJumpLabel();
        this._rh.loadMIntoD();
        this._rh.decrementStackPointer();
        this._rh.loadContentsOfStackPointer();
        this.push('D=M-D\n');
        this._rh.loadConstant(trueLabel);
        this._rh.jumpIfGt();
        this._rh.loadContentsOfStackPointer();
        this._rh.setMToFalse();
        this._rh.loadConstant(continueLabel);
        this._rh.jump();
        this._rh.addJumpLabel(trueLabel);
        this._rh.loadContentsOfStackPointer();
        this._rh.setMToTrue();
        this._rh.addJumpLabel(continueLabel);
        break;
      case arithmeticCmds.LT:
        trueLabel = this._createJumpLabel();
        continueLabel = this._createJumpLabel();
        this._rh.loadMIntoD();
        this._rh.decrementStackPointer();
        this._rh.loadContentsOfStackPointer();
        this.push('D=M-D\n');
        this._rh.loadConstant(trueLabel);
        this._rh.jumpIfLt();
        this._rh.loadContentsOfStackPointer();
        this._rh.setMToFalse();
        this._rh.loadConstant(continueLabel);
        this._rh.jump();
        this._rh.addJumpLabel(trueLabel);
        this._rh.loadContentsOfStackPointer();
        this._rh.setMToTrue();
        this._rh.addJumpLabel(continueLabel);
        break;
      default:
    }
    this._rh.incrementStackPointer();
    return done();
  }

  _createJumpLabel() {
    const label = `RET${this._jumpCounter}`;
    this._jumpCounter += 1;
    return label;
  }

  _writePush({
    segment,
    index,
    done,
  }) {
    switch (segment) {
      case segments.CONSTANT:
        this._rh.loadConstant(index);
        this._rh.loadAIntoD();
        break;
      case segments.LOCAL:
        this._rh.loadContentsOfLocal(index);
        break;
      case segments.ARGUMENT:
        this._rh.loadContentsOfArgument(index);
        break;
      case segments.THIS:
        this._rh.loadContentsOfThis(index);
        break;
      case segments.THAT:
        this._rh.loadContentsOfThat(index);
        break;
      case segments.POINTER:
        this._rh.loadContentsOfPointer(index);
        break;
      case segments.TEMP:
        this._rh.loadContentsOfTemp(index);
        break;
      case segments.STATIC:
        this._rh.loadContentsOfStatic(index);
        break;
      default:
    }
    this._rh.loadContentsOfStackPointer();
    this._rh.loadDIntoM();
    this._rh.incrementStackPointer();
    return done();
  }

  /**
   * Basic strategy for popping:
   * 1) calculate memory register that will be popped from and store in @'R13'.
   * 2) decrement stack pointer.
   * 3) get contents of stack pointer and put in D.
   * 4) load contents of @'R13' into A.
   * 5) set M equal to D.
   * Pointer and Temp follow slightly simpler pattern, as their address can
   * be immediately calculated mathematically.
   */
  _writePop({
    segment,
    index,
    done,
  }) {
    switch (segment) {
      case segments.LOCAL:
        this._rh.loadConstant(index);
        this._rh.loadAIntoD();
        this._rh.loadAddressOfLocal();
        break;
      case segments.ARGUMENT:
        this._rh.loadConstant(index);
        this._rh.loadAIntoD();
        this._rh.loadAddressOfArgument();
        break;
      case segments.THIS:
        this._rh.loadConstant(index);
        this._rh.loadAIntoD();
        this._rh.loadAddressOfThis();
        break;
      case segments.THAT:
        this._rh.loadConstant(index);
        this._rh.loadAIntoD();
        this._rh.loadAddressOfThat();
        break;
      case segments.POINTER:
        this._rh.decrementStackPointer();
        this._rh.loadMIntoA();
        this._rh.loadMIntoD();
        this._rh.loadConstant(`R${3 + Number(index)}`);
        this._rh.loadDIntoM();
        return done();
      case segments.TEMP:
        this._rh.decrementStackPointer();
        this._rh.loadMIntoA();
        this._rh.loadMIntoD();
        this._rh.loadConstant(`R${5 + Number(index)}`);
        this._rh.loadDIntoM();
        return done();
      case segments.STATIC:
        this._rh.decrementStackPointer();
        this._rh.loadMIntoA();
        this._rh.loadMIntoD();
        this._rh.loadConstant(`${this._className}.${index}`);
        this._rh.loadDIntoM();
        return done();
      default:
    }
    this.push('D=M+D\n');
    this._rh.loadConstant('R13');
    this._rh.loadDIntoM();
    this._rh.decrementStackPointer();
    this._rh.loadMIntoA();
    this._rh.loadMIntoD();
    this._rh.loadConstant('R13');
    this._rh.loadMIntoA();
    this._rh.loadDIntoM();
    return done();
  }

  _writeLabel({ label, done }) {
    this._rh.addJumpLabel(label);
    return done();
  }

  _writeGoto({ label, done }) {
    this._rh.loadConstant(label);
    this._rh.jump();
    return done();
  }

  _writeIfGoto({ label, done }) {
    this._rh.decrementStackPointer();
    this._rh.loadContentsOfStackPointer();
    this._rh.loadMIntoD();
    this._rh.loadConstant(label);
    this._rh.jumpIfGt();
    return done();
  }

  _writeFunction({ functionName, numLocals, done }) {
    this._rh.addJumpLabel(`${this._className}.${functionName}`);
    // Initialize local variables to 0 ... is this right???
    for (let i = Number(numLocals); i > 0; i -= 1) {
      this._rh.loadConstantOntoStack(0);
    }
    return done();
  }

  _writeCall({ functionName, numArgs, done }) {
    const returnLabel = this._createJumpLabel();
    this._rh.loadConstantOntoStack(returnLabel);
    this._rh.loadConstantOntoStack('LCL');
    this._rh.loadConstantOntoStack('ARG');
    this._rh.loadConstantOntoStack('THIS');
    this._rh.loadConstantOntoStack('THAT');
    // reposition ARG
    // reposition LCL
    this._rh.loadConstant(`${this._className}.${functionName}`);
    this._rh.jump();
    this._rh.addJumpLabel(returnLabel);
    return done();
  }

  _writeReturn({ done }) {
    

    return done();
  }
}

module.exports = { CodeWriter };
