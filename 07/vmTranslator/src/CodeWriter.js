const { Transform } = require('stream');
const {
  commandTypes,
  arithmeticCmds,
  segments,
  SYS_INIT,
} = require('./constants');
const { ReadableHelper } = require('./ReadableHelper');

const noop = () => {};
/**
 * CodeWriter extends node's Transform stream and parses incoming objects
 * describing lines of VM code into Hack assembly code
 * Should be part of a streaming pipeline:
 * VM file -> MakeLines -> Parser -> CodeWriter -> Hack asm file
 */
class CodeWriter extends Transform {
  constructor({ className, init }) {
    super({ writableObjectMode: true });
    // Set _initialized to false if there is no init flag so that stream is initialized
    this._initialized = !init;
    this._jumpCounter = 0;
    this._className = className;
    this._rh = new ReadableHelper(this);
  }

  _transform({ commandType, arg1, arg2 }, encoding, done) {
    if (!this._initialized) {
      this._initializeStream();
    }
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
    // Load illegal values into pointers to see if they are used
    // before they are initialized.
    this._rh.loadConstant(1);
    this.push('D=-A\n');
    this._rh.loadAddressOfLocal();
    this._rh.loadDIntoM();
    this._rh.loadConstant(2);
    this.push('D=-A\n');
    this._rh.loadAddressOfArgument();
    this._rh.loadDIntoM();
    this._rh.loadConstant(3);
    this.push('D=-A\n');
    this._rh.loadAddressOfThis();
    this._rh.loadDIntoM();
    this._rh.loadConstant(4);
    this.push('D=-A\n');
    this._rh.loadAddressOfThat();
    this._rh.loadDIntoM();
    // Call Sys.init function
    this._writeCall({ functionName: SYS_INIT, numArgs: 0, done: noop });
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
        this.push('M=-M\n');
        break;
      case arithmeticCmds.NOT:
        this.push('M=!M\n');
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
    const label = `${this._className}.RET${this._jumpCounter}`;
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
    this._rh.addJumpLabel(functionName);
    // Initialize local variables to 0
    for (let i = Number(numLocals); i > 0; i -= 1) {
      this._rh.loadConstantOntoStack(0);
    }
    return done();
  }

  _writeCall({ functionName, numArgs, done }) {
    const returnLabel = this._createJumpLabel();
    // Put current context pointers in stack
    this._rh.loadConstant(returnLabel);
    this._rh.loadAIntoD();
    this._rh.loadContentsOfStackPointer();
    this._rh.loadDIntoM();
    this._rh.incrementStackPointer();
    this._rh.loadPointerValueOntoStack('LCL');
    this._rh.loadPointerValueOntoStack('ARG');
    this._rh.loadPointerValueOntoStack('THIS');
    this._rh.loadPointerValueOntoStack('THAT');
    // Set the ARG pointer back to (SP - (numArgs + current context pointers))
    this._rh.loadConstant(numArgs);
    this._rh.loadAIntoD();
    this._rh.loadConstant(5); // # of current context pointers
    this.push('D=D+A\n');
    this._rh.loadAddressOfStackPointer();
    this.push('D=M-D\n');
    this._rh.loadAddressOfArgument();
    this._rh.loadDIntoM();
    // reposition LCL
    this._rh.loadAddressOfStackPointer();
    this._rh.loadMIntoD();
    this._rh.loadAddressOfLocal();
    this._rh.loadDIntoM();
    // Jump to function
    this._rh.loadConstant(functionName);
    this._rh.jump();
    // Provide label to return to after function
    this._rh.addJumpLabel(returnLabel);
    return done();
  }

  _writeReturn({ done }) {
    /**
     * First of all, create the FRAME pointer value and use it to grab the return
     * label. It will initially point the same place as LCL. Need to grab this now,
     * since in cases where there are no arguments for the current function call it
     * will be overwritten by the next steps.
     */
    this._rh.loadAddressOfLocal();
    this._rh.loadMIntoD();
    // put FRAME in R13
    this._rh.loadConstant('R13');
    this._rh.loadDIntoM();
    // Use FRAME - 5 to retrieve the value of the return label
    this._rh.loadConstant(5);
    this.push('A=D-A\n');
    this._rh.loadMIntoD();
    // put return label in R14
    this._rh.loadConstant('R14');
    this._rh.loadDIntoM();
    /**
     * Need to store the value on top of the stack (where LCL is pointing)
     * in the location ARG is pointing, since this will be the top of
     * the stack once we return to the calling function
     * 1. Decrement stack pointer and store value at SP location in D (aka pop it!)
     * 2. Store that value in the ARG register
     * 3. Set stack pointer to be pointing to ARG + 1
     */

    this._rh.decrementStackPointer();
    this._rh.loadMIntoA();
    this._rh.loadMIntoD();
    this._rh.loadAddressOfArgument();
    this._rh.loadMIntoA();
    this._rh.loadDIntoM();
    this._rh.loadAIntoD();
    this._rh.loadAddressOfStackPointer();
    this.push('M=D+1\n');
    /**
     * Now that we have the return value ready, go about restoring the
     * stack by doing the following:
     * 1. Create a FRAME pointer variable from LCL pointer and store it.
     * 2. Use decrementing FRAME pointer to pop THAT, THIS, ARG, and LCL
     *    locations from outer function scope off the stack and restore them.
     * 3. Finally, load the return label from R14 and JUMP!
     */
    // Restore THAT
    this._rh.restoreRegister('R13', 'THAT');
    // Restore THIS
    this._rh.restoreRegister('R13', 'THIS');
    // Restore ARG
    this._rh.restoreRegister('R13', 'ARG');
    // Restore LCL
    this._rh.restoreRegister('R13', 'LCL');
    // Get return address and jump to it
    this._rh.loadConstant('R14');
    this._rh.loadMIntoA();
    this._rh.jump();
    return done();
  }
}

module.exports = { CodeWriter };
