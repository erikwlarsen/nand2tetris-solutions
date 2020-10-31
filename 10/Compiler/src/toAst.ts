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
export const treeifyAny: MultiTokenFunc = (token, fns) => {
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
export const treeifyInOrder: MultiTokenFunc = (token, fns) => {
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
 * The following are functions that tree-ify sections of the code, generally increasing in
 * size as we move down through the file.
 */

export const treeifyTerminal = (token: TokenListItem, expected: string[], terminalType: TokenType) => {
  // If the next token is undefined, this indicates we are at the tail, which isn't a real token
  if (typeof token.next === 'undefined') {
    throw new Error('Unexpected end of input');
  }
  if (terminalType !== token.tokenType) {
    throw new Error(`Unexpected token ${token.value}, expected ${terminalType}`);
  }
  if (expected.length && !expected.includes(token.value)){
    throw new Error(`Unexpected token ${token.value}, expected one of ${expected}`);
  }
  return {
      nodes: [{
        tokenType: token.tokenType,
        value: token.value,
        isTerminal: true,
      }] as TerminalNode[],
      token: token.next,
  };
};

export const treeifyOp: TokenFunc = (token) => treeifyTerminal(
  token,
  ['+', '-', '*', '/', '&', '|', '<', '>', '='],
  'SYMBOL'
);

export const treeifyIdentifier: TokenFunc = (token) => treeifyTerminal(token, [], 'IDENTIFIER');

export const treeifySymbol: HigherOrderTokenFunc = (values) => (token) =>
  treeifyTerminal(token, values, 'SYMBOL');

export const treeifyKeyword: HigherOrderTokenFunc = (values) => (token) =>
  treeifyTerminal(token, values, 'KEYWORD');

export const treeifyType: TokenFunc = (token) => treeifyAny(token, [
  treeifyKeyword(['int', 'char', 'boolean']),
  treeifyIdentifier,
]);

export const treeifyParameterList: TokenFunc = (token) => {
  const result = zeroOrMore(token, (token) => treeifyInOrder(
    token,
    [
      treeifyType,
      treeifyIdentifier,
      (token) => zeroOrMore(token, (token) => treeifyInOrder(
        token,
        [
          treeifySymbol([',']),
          treeifyType,
          treeifyIdentifier,
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

export const treeifyVarDec: TokenFunc = (token) => {
  const result = treeifyInOrder(token, [
    treeifyKeyword(['var']),
    treeifyType,
    treeifyIdentifier,
    (token) => zeroOrMore(token, (token) => treeifyInOrder(
      token,
      [
        treeifySymbol([',']),
        treeifyIdentifier,
      ]
    ), true),
    treeifySymbol([';']),
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

export const treeifySubroutineCall: TokenFunc = (token) => {
  const result = treeifyAny(token, [
    (token) => treeifyInOrder(token, [
      treeifyIdentifier,
      treeifySymbol(['(']),
      treeifyExpressionList,
      treeifySymbol([')']),
    ]),
    (token) => treeifyInOrder(token, [
      treeifyIdentifier,
      treeifySymbol(['.']),
      treeifyIdentifier,
      treeifySymbol(['(']),
      treeifyExpressionList,
      treeifySymbol([')']),
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

export const treeifyTerm: TokenFunc = (token) => {
  const result = treeifyAny(token, [
    (token) => treeifyTerminal(token, [], 'INT_CONST'),
    (token) => treeifyTerminal(token, [], 'STRING_CONST'),
    treeifyKeyword(['true', 'false', 'null', 'this']),
    (token) => treeifyInOrder(token, [
      treeifySymbol(['(']),
      treeifyExpression,
      treeifySymbol([')']),
    ]),
    (token) => treeifyInOrder(token, [
      treeifySymbol(['-', '~']),
      treeifyTerm,
    ]),
    treeifySubroutineCall,
    (token) => treeifyInOrder(token, [
      treeifyIdentifier,
      treeifySymbol(['[']),
      treeifyExpression,
      treeifySymbol([']']),
    ]),
    treeifyIdentifier,
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

export const treeifyExpression: TokenFunc = (token) => {
  const result = treeifyInOrder(token, [
    treeifyTerm,
    (token) => zeroOrMore(token, (token) => treeifyInOrder(token, [
      treeifyOp,
      treeifyTerm
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

export const treeifyExpressionList: TokenFunc = (token) => {
  const result = zeroOrMore(
    token,
    (token) => treeifyInOrder(token, [
      treeifyExpression,
      (token) => zeroOrMore(
        token,
        (token) => treeifyInOrder(token, [
          treeifySymbol([',']),
          treeifyExpression,
        ]),
        true
      ),
    ]),
    false
  );
  return {
    nodes: [{
      value: 'expressionList',
      children: result.nodes,
      isTerminal: false,
    }],
    token: result.token,
  };
};

export const treeifyLet: TokenFunc = (token) => {
  const result = treeifyInOrder(token, [
    treeifyKeyword(['let']),
    treeifyIdentifier,
    (token) => zeroOrMore(token, (token) => treeifyInOrder(token, [
      treeifySymbol(['[']),
      treeifyExpression,
      treeifySymbol([']']),
    ]), false),
    treeifySymbol(['=']),
    treeifyExpression,
    treeifySymbol([';']),
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

export const treeifyIf: TokenFunc = (token) => {
  const result = treeifyInOrder(token, [
    treeifyKeyword(['if']),
    treeifySymbol(['(']),
    treeifyExpression,
    treeifySymbol([')']),
    treeifySymbol(['{']),
    treeifyStatements,
    treeifySymbol(['}']),
    (token) => zeroOrMore(token, token => treeifyInOrder(token, [
      treeifyKeyword(['else']),
      treeifySymbol(['{']),
      treeifyStatements,
      treeifySymbol(['}']),
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

export const treeifyDo: TokenFunc = (token) => {
  const result = treeifyInOrder(token, [
    treeifyKeyword(['do']),
    treeifySubroutineCall,
    treeifySymbol([';']),
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

export const treeifyWhile: TokenFunc = (token) => {
  const result = treeifyInOrder(token, [
    treeifyKeyword(['while']),
    treeifySymbol(['(']),
    treeifyExpression,
    treeifySymbol([')']),
    treeifySymbol(['{']),
    treeifyStatements,
    treeifySymbol(['}']),
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

export const treeifyReturn: TokenFunc = (token) => {
  const result = treeifyInOrder(token, [
    treeifyKeyword(['return']),
    (token) => zeroOrMore(token, treeifyExpression, false),
    treeifySymbol([';']),
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

export const treeifyStatements: TokenFunc = (token) => {
  const result = zeroOrMore(token, (token) => treeifyAny(token, [
    treeifyLet,
    treeifyIf,
    treeifyDo,
    treeifyWhile,
    treeifyReturn,
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

export const treeifySubroutineBody: TokenFunc = (token) => {
  const result = treeifyInOrder(token, [
    treeifySymbol(['{']),
    (token) => zeroOrMore(token, treeifyVarDec, true),
    (token) => zeroOrMore(token, treeifyStatements, true),
    treeifySymbol(['}']),
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

export const treeifyClassVarDec: TokenFunc = (token) => {
  const result = treeifyInOrder(token, [
    treeifyKeyword(['static', 'field']),
    treeifyType,
    treeifyIdentifier,
    (token) => zeroOrMore(token, (token) => treeifyInOrder(token, [
      treeifySymbol([',']),
      treeifyIdentifier,
    ]), true),
    treeifySymbol([';'])
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

export const treeifySubroutine: TokenFunc = (token) => {
  const result = treeifyInOrder(token, [
    treeifyKeyword(['constructor', 'function', 'method']),
    (token) => treeifyAny(token, [
      treeifyKeyword(['void']),
      treeifyType
    ]),
    treeifyIdentifier,
    treeifySymbol(['(']),
    treeifyParameterList,
    treeifySymbol([')']),
    treeifySubroutineBody,
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

export const treeifyClass = (token: TokenListItem): XzibitNode => {
  const nextToken = token.next;
  if (!nextToken) {
    throw new Error('unexpected end of input!');
  }
  return {
    value: 'class',
    children: treeifyInOrder(
      nextToken,
      [
        treeifyKeyword(['class']),
        treeifyIdentifier,
        treeifySymbol(['{']),
        (token) => zeroOrMore(token, treeifyClassVarDec, true),
        (token) => zeroOrMore(token, treeifySubroutine, true),
        treeifySymbol(['}']),
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

export default (tokens: TokenDetails[]) => treeifyClass(toLinkedList(tokens));
