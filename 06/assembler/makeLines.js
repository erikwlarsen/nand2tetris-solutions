const { Transform } = require('stream');

class MakeLines extends Transform {
  constructor() {
    super();
  }

  _transform(chunk, encoding, done) {
    let data = chunk.toString();
    if (this._lastLine) data = this._lastLine + data;
    const lines = data.split('\n');
    this._lastLine = lines.splice(lines.length - 1, 1)[0];
    lines.forEach(this.push.bind(this));
    done();
  }

  _flush(done) {
    if (this._lastLine) this.push(this._lastLine);
    done();
  }
}

module.exports = { MakeLines };