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
exports.treeifyAny = (token, fns) => {
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
exports.treeifyInOrder = (token, fns) => {
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
 * The following are functions that tree-ify sections of the code, generally increasing in
 * size as we move down through the file.
 */
exports.treeifyTerminal = (token, expected, terminalType) => {
    // If the next token is undefined, this indicates we are at the tail, which isn't a real token
    if (typeof token.next === 'undefined') {
        throw new Error('Unexpected end of input');
    }
    if (terminalType !== token.tokenType) {
        throw new Error(`Unexpected token ${token.value}, expected ${terminalType}`);
    }
    if (expected.length && !expected.includes(token.value)) {
        throw new Error(`Unexpected token ${token.value}, expected one of ${expected}`);
    }
    return {
        nodes: [{
                tokenType: token.tokenType,
                value: token.value,
                isTerminal: true,
            }],
        token: token.next,
    };
};
exports.treeifyOp = (token) => exports.treeifyTerminal(token, ['+', '-', '*', '/', '&', '|', '<', '>', '='], 'SYMBOL');
exports.treeifyIdentifier = (token) => exports.treeifyTerminal(token, [], 'IDENTIFIER');
exports.treeifySymbol = (values) => (token) => exports.treeifyTerminal(token, values, 'SYMBOL');
exports.treeifyKeyword = (values) => (token) => exports.treeifyTerminal(token, values, 'KEYWORD');
exports.treeifyType = (token) => exports.treeifyAny(token, [
    exports.treeifyKeyword(['int', 'char', 'boolean']),
    exports.treeifyIdentifier,
]);
exports.treeifyParameterList = (token) => {
    const result = zeroOrMore(token, (token) => exports.treeifyInOrder(token, [
        exports.treeifyType,
        exports.treeifyIdentifier,
        (token) => zeroOrMore(token, (token) => exports.treeifyInOrder(token, [
            exports.treeifySymbol([',']),
            exports.treeifyType,
            exports.treeifyIdentifier,
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
exports.treeifyVarDec = (token) => {
    const result = exports.treeifyInOrder(token, [
        exports.treeifyKeyword(['var']),
        exports.treeifyType,
        exports.treeifyIdentifier,
        (token) => zeroOrMore(token, (token) => exports.treeifyInOrder(token, [
            exports.treeifySymbol([',']),
            exports.treeifyIdentifier,
        ]), true),
        exports.treeifySymbol([';']),
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
exports.treeifySubroutineCall = (token) => {
    const result = exports.treeifyAny(token, [
        (token) => exports.treeifyInOrder(token, [
            exports.treeifyIdentifier,
            exports.treeifySymbol(['(']),
            exports.treeifyExpressionList,
            exports.treeifySymbol([')']),
        ]),
        (token) => exports.treeifyInOrder(token, [
            exports.treeifyIdentifier,
            exports.treeifySymbol(['.']),
            exports.treeifyIdentifier,
            exports.treeifySymbol(['(']),
            exports.treeifyExpressionList,
            exports.treeifySymbol([')']),
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
exports.treeifyTerm = (token) => {
    const result = exports.treeifyAny(token, [
        (token) => exports.treeifyTerminal(token, [], 'INT_CONST'),
        (token) => exports.treeifyTerminal(token, [], 'STRING_CONST'),
        exports.treeifyKeyword(['true', 'false', 'null', 'this']),
        (token) => exports.treeifyInOrder(token, [
            exports.treeifySymbol(['(']),
            exports.treeifyExpression,
            exports.treeifySymbol([')']),
        ]),
        (token) => exports.treeifyInOrder(token, [
            exports.treeifySymbol(['-', '~']),
            exports.treeifyTerm,
        ]),
        exports.treeifySubroutineCall,
        (token) => exports.treeifyInOrder(token, [
            exports.treeifyIdentifier,
            exports.treeifySymbol(['[']),
            exports.treeifyExpression,
            exports.treeifySymbol([']']),
        ]),
        exports.treeifyIdentifier,
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
exports.treeifyExpression = (token) => {
    const result = exports.treeifyInOrder(token, [
        exports.treeifyTerm,
        (token) => zeroOrMore(token, (token) => exports.treeifyInOrder(token, [
            exports.treeifyOp,
            exports.treeifyTerm
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
exports.treeifyExpressionList = (token) => {
    const result = zeroOrMore(token, (token) => exports.treeifyInOrder(token, [
        exports.treeifyExpression,
        (token) => zeroOrMore(token, (token) => exports.treeifyInOrder(token, [
            exports.treeifySymbol([',']),
            exports.treeifyExpression,
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
exports.treeifyLet = (token) => {
    const result = exports.treeifyInOrder(token, [
        exports.treeifyKeyword(['let']),
        exports.treeifyIdentifier,
        (token) => zeroOrMore(token, (token) => exports.treeifyInOrder(token, [
            exports.treeifySymbol(['[']),
            exports.treeifyExpression,
            exports.treeifySymbol([']']),
        ]), false),
        exports.treeifySymbol(['=']),
        exports.treeifyExpression,
        exports.treeifySymbol([';']),
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
exports.treeifyIf = (token) => {
    const result = exports.treeifyInOrder(token, [
        exports.treeifyKeyword(['if']),
        exports.treeifySymbol(['(']),
        exports.treeifyExpression,
        exports.treeifySymbol([')']),
        exports.treeifySymbol(['{']),
        exports.treeifyStatements,
        exports.treeifySymbol(['}']),
        (token) => zeroOrMore(token, token => exports.treeifyInOrder(token, [
            exports.treeifyKeyword(['else']),
            exports.treeifySymbol(['{']),
            exports.treeifyStatements,
            exports.treeifySymbol(['}']),
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
exports.treeifyDo = (token) => {
    const result = exports.treeifyInOrder(token, [
        exports.treeifyKeyword(['do']),
        exports.treeifySubroutineCall,
        exports.treeifySymbol([';']),
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
exports.treeifyWhile = (token) => {
    const result = exports.treeifyInOrder(token, [
        exports.treeifyKeyword(['while']),
        exports.treeifySymbol(['(']),
        exports.treeifyExpression,
        exports.treeifySymbol([')']),
        exports.treeifySymbol(['{']),
        exports.treeifyStatements,
        exports.treeifySymbol(['}']),
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
exports.treeifyReturn = (token) => {
    const result = exports.treeifyInOrder(token, [
        exports.treeifyKeyword(['return']),
        (token) => zeroOrMore(token, exports.treeifyExpression, false),
        exports.treeifySymbol([';']),
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
exports.treeifyStatements = (token) => {
    const result = zeroOrMore(token, (token) => exports.treeifyAny(token, [
        exports.treeifyLet,
        exports.treeifyIf,
        exports.treeifyDo,
        exports.treeifyWhile,
        exports.treeifyReturn,
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
exports.treeifySubroutineBody = (token) => {
    const result = exports.treeifyInOrder(token, [
        exports.treeifySymbol(['{']),
        (token) => zeroOrMore(token, exports.treeifyVarDec, true),
        (token) => zeroOrMore(token, exports.treeifyStatements, true),
        exports.treeifySymbol(['}']),
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
exports.treeifyClassVarDec = (token) => {
    const result = exports.treeifyInOrder(token, [
        exports.treeifyKeyword(['static', 'field']),
        exports.treeifyType,
        exports.treeifyIdentifier,
        (token) => zeroOrMore(token, (token) => exports.treeifyInOrder(token, [
            exports.treeifySymbol([',']),
            exports.treeifyIdentifier,
        ]), true),
        exports.treeifySymbol([';'])
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
exports.treeifySubroutine = (token) => {
    const result = exports.treeifyInOrder(token, [
        exports.treeifyKeyword(['constructor', 'function', 'method']),
        (token) => exports.treeifyAny(token, [
            exports.treeifyKeyword(['void']),
            exports.treeifyType
        ]),
        exports.treeifyIdentifier,
        exports.treeifySymbol(['(']),
        exports.treeifyParameterList,
        exports.treeifySymbol([')']),
        exports.treeifySubroutineBody,
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
exports.treeifyClass = (token) => {
    const nextToken = token.next;
    if (!nextToken) {
        throw new Error('unexpected end of input!');
    }
    return {
        value: 'class',
        children: exports.treeifyInOrder(nextToken, [
            exports.treeifyKeyword(['class']),
            exports.treeifyIdentifier,
            exports.treeifySymbol(['{']),
            (token) => zeroOrMore(token, exports.treeifyClassVarDec, true),
            (token) => zeroOrMore(token, exports.treeifySubroutine, true),
            exports.treeifySymbol(['}']),
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
exports.default = (tokens) => exports.treeifyClass(exports.toLinkedList(tokens));
//# sourceMappingURL=toAst.js.map