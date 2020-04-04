import {
  TokenDetails,
  TokenType,
  TokenListItem,
  TokenFunc,
  XOrMore,
  MultiTokenFunc,
  TerminalNode,
  SiblingNodes,
  XzibitNode,
  HigherOrderTokenFunc,
} from './types';

/**
 * The following are helper functions that help with general organziation and ordering
 * of compilation
 */

/**
 * Try a series of options, passed as callbacks. This function will only throw if none
 * of the options ends up working.
 */
export const compileAny: MultiTokenFunc = (token, fns) => {
  let error = new Error('Unexpected token');
  for (let i = 0; i < fns.length; i++) {
    const callback = fns[i];
    try {
      return callback(token);
    } catch (err) {
      error = err;
    }
  }
  throw error;
};

/**
 * Execute an array of compilation functions in order, ultimately returning a concatenated
 * text output from all of them.
 */
export const compileInOrder: MultiTokenFunc = (token, fns) => {
  const { currToken, currNodes } = fns.reduce(({ currToken, currNodes }, fn) => {
    const { token, nodes } = fn(currToken);
    return { currToken: token, currNodes: currNodes.concat(nodes) };
  }, { currToken: token, currNodes: [] as SiblingNodes });
  return { token: currToken, nodes: currNodes }
};

const zeroOrMore: XOrMore = (token, fn, moreThanOneOk) => {
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
  } catch (_err) {
    // Swallow errors, since zero occurences is fine
  } finally {
    return { nodes, token: tokenPointer };
  }
};


/**
 * The following are functions that compile sections of the code, generally increasing in
 * size as we move down through the file.
 */

export const compileTerminal = (token: TokenListItem, expected: string[], terminalType: TokenType) => {
  // If the next token is undefined, this indicates we are at the tail, which isn't a real token
  if (typeof token.next === 'undefined') {
    throw new Error('Unexpected end of input');
  }
  if (terminalType !== token.tokenType) {
    throw new Error(`Unexpected token ${token.value}`);
  }
  if (expected.length && !expected.includes(token.value)){
    throw new Error(`Unexpected token ${token.value}`);
  }
  // console.log('compiled terminal', token.tokenType, token.value);
  return {
      nodes: [{
        tokenType: token.tokenType,
        value: token.value,
        isTerminal: true,
      }] as TerminalNode[],
      token: token.next,
  };
};

export const compileOp: TokenFunc = (token) => compileTerminal(
  token,
  ['+', '-', '*', '/', '&', '|', '<', '>', '='],
  'SYMBOL'
);

export const compileIdentifier: TokenFunc = (token) => compileTerminal(token, [], 'IDENTIFIER');

export const compileSymbol: HigherOrderTokenFunc = (values) => (token) =>
  compileTerminal(token, values, 'SYMBOL');

export const compileKeyword: HigherOrderTokenFunc = (values) => (token) =>
  compileTerminal(token, values, 'KEYWORD');

export const compileType: TokenFunc = (token) => compileAny(token, [
  compileKeyword(['int', 'char', 'boolean']),
  compileIdentifier,
]);

export const compileParameterList: TokenFunc = (token) => {
  const result = zeroOrMore(token, (token) => compileInOrder(
    token,
    [
      compileType,
      compileIdentifier,
      (token) => zeroOrMore(token, (token) => compileInOrder(
        token,
        [
          compileSymbol([',']),
          compileType,
          compileIdentifier,
        ]
      ), true),
    ]
  ), false);
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

export const compileVarDec: TokenFunc = (token) => {
  const result = compileInOrder(token, [
    compileKeyword(['var']),
    compileType,
    compileIdentifier,
    (token) => zeroOrMore(token, (token) => compileInOrder(
      token,
      [
        compileSymbol([',']),
        compileIdentifier,
      ]
    ), true),
    compileSymbol([';']),
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

export const compileSubroutineCall: TokenFunc = (token) => {
  const result = compileAny(token, [
    (token) => compileInOrder(token, [
      compileIdentifier,
      compileSymbol(['(']),
      compileExpressionList,
      compileSymbol([')']),
    ]),
    (token) => compileInOrder(token, [
      compileIdentifier,
      compileSymbol(['.']),
      compileIdentifier,
      compileSymbol(['(']),
      compileExpressionList,
      compileSymbol([')']),
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

export const compileTerm: TokenFunc = (token) => {
  const result = compileAny(token, [
    (token) => compileTerminal(token, [], 'INT_CONST'),
    (token) => compileTerminal(token, [], 'STRING_CONST'),
    compileKeyword(['true', 'false', 'null', 'this']),
    (token) => compileInOrder(token, [
      compileSymbol(['(']),
      compileExpression,
      compileSymbol([')']),
    ]),
    (token) => compileInOrder(token, [
      compileSymbol(['-', '~']),
      compileTerm,
    ]),
    compileSubroutineCall,
    (token) => compileInOrder(token, [
      compileIdentifier,
      compileSymbol(['[']),
      compileExpression,
      compileSymbol([']']),
    ]),
    compileIdentifier,
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

export const compileExpression: TokenFunc = (token) => {
  const result = compileInOrder(token, [
    compileTerm,
    (token) => zeroOrMore(token, (token) => compileInOrder(token, [
      compileOp,
      compileTerm
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

export const compileExpressionList: TokenFunc = (token) => {
  const result = zeroOrMore(
    token,
    (token) => compileInOrder(token, [
      compileExpression,
      (token) => zeroOrMore(
        token,
        (token) => compileInOrder(token, [
          compileSymbol([',']),
          compileExpression,
        ]),
        true
      ),
    ]),
    false
  );
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

export const compileLet: TokenFunc = (token) => {
  const result = compileInOrder(token, [
    compileKeyword(['let']),
    compileIdentifier,
    (token) => zeroOrMore(token, (token) => compileInOrder(token, [
      compileSymbol(['[']),
      compileExpression,
      compileSymbol([']']),
    ]), false),
    compileSymbol(['=']),
    compileExpression,
    compileSymbol([';']),
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

export const compileIf: TokenFunc = (token) => {
  const result = compileInOrder(token, [
    compileKeyword(['if']),
    compileSymbol(['(']),
    compileExpression,
    compileSymbol([')']),
    compileSymbol(['{']),
    compileStatements,
    compileSymbol(['}']),
    (token) => zeroOrMore(token, token => compileInOrder(token, [
      compileKeyword(['else']),
      compileSymbol(['{']),
      compileStatements,
      compileSymbol(['}']),
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

export const compileDo: TokenFunc = (token) => {
  const result = compileInOrder(token, [
    compileKeyword(['do']),
    compileSubroutineCall,
    compileSymbol([';']),
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

export const compileWhile: TokenFunc = (token) => {
  const result = compileInOrder(token, [
    compileKeyword(['while']),
    compileSymbol(['(']),
    compileExpression,
    compileSymbol([')']),
    compileSymbol(['{']),
    compileStatements,
    compileSymbol(['}']),
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

export const compileReturn: TokenFunc = (token) => {
  const result = compileInOrder(token, [
    compileKeyword(['return']),
    (token) => zeroOrMore(token, compileExpression, false),
    compileSymbol([';']),
  ]);
  return {
    nodes: [{
      value: 'returnStatement',
      children: result.nodes,
      isTerminal: false,
    }],
    token: result.token,
  }
};

export const compileStatements: TokenFunc = (token) => {
  const result = zeroOrMore(token, (token) => compileAny(token, [
    compileLet,
    compileIf,
    compileDo,
    compileWhile,
    compileReturn,
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

export const compileSubroutineBody: TokenFunc = (token) => {
  const result = compileInOrder(token, [
    compileSymbol(['{']),
    (token) => zeroOrMore(token, compileVarDec, true),
    (token) => zeroOrMore(token, compileStatements, true),
    compileSymbol(['}']),
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

export const compileClassVarDec: TokenFunc = (token) => {
  const result = compileInOrder(token, [
    compileKeyword(['static', 'field']),
    compileType,
    compileIdentifier,
    (token) => zeroOrMore(token, (token) => compileInOrder(token, [
      compileSymbol([',']),
      compileIdentifier,
    ]), true),
    compileSymbol([';'])
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

export const compileSubroutine: TokenFunc = (token) => {
  const result = compileInOrder(token, [
    compileKeyword(['constructor', 'function', 'method']),
    (token) => compileAny(token, [
      compileKeyword(['void']),
      compileType
    ]),
    compileIdentifier,
    compileSymbol(['(']),
    compileParameterList,
    compileSymbol([')']),
    compileSubroutineBody,
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

export const compileClass = (token: TokenListItem): XzibitNode => {
  const nextToken = token.next;
  if (!nextToken) {
    throw new Error('unexpected end of input!');
  }
  return {
    value: 'class',
    children: compileInOrder(
      nextToken,
      [
        compileKeyword(['class']),
        compileIdentifier,
        compileSymbol(['{']),
        (token) => zeroOrMore(token, compileClassVarDec, true),
        (token) => zeroOrMore(token, compileSubroutine, true),
        compileSymbol(['}']),
      ]
    ).nodes,
    isTerminal: false,
  }
};


export const toLinkedList = (tokens: TokenDetails[]) => {
  const head: TokenListItem = {
    tokenType: 'KEYWORD',
    value: 'head of list!',
    tail: false,
  };
  const tail: TokenListItem = {
    tokenType: 'KEYWORD',
    value: 'end of list!',
    tail: true,
  };
  const last = tokens.reduce((prevToken: TokenListItem, currToken: TokenDetails): TokenListItem => {
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

export default (tokens: TokenDetails[]) => compileClass(toLinkedList(tokens));
