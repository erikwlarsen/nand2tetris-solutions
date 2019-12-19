const { Transform } = require('stream');
const constants = require('./constants');

const checkForMultilineComment = line =>
  line.indexOf(constants.MULTILINE_COMMENT_OPEN) !== -1;

const checkForMultilineCommentEnd = line =>
  line.indexOf(constants.MULTILINE_COMMENT_CLOSE) !== -1;

const checkForOnelineComment = line =>
  line.indexOf(constants.ONELINE_COMMENT_OPEN) !== -1;

const removeLineSection = (line, start, end = Infinity) =>
  line.slice(0, start).concat(line.slice(end + 1));

const removeOnelineComment = (line) => {
  const onelineCommentStart = line.indexOf(constants.ONELINE_COMMENT_OPEN);
  return removeLineSection(line, onelineCommentStart);
}

// gets index that needs to be deleted through in order to remove comment close
const getMultilineEndIndex = line =>
  line.indexOf(constants.MULTILINE_COMMENT_CLOSE) + 1;

module.exports = class RemoveComments extends Transform {
  constructor() {
    this.openComment = false;
  }

  _transform(chunk, _encoding, done) {
    let line = String(chunk);
    // if openComment is true:
    // check for multilineCommentEnd
    // if it does not exist, don't push the line and call done
    // if it exists, remove through comment end and then proceed as normal
    // if openComment is false
    if (this.openComment) {
      const hasCommentEnd = checkForMultilineCommentEnd(line)
      if (hasCommentEnd) { // remove comment through end and proceed as normal
        const commentEndIndex = getMultilineEndIndex(line);
        line = removeLineSection(0, commentEndIndex);
        this.openComment = false;
      } else return done(); // if there is no comment end, this whole line is a comment
    }
    const containsMultiline = checkForMultilineComment(line);
    if (containsMultiline) {
      line = this.removeMultilineComments(line);
    }
    const containsOnelineComment = checkForOnelineComment(line);
    if (containsOnelineComment) {
      line = removeOnelineComment(line);
    }
    // Trim the line just in case the only thing left is whitespace
    line = line.trim();
    if (line) this.push(line);
    return done();
  }

  /**
   * Using an instance method since it may need to be able to set the `openComment` flag.
   * This function is recursive because there can be more than one multiline comment in
   * a single line.
   */
  removeMultilineComments(line) {
    const multilineOpenIdx = line.indexOf(constants.MULTILINE_COMMENT_OPEN);
    const containsMultilineEnd = checkForMultilineCommentEnd(line);
    if (!containsMultilineEnd) {
      this.openComment = true;
      return removeLineSection(line, multilineOpenIdx);
    }
    const multilineEndIdx = getMultilineEndIndex(line);
    const trimmedLine = removeLineSection(line, multilineOpenIdx, multilineEndIdx);
    if (checkForMultilineComment(trimmedLine)) {
      return this.removeMultilineComments(trimmedLine);
    }
    return trimmedLine;
  }
}
