"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * The following are helper functions that help with general organziation and ordering
 * of compilation
 */
/**
 * Try a series of options, passed as callbacks. This function will only throw if none
 * of the options ends up working.
 */
exports.compileAny = (token, fns) => {
    let error = new Error('Unexpected token');
    for (let i = 0; i < fns.length; i++) {
        const callback = fns[i];
        try {
            return callback(token);
        }
        catch (err) {
            error = err;
        }
    }
    throw error;
};
/**
 * Execute an array of compilation functions in order, ultimately returning a concatenated
 * text output from all of them.
 */
exports.compileInOrder = (token, fns) => {
    const { currToken, currNodes } = fns.reduce(({ currToken, currNodes }, fn) => {
        const { token, nodes } = fn(currToken);
        return { currToken: token, currNodes: currNodes.concat(nodes) };
    }, { currToken: token, currNodes: [] });
    return { token: currToken, nodes: currNodes };
};
const zeroOrMore = (token, fn, moreThanOneOk) => {
    const nodes = [];
    let tokenPointer = token;
    let keepGoing = true;
    try {
        while (keepGoing) {
            const result = fn(tokenPointer);
            if (!result.nodes.length) {
                throw new Error('nothing to operate on, exiting retry loop');
            }
            nodes.push(...result.nodes);
            tokenPointer = result.token;
            if (!moreThanOneOk) {
                keepGoing = false;
            }
        }
    }
    catch (_err) {
        // Swallow errors, since zero occurences is fine
    }
    finally {
        return { nodes, token: tokenPointer };
    }
};
/**
 * The following are functions that compile sections of the code, generally increasing in
 * size as we move down through the file.
 */
exports.compileTerminal = (token, expected, terminalType) => {
    // If the next token is undefined, this indicates we are at the tail, which isn't a real token
    if (typeof token.next === 'undefined') {
        throw new Error('Unexpected end of input');
    }
    if (terminalType !== token.tokenType) {
        throw new Error(`Unexpected token ${token.value}`);
    }
    if (expected.length && !expected.includes(token.value)) {
        throw new Error(`Unexpected token ${token.value}`);
    }
    // console.log('compiled terminal', token.tokenType, token.value);
    return {
        nodes: [{
                tokenType: token.tokenType,
                value: token.value,
                isTerminal: true,
            }],
        token: token.next,
    };
};
exports.compileOp = (token) => exports.compileTerminal(token, ['+', '-', '*', '/', '&', '|', '<', '>', '='], 'SYMBOL');
exports.compileIdentifier = (token) => exports.compileTerminal(token, [], 'IDENTIFIER');
exports.compileSymbol = (values) => (token) => exports.compileTerminal(token, values, 'SYMBOL');
exports.compileKeyword = (values) => (token) => exports.compileTerminal(token, values, 'KEYWORD');
exports.compileType = (token) => exports.compileAny(token, [
    exports.compileKeyword(['int', 'char', 'boolean']),
    exports.compileIdentifier,
]);
exports.compileParameterList = (token) => {
    const result = zeroOrMore(token, (token) => exports.compileInOrder(token, [
        exports.compileType,
        exports.compileIdentifier,
        (token) => zeroOrMore(token, (token) => exports.compileInOrder(token, [
            exports.compileSymbol([',']),
            exports.compileType,
            exports.compileIdentifier,
        ]), true),
    ]), false);
    return {
        nodes: result.nodes.length
            ? [{
                    value: 'parameterList',
                    children: result.nodes,
                    isTerminal: false,
                }]
            : [],
        token: result.token,
    };
};
exports.compileVarDec = (token) => {
    const result = exports.compileInOrder(token, [
        exports.compileKeyword(['var']),
        exports.compileType,
        exports.compileIdentifier,
        (token) => zeroOrMore(token, (token) => exports.compileInOrder(token, [
            exports.compileSymbol([',']),
            exports.compileIdentifier,
        ]), true),
        exports.compileSymbol([';']),
    ]);
    return {
        nodes: [{
                value: 'varDec',
                children: result.nodes,
                isTerminal: false,
            }],
        token: result.token,
    };
};
exports.compileSubroutineCall = (token) => {
    const result = exports.compileAny(token, [
        (token) => exports.compileInOrder(token, [
            exports.compileIdentifier,
            exports.compileSymbol(['(']),
            exports.compileExpressionList,
            exports.compileSymbol([')']),
        ]),
        (token) => exports.compileInOrder(token, [
            exports.compileIdentifier,
            exports.compileSymbol(['.']),
            exports.compileIdentifier,
            exports.compileSymbol(['(']),
            exports.compileExpressionList,
            exports.compileSymbol([')']),
        ]),
    ]);
    return {
        nodes: [{
                value: 'subroutineCall',
                children: result.nodes,
                isTerminal: false,
            }],
        token: result.token,
    };
};
exports.compileTerm = (token) => {
    const result = exports.compileAny(token, [
        (token) => exports.compileTerminal(token, [], 'INT_CONST'),
        (token) => exports.compileTerminal(token, [], 'STRING_CONST'),
        exports.compileKeyword(['true', 'false', 'null', 'this']),
        (token) => exports.compileInOrder(token, [
            exports.compileSymbol(['(']),
            exports.compileExpression,
            exports.compileSymbol([')']),
        ]),
        (token) => exports.compileInOrder(token, [
            exports.compileSymbol(['-', '~']),
            exports.compileTerm,
        ]),
        exports.compileSubroutineCall,
        (token) => exports.compileInOrder(token, [
            exports.compileIdentifier,
            exports.compileSymbol(['[']),
            exports.compileExpression,
            exports.compileSymbol([']']),
        ]),
        exports.compileIdentifier,
    ]);
    return {
        nodes: [{
                value: 'term',
                children: result.nodes,
                isTerminal: false,
            }],
        token: result.token,
    };
};
exports.compileExpression = (token) => {
    const result = exports.compileInOrder(token, [
        exports.compileTerm,
        (token) => zeroOrMore(token, (token) => exports.compileInOrder(token, [
            exports.compileOp,
            exports.compileTerm
        ]), true),
    ]);
    return {
        nodes: [{
                value: 'expression',
                children: result.nodes,
                isTerminal: false,
            }],
        token: result.token,
    };
};
exports.compileExpressionList = (token) => {
    const result = zeroOrMore(token, (token) => exports.compileInOrder(token, [
        exports.compileExpression,
        (token) => zeroOrMore(token, (token) => exports.compileInOrder(token, [
            exports.compileSymbol([',']),
            exports.compileExpression,
        ]), true),
    ]), false);
    return {
        nodes: result.nodes.length
            ? [{
                    value: 'expressionList',
                    children: result.nodes,
                    isTerminal: false,
                }]
            : [],
        token: result.token,
    };
};
exports.compileLet = (token) => {
    const result = exports.compileInOrder(token, [
        exports.compileKeyword(['let']),
        exports.compileIdentifier,
        (token) => zeroOrMore(token, (token) => exports.compileInOrder(token, [
            exports.compileSymbol(['[']),
            exports.compileExpression,
            exports.compileSymbol([']']),
        ]), false),
        exports.compileSymbol(['=']),
        exports.compileExpression,
        exports.compileSymbol([';']),
    ]);
    return {
        nodes: [{
                value: 'letStatement',
                children: result.nodes,
                isTerminal: false,
            }],
        token: result.token,
    };
};
exports.compileIf = (token) => {
    const result = exports.compileInOrder(token, [
        exports.compileKeyword(['if']),
        exports.compileSymbol(['(']),
        exports.compileExpression,
        exports.compileSymbol([')']),
        exports.compileSymbol(['{']),
        exports.compileStatements,
        exports.compileSymbol(['}']),
        (token) => zeroOrMore(token, token => exports.compileInOrder(token, [
            exports.compileKeyword(['else']),
            exports.compileSymbol(['{']),
            exports.compileStatements,
            exports.compileSymbol(['}']),
        ]), false)
    ]);
    return {
        nodes: [{
                value: 'ifStatement',
                children: result.nodes,
                isTerminal: false,
            }],
        token: result.token,
    };
};
exports.compileDo = (token) => {
    const result = exports.compileInOrder(token, [
        exports.compileKeyword(['do']),
        exports.compileSubroutineCall,
        exports.compileSymbol([';']),
    ]);
    return {
        nodes: [{
                value: 'doStatement',
                children: result.nodes,
                isTerminal: false,
            }],
        token: result.token,
    };
};
exports.compileWhile = (token) => {
    const result = exports.compileInOrder(token, [
        exports.compileKeyword(['while']),
        exports.compileSymbol(['(']),
        exports.compileExpression,
        exports.compileSymbol([')']),
        exports.compileSymbol(['{']),
        exports.compileStatements,
        exports.compileSymbol(['}']),
    ]);
    return {
        nodes: [{
                value: 'whileStatement',
                children: result.nodes,
                isTerminal: false,
            }],
        token: result.token,
    };
};
exports.compileReturn = (token) => {
    const result = exports.compileInOrder(token, [
        exports.compileKeyword(['return']),
        (token) => zeroOrMore(token, exports.compileExpression, false),
        exports.compileSymbol([';']),
    ]);
    return {
        nodes: [{
                value: 'returnStatement',
                children: result.nodes,
                isTerminal: false,
            }],
        token: result.token,
    };
};
exports.compileStatements = (token) => {
    const result = zeroOrMore(token, (token) => exports.compileAny(token, [
        exports.compileLet,
        exports.compileIf,
        exports.compileDo,
        exports.compileWhile,
        exports.compileReturn,
    ]), true);
    return {
        nodes: result.nodes.length
            ? [{
                    value: 'statements',
                    children: result.nodes,
                    isTerminal: false,
                }]
            : [],
        token: result.token,
    };
};
exports.compileSubroutineBody = (token) => {
    const result = exports.compileInOrder(token, [
        exports.compileSymbol(['{']),
        (token) => zeroOrMore(token, exports.compileVarDec, true),
        (token) => zeroOrMore(token, exports.compileStatements, true),
        exports.compileSymbol(['}']),
    ]);
    return {
        nodes: [{
                value: 'subroutineBody',
                children: result.nodes,
                isTerminal: false,
            }],
        token: result.token,
    };
};
exports.compileClassVarDec = (token) => {
    const result = exports.compileInOrder(token, [
        exports.compileKeyword(['static', 'field']),
        exports.compileType,
        exports.compileIdentifier,
        (token) => zeroOrMore(token, (token) => exports.compileInOrder(token, [
            exports.compileSymbol([',']),
            exports.compileIdentifier,
        ]), true),
        exports.compileSymbol([';'])
    ]);
    return {
        nodes: [{
                value: 'classVarDec',
                children: result.nodes,
                isTerminal: false,
            }],
        token: result.token,
    };
};
exports.compileSubroutine = (token) => {
    const result = exports.compileInOrder(token, [
        exports.compileKeyword(['constructor', 'function', 'method']),
        (token) => exports.compileAny(token, [
            exports.compileKeyword(['void']),
            exports.compileType
        ]),
        exports.compileIdentifier,
        exports.compileSymbol(['(']),
        exports.compileParameterList,
        exports.compileSymbol([')']),
        exports.compileSubroutineBody,
    ]);
    return {
        nodes: [{
                value: 'subroutineDec',
                children: result.nodes,
                isTerminal: false,
            }],
        token: result.token,
    };
};
exports.compileClass = (token) => {
    const nextToken = token.next;
    if (!nextToken) {
        throw new Error('unexpected end of input!');
    }
    return {
        value: 'class',
        children: exports.compileInOrder(nextToken, [
            exports.compileKeyword(['class']),
            exports.compileIdentifier,
            exports.compileSymbol(['{']),
            (token) => zeroOrMore(token, exports.compileClassVarDec, true),
            (token) => zeroOrMore(token, exports.compileSubroutine, true),
            exports.compileSymbol(['}']),
        ]).nodes,
        isTerminal: false,
    };
};
exports.toLinkedList = (tokens) => {
    const head = {
        tokenType: 'KEYWORD',
        value: 'head of list!',
        tail: false,
    };
    const tail = {
        tokenType: 'KEYWORD',
        value: 'end of list!',
        tail: true,
    };
    const last = tokens.reduce((prevToken, currToken) => {
        const currListItem = {
            tokenType: currToken.tokenType,
            value: currToken.value,
            tail: false,
        };
        prevToken.next = currListItem;
        return currListItem;
    }, head);
    last.next = tail;
    return head;
};
exports.default = (tokens) => exports.compileClass(exports.toLinkedList(tokens));
//# sourceMappingURL=compile.js.map