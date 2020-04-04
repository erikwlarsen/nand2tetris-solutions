import { TokenType, TokenDetails } from '../src/types';
import tokenize, {
  removeMultilineComments,
  removeOnelineComments,
  removeToken,
  extractToken,
  extractTokens,
} from '../src/tokenize';

describe('tokenize.ts', () => {
  describe('removeMultilineComments', () => {
    test('should remove plain multiline comments', () => {
      const str = `Here is some code. /* if you see this,
you know there is a comment */
Here is some more code.`
      expect(removeMultilineComments(str)).toBe(`Here is some code. 
Here is some more code.`);
    });
    test('should remove API multiline comments', () => {
      const str = `Here is some code. /** if you see this,
you know there is a comment */
Here is some more code.`
      expect(removeMultilineComments(str)).toBe(`Here is some code. 
Here is some more code.`);
    });
    test('should remove comment from single line', () => {
      const str = 'Some code /* comment */ more code';
      expect(removeMultilineComments(str)).toBe('Some code  more code');
    });
    test('should not be fooled by mid-comment comment', () => {
      const str = 'Some code /* comment /* comment */ more code';
      expect(removeMultilineComments(str)).toBe('Some code  more code');
    });
    test('should not affect text with no comments', () => {
      const str = `Code Code Code
Code Code Code`;
      expect(removeMultilineComments(str)).toBe(str);
    });
  });

  describe('removeOnelineComments', () => {
    test('should remove one line comment', () => {
      const str = `Some code
// a comment
More code`
      expect(removeOnelineComments(str)).toBe(`Some code

More code`);
    });
    test('should remove comment in and leave code intact', () => {
      const str = `Some code
More code // a comment
More code`;
    expect(removeOnelineComments(str)).toBe(`Some code
More code 
More code`);
    });
    test('should not affect text with no comments', () => {
      const str = `Code Code Code
Code Code Code`;
      expect(removeMultilineComments(str)).toBe(str);
    });
  });

  describe('removeToken', () => {
    test('should remove token from front of string', () => {
      const token = 'ABC';
      const text = 'Blah blah blah blah';
      const tokenPlusText = `${token}${text}`;
      expect(removeToken(token, tokenPlusText)).toBe(text);
    });
  });

  describe('extractToken', () => {
    const re = /^\d+/; // Integer at beginning of string
    const prevToken: TokenDetails = {
      tokenType: 'KEYWORD',
      value: '',
      exists: false,
    };
    const text = `123 code code code
code code`;
    const tokenType: TokenType = 'INT_CONST';
    test('if prevToken exists, return prevToken and text', () => {
      const testToken = Object.assign({}, prevToken, { exists: true });
      expect(extractToken(testToken, text, re, tokenType)).toStrictEqual({
        token: testToken,
        text,
      });
    });
    test('if regex is matched, return token indicating existence', () => {
      expect(extractToken(prevToken, text, re, tokenType)).toStrictEqual({
        token: {
          tokenType,
          value: '123',
          exists: true,
        },
        text,
      });
    });
    test('if regex is not matched, return token indicating no existence', () => {
      const noMatchText = 'blep bleep 12345';
      expect(extractToken(prevToken, noMatchText, re, tokenType)).toStrictEqual({
        token: {
          tokenType,
          value: '',
          exists: false,
        },
        text: noMatchText,
      });
    });
  });

  describe('extractTokens', () => {
    const token1: TokenDetails = {
      tokenType: 'KEYWORD',
      value: 'class',
      exists: true,
    };
    const token2: TokenDetails = {
      tokenType: 'IDENTIFIER',
      value: 'Main',
      exists: true,
    };
    const tokens = [
      token1,
      token2,
    ];
    const partialText = `{
  function void main() {
    var Array a;
    Keyboard.onPress(1);
    let i = 0;
    let str = "stringy";
    return;
  }
}`;
    test('should return input tokens if text is empty', () => {
      expect(extractTokens(tokens, '')).toStrictEqual(tokens);
    });
    test('should return input tokens if text is whitespace', () => {
      expect(extractTokens(tokens, ' \n \t ')).toStrictEqual(tokens);
    });
    test('should handle keyword', () => {
      expect(extractTokens([], 'class ')).toStrictEqual([{
        tokenType: 'KEYWORD',
        value: 'class',
        exists: true,
      }]);
    });
    test('should handle symbol', () => {
      expect(extractTokens([], '|')).toStrictEqual([{
        tokenType: 'SYMBOL',
        value: '|',
        exists: true,
      }]);
    });
    test('should handle identifier', () => {
      expect(extractTokens([], 'MyVariable')).toStrictEqual([{
        tokenType: 'IDENTIFIER',
        value: 'MyVariable',
        exists: true,
      }]);
    });
    test('should handle integer', () => {
      expect(extractTokens([], '887')).toStrictEqual([{
        tokenType: 'INT_CONST',
        value: '887',
        exists: true,
      }]);
    });
    test('should handle string', () => {
      expect(extractTokens([], '"blep"')).toStrictEqual([{
        tokenType: 'STRING_CONST',
        value: '"blep"',
        exists: true,
      }]);
    });
    test('should handle multiple inputs', () => {
      expect(extractTokens([], partialText)).toStrictEqual([
        { exists: true, tokenType: 'SYMBOL', value: '{' },
        { exists: true, tokenType: 'KEYWORD', value: 'function' },
        { exists: true, tokenType: 'KEYWORD', value: 'void' },
        { exists: true, tokenType: 'IDENTIFIER', value: 'main' },
        { exists: true, tokenType: 'SYMBOL', value: '(' },
        { exists: true, tokenType: 'SYMBOL', value: ')' },
        { exists: true, tokenType: 'SYMBOL', value: '{' },
        { exists: true, tokenType: 'KEYWORD', value: 'var' },
        { exists: true, tokenType: 'IDENTIFIER', value: 'Array' },
        { exists: true, tokenType: 'IDENTIFIER', value: 'a' },
        { exists: true, tokenType: 'SYMBOL', value: ';' },
        { exists: true, tokenType: 'IDENTIFIER', value: 'Keyboard' },
        { exists: true, tokenType: 'SYMBOL', value: '.' },
        { exists: true, tokenType: 'IDENTIFIER', value: 'onPress' },
        { exists: true, tokenType: 'SYMBOL', value: '(' },
        { exists: true, tokenType: 'INT_CONST', value: '1' },
        { exists: true, tokenType: 'SYMBOL', value: ')' },
        { exists: true, tokenType: 'SYMBOL', value: ';' },
        { exists: true, tokenType: 'KEYWORD', value: 'let' },
        { exists: true, tokenType: 'IDENTIFIER', value: 'i' },
        { exists: true, tokenType: 'SYMBOL', value: '=' },
        { exists: true, tokenType: 'INT_CONST', value: '0' },
        { exists: true, tokenType: 'SYMBOL', value: ';' },
        { exists: true, tokenType: 'KEYWORD', value: 'let' },
        { exists: true, tokenType: 'IDENTIFIER', value: 'str' },
        { exists: true, tokenType: 'SYMBOL', value: '=' },
        { exists: true, tokenType: 'STRING_CONST', value: '"stringy"' },
        { exists: true, tokenType: 'SYMBOL', value: ';' },
        { exists: true, tokenType: 'KEYWORD', value: 'return' },
        { exists: true, tokenType: 'SYMBOL', value: ';' },
        { exists: true, tokenType: 'SYMBOL', value: '}' },
        { exists: true, tokenType: 'SYMBOL', value: '}' },
      ]);
    });
  });

  describe('tokenize', () => {
    test('should remove comments and tokenize input', () => {
      const fullText = `/** Here is a multi-line
      * guide to the API. Make sure you don't include these liens
      */
     class Main {
       function void main() {
         var Array a;
         /* This holds some values here */
         Keyboard.onPress(1);
         let i = 0;
         // Partial comment here!
         let str = "stringy";
         return;
       }
     }`;

      expect(tokenize(fullText)).toStrictEqual([
        { exists: true, tokenType: 'KEYWORD', value: 'class' },
        { exists: true, tokenType: 'IDENTIFIER', value: 'Main' },
        { exists: true, tokenType: 'SYMBOL', value: '{' },
        { exists: true, tokenType: 'KEYWORD', value: 'function' },
        { exists: true, tokenType: 'KEYWORD', value: 'void' },
        { exists: true, tokenType: 'IDENTIFIER', value: 'main' },
        { exists: true, tokenType: 'SYMBOL', value: '(' },
        { exists: true, tokenType: 'SYMBOL', value: ')' },
        { exists: true, tokenType: 'SYMBOL', value: '{' },
        { exists: true, tokenType: 'KEYWORD', value: 'var' },
        { exists: true, tokenType: 'IDENTIFIER', value: 'Array' },
        { exists: true, tokenType: 'IDENTIFIER', value: 'a' },
        { exists: true, tokenType: 'SYMBOL', value: ';' },
        { exists: true, tokenType: 'IDENTIFIER', value: 'Keyboard' },
        { exists: true, tokenType: 'SYMBOL', value: '.' },
        { exists: true, tokenType: 'IDENTIFIER', value: 'onPress' },
        { exists: true, tokenType: 'SYMBOL', value: '(' },
        { exists: true, tokenType: 'INT_CONST', value: '1' },
        { exists: true, tokenType: 'SYMBOL', value: ')' },
        { exists: true, tokenType: 'SYMBOL', value: ';' },
        { exists: true, tokenType: 'KEYWORD', value: 'let' },
        { exists: true, tokenType: 'IDENTIFIER', value: 'i' },
        { exists: true, tokenType: 'SYMBOL', value: '=' },
        { exists: true, tokenType: 'INT_CONST', value: '0' },
        { exists: true, tokenType: 'SYMBOL', value: ';' },
        { exists: true, tokenType: 'KEYWORD', value: 'let' },
        { exists: true, tokenType: 'IDENTIFIER', value: 'str' },
        { exists: true, tokenType: 'SYMBOL', value: '=' },
        { exists: true, tokenType: 'STRING_CONST', value: '"stringy"' },
        { exists: true, tokenType: 'SYMBOL', value: ';' },
        { exists: true, tokenType: 'KEYWORD', value: 'return' },
        { exists: true, tokenType: 'SYMBOL', value: ';' },
        { exists: true, tokenType: 'SYMBOL', value: '}' },
        { exists: true, tokenType: 'SYMBOL', value: '}' },
      ]);
    });
  })
});
