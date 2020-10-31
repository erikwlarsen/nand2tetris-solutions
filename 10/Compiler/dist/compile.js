"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const SymbolTable_1 = __importDefault(require("./SymbolTable"));
// type TerminalFn = (node: TerminalNode, vm: string, table?: SymbolTable) => string;
const varKindMemSegmentMap = {
    var: 'local',
    arg: 'argument',
    field: 'this',
    static: 'static',
};
const NUM_LOCALS_TEMPLATE = '{{NUM_LOCALS_DOOD}}';
class Unexpected extends Error {
    constructor(expected, parent, actualValue, actualType) {
        super(`Expected to encounter ${expected} in ${parent}, found ${actualType} ${actualValue}`);
    }
}
const compileChildren = (children, table) => {
    let vm = '';
    for (const childNode of children) {
        if (!childNode.isTerminal) {
            vm = vm.concat(compile[childNode.value](childNode, table));
        }
    }
    return vm;
};
const compile = {
    class(tree, parentTable) {
        const className = tree.children[1].value;
        const table = new SymbolTable_1.default(className, 'class', parentTable);
        return compileChildren(tree.children, table);
    },
    classVarDec(tree, parentTable) {
        let i = 0;
        let varKind;
        let varType;
        while (i < tree.children.length) {
            varKind = varKind || tree.children[i++].value;
            varType = varType || tree.children[i++].value;
            const identifier = tree.children[i++].value;
            if (parentTable) {
                parentTable.declare(identifier, varType, varKind);
            }
            i += 1; // move past comma if it's there
        }
        return '';
    },
    subroutineDec(tree, parentTable) {
        const fnType = tree.children[0].value;
        // const returnType = tree.children[1].value;
        const subroutineName = tree.children[2].value;
        const table = new SymbolTable_1.default(subroutineName, fnType, parentTable);
        const parentName = table.getParentScopeName();
        let vm = vmWriter.functionName(`${parentName}.${subroutineName}`);
        if (fnType === 'constructor') {
            // Get size of object we're creating
            const objectSize = parentTable.getIndex('field');
            console.log(objectSize);
            // allocate memory and get address on stop of stack
            vm = vm.concat(vmWriter.alloc(objectSize));
            // pop memory address to pointer 0 (aka THIS base address)
            vm = vm.concat(vmWriter.popToPointer(0));
        }
        else if (fnType === 'method') {
            // For methods, `this` is the first argument by default
            table.declare('this', table.getParentScopeName(), 'arg');
            vm = vm.concat(vmWriter.methodInitializeThis());
        }
        vm = vm.concat(compileChildren(tree.children, table));
        // Now that we know how many locals there are, populate the function locals
        vm = vm.replace(NUM_LOCALS_TEMPLATE, String(table.getIndex('var')));
        return vm;
    },
    parameterList(tree, functionTable) {
        const varKind = 'arg';
        for (let i = 0; i < tree.children.length; i += 3) {
            const varType = tree.children[i].value;
            const varName = tree.children[i + 1].value;
            functionTable.declare(varName, varType, varKind);
        }
        return '';
    },
    subroutineBody(tree, parentTable) {
        let vm = compileChildren(tree.children, parentTable);
        return vm;
    },
    varDec(tree, parentTable) {
        const varKind = 'var';
        let varType;
        let i = 1; // Skip initial 'var', since we already know it's there
        for (i; i < tree.children.length; i += 2) {
            if (!varType) {
                varType = tree.children[i].value;
            }
            const varName = tree.children[i + 1] && tree.children[i + 1].value;
            if (varName) {
                parentTable.declare(varName, varType, varKind);
            }
        }
        return '';
    },
    statements(tree, parentTable) {
        let vm = compileChildren(tree.children, parentTable);
        return vm;
    },
    letStatement(tree, parentTable) {
        // let varName = expression;
        // let varName[expression] = expression;
        const varName = tree.children[1].value;
        const variable = parentTable.getVariable(varName);
        if (!variable) {
            throw new Error(`Attempted to assign ${variable} before it was declared`);
        }
        let assignmentExpression;
        const hasIndexingExpression = tree.children[2].value === '[';
        if (hasIndexingExpression) {
            assignmentExpression = tree.children[6];
        }
        else {
            assignmentExpression = tree.children[3];
        }
        if (assignmentExpression.isTerminal) {
            throw new Unexpected('assignment expression', 'letStatement', assignmentExpression.value, assignmentExpression.tokenType);
        }
        // write vm for right side of assignment
        const rightSideVm = compile.expression(assignmentExpression, parentTable);
        let leftSideVm;
        if (hasIndexingExpression) {
            const indexingExpression = tree.children[3];
            if (indexingExpression.isTerminal) {
                throw new Unexpected('indexing expression', 'letStatement', indexingExpression.value, indexingExpression.tokenType);
            }
            const idxExprVm = compile.expression(indexingExpression, parentTable);
            // Add memory addresses of expression and identifier (which is an array),
            // pop that address to pointer 1, and then pop the output of the evaluated
            // right side of the expression to the address.
            leftSideVm = idxExprVm
                .concat(vmWriter.pushIdentifier(variable.kind, variable.index))
                .concat(vmWriter.op('+', false))
                .concat(vmWriter.popToPointer(1))
                .concat(vmWriter.popToThat(0));
        }
        else {
            leftSideVm = vmWriter.popToIdentifier(variable.kind, variable.index);
        }
        return rightSideVm.concat(leftSideVm);
    },
    expression(tree, parentTable) {
        let vm = '';
        const [firstTerm] = tree.children;
        if (!firstTerm.isTerminal) {
            vm = vm.concat(compile.term(firstTerm, parentTable));
        }
        for (let i = 1; i < tree.children.length; i += 2) {
            const op = tree.children[i];
            const termNode = tree.children[i + 1];
            if (!termNode.isTerminal) {
                vm = vm.concat(compile.term(termNode, parentTable));
                vm = vm.concat(vmWriter.op(op.value, false));
            }
        }
        return vm;
    },
    expressionList(tree, parentTable) {
        const [firstExpression] = tree.children;
        if (firstExpression.isTerminal) {
            throw new Unexpected('expression', 'expressionList', firstExpression.value, firstExpression.tokenType);
        }
        let vm = compile.expression(firstExpression, parentTable);
        for (let i = 1; i < tree.children.length; i += 2) {
            const expression = tree.children[i + 1];
            if (expression.isTerminal) {
                throw new Unexpected('expression', 'expressionList', expression.value, expression.tokenType);
            }
            vm = vm.concat(compile.expression(expression, parentTable));
        }
        return vm;
    },
    term(tree, parentTable) {
        let vm = '';
        const [firstNode, secondNode, thirdNode, fourthNode] = tree.children;
        if (firstNode.isTerminal) {
            switch (firstNode.tokenType) {
                case 'INT_CONST':
                    vm = vm.concat(vmWriter.pushIntConstant(Number(firstNode.value)));
                    break;
                case 'STRING_CONST':
                    vm = vm.concat(vmWriter.stringConstant(firstNode.value));
                    break;
                case 'KEYWORD':
                    //true, false, null, this
                    vm = vm.concat(vmWriter.pushKeywordConstant(firstNode.value));
                    break;
                case 'SYMBOL':
                    if ((firstNode.value === '-' || firstNode.value === '~')
                        && !secondNode.isTerminal) {
                        // (-|~)term
                        vm = vm.concat(compile.term(secondNode, parentTable));
                        vm = vm.concat(vmWriter.op(firstNode.value, true));
                    }
                    else if (firstNode.value === '('
                        && !secondNode.isTerminal
                        && secondNode.value === 'expression'
                        && thirdNode.value === ')') {
                        // (expression)
                        vm = vm.concat(compile.expression(secondNode, parentTable));
                    }
                    else {
                        throw new Unexpected('-|~|(', 'term', firstNode.value, firstNode.tokenType);
                    }
                    break;
                case 'IDENTIFIER':
                    const variable = parentTable.getVariable(firstNode.value);
                    if (!variable) {
                        throw new Error(`Attempted to access undeclared variable ${variable}`);
                    }
                    if (!secondNode) {
                        // varName
                        vm = vm.concat(vmWriter.pushIdentifier(variable.kind, variable.index));
                    }
                    else if (secondNode.value === '['
                        && !thirdNode.isTerminal
                        && thirdNode.value === 'expression'
                        && fourthNode.value === ']') {
                        // varName[expression]
                        // the expression here should resolve to an offset for var
                        vm = vm.concat(compile.expression(thirdNode, parentTable));
                        vm = vm.concat(vmWriter.pushIdentifier(variable.kind, variable.index));
                        vm = vm.concat(vmWriter.op('+', false));
                        vm = vm.concat(vmWriter.getIndirectReference(1));
                    }
                    break;
                default:
                    throw new Error(`Invalid token type ${firstNode.tokenType}`);
            }
        }
        else if (firstNode.value === 'subroutineCall') {
            // The only other option is a subroutine call
            vm = vm.concat(compile.subroutineCall(firstNode, parentTable));
        }
        return vm;
    },
    ifStatement(tree, parentTable) {
        // 'if' '(' expression ')' '{' statements '}' ( 'else' '{' statements '}' )?
        const [, , expression, , , statements, , , , elseStatements] = tree.children;
        if (expression.isTerminal) {
            throw new Unexpected('expression', 'ifStatement', expression.value, expression.tokenType);
        }
        const ifTrueLabel = parentTable.getNewLabel();
        const ifGotoVm = vmWriter.ifGoto(ifTrueLabel);
        const ifTrueLabelVm = vmWriter.label(ifTrueLabel);
        let gotoFalseVm;
        let ifFalseLabelVm;
        if (elseStatements) {
            const ifFalseLabel = parentTable.getNewLabel();
            gotoFalseVm = vmWriter.goto(ifFalseLabel);
            ifFalseLabelVm = vmWriter.label(ifFalseLabel);
        }
        const endLabel = parentTable.getNewLabel();
        const gotoEndVm = vmWriter.goto(endLabel);
        const endLabelVm = vmWriter.label(endLabel);
        const expressionVm = compile.expression(expression, parentTable);
        if (statements.isTerminal) {
            throw new Unexpected('statements', 'ifStatement', statements.value, statements.tokenType);
        }
        const statementsVm = compile.statements(statements, parentTable);
        // this handles if condition and statements
        let vm = expressionVm
            .concat(ifGotoVm)
            .concat(gotoFalseVm || gotoEndVm)
            .concat(ifTrueLabelVm)
            .concat(statementsVm)
            .concat(gotoEndVm);
        // now check if there is an else clause
        if (ifFalseLabelVm) {
            if (elseStatements.isTerminal) {
                throw new Unexpected('else statements', 'ifStatement', elseStatements.value, elseStatements.tokenType);
            }
            const elseStatementsVm = compile.statements(elseStatements, parentTable);
            vm = vm.concat(ifFalseLabelVm)
                .concat(elseStatementsVm)
                .concat(gotoEndVm);
        }
        vm = vm.concat(endLabelVm);
        return vm;
    },
    whileStatement(tree, parentTable) {
        // 'while' '(' expression ')' '{' statements '}'
        const startLabel = parentTable.getNewLabel();
        const gotoStartVm = vmWriter.goto(startLabel);
        const startLabelVm = vmWriter.label(startLabel);
        const endLabel = parentTable.getNewLabel();
        const ifGotoEndVm = vmWriter.ifGoto(endLabel);
        const endLabelVm = vmWriter.label(endLabel);
        const [, , expression, , , statements] = tree.children;
        if (expression.isTerminal) {
            throw new Unexpected('expression', 'whileStatement', expression.value, expression.tokenType);
        }
        if (statements.isTerminal) {
            throw new Unexpected('statements', 'whileStatement', statements.value, statements.tokenType);
        }
        // Compile expression and NOT it, since ifGotoEnd should be triggered by false value
        const expressionVm = compile.expression(expression, parentTable)
            .concat(vmWriter.op('~', true));
        const statementsVm = compile.statements(statements, parentTable);
        return startLabelVm
            .concat(expressionVm)
            .concat(ifGotoEndVm)
            .concat(statementsVm)
            .concat(gotoStartVm)
            .concat(endLabelVm);
    },
    doStatement(tree, parentTable) {
        let vm = compileChildren(tree.children, parentTable);
        return vm.concat(vmWriter.popIgnoredValue());
    },
    returnStatement(tree, parentTable) {
        const [, expressionOrSemicolon] = tree.children;
        const returnVm = vmWriter.return();
        if (expressionOrSemicolon.isTerminal) {
            // push 0 to the stack, since this function is void
            return vmWriter.pushIntConstant(0).concat(returnVm);
        }
        return compile.expression(expressionOrSemicolon, parentTable).concat(returnVm);
    },
    subroutineCall(tree, parentTable) {
        let vm = '';
        // If format is identifier.subroutine, then there is a context to the call
        const containsContext = tree.children[1].value === '.';
        if (!containsContext) {
            // If no context, we assume that the context is `this`
            // syntax: method(expressionList)
            const method = tree.children[0].value;
            const expressionList = tree.children[2];
            if (!expressionList.isTerminal) {
                const className = parentTable.getParentScopeName();
                // push `this` as first arg, then rest of args (expressionList)
                const numArgs = Math.ceil(expressionList.children.length / 2) + 1;
                vm = vm.concat(vmWriter.pushKeywordConstant('this'));
                vm = vm.concat(compile.expressionList(expressionList, parentTable));
                vm = vm.concat(vmWriter.functionCall(`${className}.${method}`, numArgs));
            }
            else {
                throw new Unexpected('expressionList', 'subroutineCall', expressionList.value, expressionList.tokenType);
            }
        }
        else {
            // syntax: context.subroutine(expressionList)
            const context = tree.children[0].value;
            const subroutine = tree.children[2].value;
            const expressionList = tree.children[4];
            if (!expressionList.isTerminal) {
                let numArgs = Math.ceil(expressionList.children.length / 2);
                const variable = parentTable.getVariable(context);
                // If context has been declared, we assume it's of the correct type and has
                // the subroutine that is being called.
                if (variable) {
                    // Increment args since we will pass in `this`
                    numArgs += 1;
                    vm = vm.concat(vmWriter.pushIdentifier(variable.kind, variable.index));
                }
                // If we have no reference for the calling context, we can assume this
                // is a static method of another class that doesn't need a `this` reference.
                vm = vm.concat(compile.expressionList(expressionList, parentTable));
                vm = vm.concat(vmWriter.functionCall(`${context}.${subroutine}`, numArgs));
            }
        }
        return vm;
    },
};
const vmWriter = {
    functionName(name) {
        return `function ${name} ${NUM_LOCALS_TEMPLATE} \n`;
    },
    functionCall(name, numArgs) {
        return `call ${name} ${numArgs}\n`;
    },
    // Point the THIS memory segment reference (stored at pointer 0) at the this arg
    methodInitializeThis() {
        return 'push argument 0\n'.concat(vmWriter.popToPointer(0));
    },
    alloc(size) {
        return `push constant ${size}\ncall Memory.alloc 1\n`;
    },
    popToPointer(index) {
        return `pop pointer ${index}\n`;
    },
    popToThat(index) {
        return `pop that ${index}\n`;
    },
    op(operator, isUnary) {
        switch (operator) {
            case '+':
                return 'add\n';
            case '-':
                if (isUnary) {
                    return 'neg\n';
                }
                return 'sub\n';
            case '*':
                return 'call Math.multiply 2\n';
            case '/':
                return 'call Math.divide 2\n';
            case '&':
                return 'and\n';
            case '|':
                return 'or\n';
            case '<':
                return 'lt\n';
            case '>':
                return 'gt\n';
            case '=':
                return 'eq\n';
            case '~':
                return 'not\n';
            default:
                throw new Error(`Unrecognized operator ${operator}`);
        }
    },
    pushIntConstant(int) {
        return `push constant ${int}\n`;
    },
    stringConstant(string) {
        const addChars = string.split('').map(c => `push constant ${c.charCodeAt(0)}\ncall String.appendChar 2\n`).join('');
        return `push constant ${string.length}\ncall String.new 1\n${addChars}`;
    },
    pushKeywordConstant(keyword) {
        switch (keyword) {
            case 'true':
                return 'push constant 0\nneg\n';
            case 'false':
            case 'null':
                return 'push constant 0\n';
            case 'this':
                return 'push pointer 0\n';
            default:
                throw new Error(`Unexpected keyword constant ${keyword}`);
        }
    },
    pushIdentifier(varKind, index) {
        const memSegment = varKindMemSegmentMap[varKind];
        return `push ${memSegment} ${index}\n`;
    },
    popToIdentifier(varKind, index) {
        const memSegment = varKindMemSegmentMap[varKind];
        return `pop ${memSegment} ${index}\n`;
    },
    getIndirectReference(pointerSegment) {
        const thisOrThat = pointerSegment === 0 ? 'this' : 'that';
        return `pop pointer ${pointerSegment}\npush ${thisOrThat} 0\n`;
    },
    popIgnoredValue() {
        return 'pop temp 7\n';
    },
    ifGoto(label) {
        return `if-goto ${label}\n`;
    },
    goto(label) {
        return `goto ${label}\n`;
    },
    label(label) {
        return `label ${label}\n`;
    },
    return() {
        return `return\n`;
    },
};
const globalTable = new SymbolTable_1.default('global', 'global');
exports.default = (ast) => (compile.class(ast, globalTable));
//# sourceMappingURL=compile.js.map