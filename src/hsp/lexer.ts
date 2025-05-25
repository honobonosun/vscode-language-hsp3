import { Token, TokenType, IPoint, ILocation } from './token';
const emojiRegex: () => RegExp = require('emoji-regex');

/**
 * Lexerクラスは、documentをHSPのプログラムとして字句解析します。
 */
class Lexer {
  public fullText: string;
  private chars: string[];
  private textPoint: IPoint;
  private position = 0;
  private readPosition = 0;
  private ch: string | 0 = 0;

  constructor(text: string) {
    this.fullText = text;
    this.chars = Array.from(this.fullText);
    this.textPoint = { row: 0, column: 0 };
    this.readChar();
    return;
  }

  /**
   * charの文字をregexp.test()で評価します。chraが0なら必ずfalseを返します。
   * @param regexp 評価に使う正規表現
   * @param char 評価されたい文字
   */
  private matchChar(regexp: RegExp, char: string | 0): boolean {
    if (char === 0) {
      return false;
    } else {
      return regexp.test(char);
    }
  }

  /**
   * 現在位置からpoint分を足します。
   * @param point 足すpoint
   */
  private addTextPoint(point: IPoint): void {
    const { row, column } = this.textPoint;
    this.textPoint = {
      row: row + point.row,
      column: column + point.column,
    };
  }

  /**
   * 文字を一文字読み進めます。
   * position, readPosition, chプロパティが**変更**されます。
   */
  private readChar(): void {
    if (this.readPosition >= this.chars.length) {
      this.ch = 0;
    } else {
      this.ch = this.chars[this.readPosition];
    }
    this.position = this.readPosition;
    this.readPosition += 1;
    return;
  }

  /**
   * 現在位置から一文字先の一文字を読みます。readChar()と違い読み進めません。
   * number型の0を返した場合、文字の終末(End Of Line)まで来たことを意味します。
   */
  private peekChar(): string | 0 {
    if (this.readPosition >= this.chars.length) {
      return 0;
    } else {
      return this.chars[this.readPosition];
    }
  }

  /**
   * 現在位置から一文字前の一文字を読みます。readChar()と違い読み進めません。
   * number型の0を返した場合、これ以上前の文字はありません。
   */
  private prevChar(): string | 0 {
    if (this.position < 0) {
      return 0;
    }
    return this.chars[this.position - 1];
  }

  /**
   * 現在位置の文字を読んでTokenを返して、次の読み取り位置へ進めます。
   * 必ずしも、一文字だけ進むとは限らない。
   * Token.TokenType.eol が格納された場合、テキストの終末に着いたことを意味します。
   */
  public nextToken(): Token {
    let result: Token;
    let location: ILocation;
    const { row, column } = this.textPoint;
    switch (this.ch) {
      case '\n': {
        location = { begin: { row, column }, end: { row, column: column + 1 } };
        this.textPoint = { row: row + 1, column: 0 };
        result = new Token(TokenType.newline, location, '\n');
        break;
      }
      case '\r': {
        if (this.peekChar() === '\n') {
          this.readChar();
          location = {
            begin: { row, column },
            end: { row, column: column + 2 },
          };
          result = new Token(TokenType.newline, location, '\r\n');
        } else {
          location = {
            begin: { row, column },
            end: { row, column: column + 1 },
          };
          result = new Token(TokenType.newline, location, '\r');
        }
        this.textPoint = { row: row + 1, column: 0 };
        break;
      }
      case '#': {
        location = { begin: { row, column }, end: { row, column: column + 1 } };
        this.addTextPoint({ row: 0, column: 1 });
        result = new Token(TokenType.sharp, location, '#');
        break;
      }
      default: {
        location = { begin: { row, column }, end: { row, column: column + 1 } };
        if (this.ch === 0) {
          // End Of Line
          this.addTextPoint({ row: 0, column: 1 });
          result = new Token(TokenType.eol, location, '');
        } else {
          let token: Token | null = null;

          token = this.readComment();
          if (token) {
            return token;
          }

          token = this.readSpace();
          if (token) {
            return token;
          }

          token = this.readString();
          if (token) {
            return token;
          }

          token = this.readNumber();
          if (token) {
            return token;
          }

          token = this.readOperant();
          if (token) {
            return token;
          }

          token = this.readBracket();
          if (token) {
            return token;
          }

          token = this.readLiteral();
          if (token) {
            return token;
          }

          // others
          this.addTextPoint({ row: 0, column: this.ch.length });
          result = new Token(TokenType.others, location, this.ch);
        }
        break;
      }
    }
    this.readChar();
    return result;
  }

  /**
   * 同じ空白文字をまとめて読んでtokenを返すかもしれません。
   */
  private readSpace(): Token | null {
    if (this.ch === 0) {
      return null;
    }
    const position = this.position,
      { row, column } = this.textPoint;
    let regexp: RegExp;
    if (this.ch === ' ') {
      regexp = / /;
    } else if (this.ch === '\t') {
      regexp = /\t/;
    } else if (this.ch === '　') {
      // eslint-disable-next-line no-irregular-whitespace
      regexp = /　/;
    } else {
      return null;
    }
    while (this.matchChar(regexp, this.ch)) {
      this.readChar();
    }
    const raw: string = this.chars.slice(position, this.position).join(''),
      location: ILocation = {
        begin: { row, column },
        end: { row, column: column + raw.length },
      };
    this.addTextPoint({ row: 0, column: raw.length });
    return new Token(TokenType.space, location, raw);
  }

  /**
   * TokenType.commentなTokenを返すかもしれません。
   * *dev* 改行とEOLはコメントに入れないこと。
   */
  private readComment(): Token | null {
    const beginComment = (): ';' | '//' | '/*' | null => {
      if (this.ch === 0) {
        return null;
      } else if (this.ch === ';') {
        return ';';
      } else if (this.ch === '/' && this.peekChar() === '/') {
        return '//';
      } else if (this.ch === '/' && this.peekChar() === '*') {
        return '/*';
      } else {
        return null;
      }
    };
    const begin = beginComment();
    if (begin === null) {
      return null;
    }

    const position = this.position,
      { row, column } = this.textPoint;
    let raw: string;
    let cntRow = 0;
    let newColumn = 0;

    if (begin === ';' || begin === '//') {
      for (let i = 0; i < begin.length; i++) {
        this.readChar();
      } // コメント文字文読み進める。
      const notCommentEnd = (): boolean => {
        if (this.ch === 0) {
          return false;
        }
        return !/\r|\n/.test(this.ch);
      };
      while (notCommentEnd()) {
        this.readChar();
      }
      raw = this.chars.slice(position, this.position).join('');
      newColumn = column + raw.length;
    } else if (begin === '/*') {
      this.readChar();
      this.readChar(); // コメント文字文読み進める。
      const notCommentEnd = (): boolean => {
        if (this.ch === 0) {
          return false;
        }
        return !(this.prevChar() === '*' && this.ch === '/');
      };
      while (notCommentEnd()) {
        this.readChar();
      }
      this.readChar();
      raw = this.chars.slice(position, this.position).join('');
      const lines = raw.split(/\n|\r\n|\r/);
      const lastText = lines[lines.length - 1];
      cntRow = lines.length - 1;
      if (lines.length === 1) {
        newColumn = column + raw.length;
      } else {
        newColumn = lastText.length;
      }
    } else {
      throw new Error('予期せぬエラー');
    }

    const location: ILocation = {
      begin: { row, column },
      end: { row: row + cntRow, column: newColumn },
    };
    this.textPoint = { row: row + cntRow, column: newColumn };
    return new Token(TokenType.comment, location, raw);
  }

  /**
   * 演算子に関わるtokenを返すかもしれません。
   */
  private readOperant(): Token | null {
    if (this.ch === 0) {
      return null;
    }
    let location: ILocation;
    const { row, column } = this.textPoint,
      position = this.position;
    let raw: string;

    if (/[=!+\-*/\\<>&|^]/.test(this.ch)) {
      const literal = this.ch + this.peekChar();
      if (
        /==|!=|\+\+|\+=|--|-=|\*=|\/=|\\=|<<|<=|>>|>=|&=|\|=|\^=/.test(literal)
      ) {
        this.readChar();
        this.readChar();
        raw = this.chars.slice(position, this.position).join('');
        location = {
          begin: { row, column },
          end: { row, column: column + raw.length },
        };
      } else {
        this.readChar();
        raw = this.chars.slice(position, this.position).join('');
        location = {
          begin: { row, column },
          end: { row, column: column + raw.length },
        };
      }
      this.addTextPoint({ row: 0, column: raw.length });
      return new Token(TokenType.operant, location, raw);
    }
    return null;
  }

  /**
   * 括弧に関わるtokenを返すかもしれません。
   */
  private readBracket(): Token | null {
    if (this.ch === 0) {
      return null;
    }
    if (/[[\]{}()]/.test(this.ch)) {
      const { row, column } = this.textPoint,
        raw: string = this.ch,
        location: ILocation = {
          begin: { row, column },
          end: { row, column: column + raw.length },
        };
      this.addTextPoint({ row: 0, column: raw.length });
      this.readChar();
      return new Token(TokenType.bracket, location, raw);
    }
    return null;
  }

  /**
   * 数字に関わるtokenを返すかもしれません。
   */
  private readNumber(): Token | null {
    if (this.ch === 0) {
      return null;
    }
    const { row, column } = this.textPoint;
    const position = this.position;

    // 'x'
    if (this.ch === "'") {
      this.readChar();
      while (
        this.matchChar(/\\'/, this.prevChar() + this.ch) ||
        this.matchChar(/[^']/, this.ch)
      ) {
        this.readChar();
      }
      this.readChar();
      const raw: string = this.chars.slice(position, this.position).join(''),
        location: ILocation = {
          begin: { row, column },
          end: { row, column: column + raw.length },
        };
      this.addTextPoint({ row: 0, column: raw.length });
      return new Token(TokenType.int, location, raw);
    }
    // $ 0x
    if (
      this.ch === '$' ||
      (this.ch === '0' && this.matchChar(/[Xx]/, this.peekChar()))
    ) {
      if (this.ch === '0') {
        this.readChar();
        this.readChar();
      } else {
        this.readChar();
      }
      while (this.matchChar(/[0-9a-fA-F]/, this.ch)) {
        this.readChar();
      }
      const raw: string = this.chars.slice(position, this.position).join(''),
        location: ILocation = {
          begin: { row, column },
          end: { row, column: column + raw.length },
        };
      this.addTextPoint({ row: 0, column: raw.length });
      return new Token(TokenType.int, location, raw);
    }
    // % 0b
    if (
      this.ch === '%' ||
      (this.ch === '0' && this.matchChar(/[Bb]/, this.peekChar()))
    ) {
      if (this.ch === '0') {
        this.readChar();
        this.readChar();
      } else {
        this.readChar();
      }
      while (this.matchChar(/[01]/, this.ch)) {
        this.readChar();
      }
      const raw: string = this.chars.slice(position, this.position).join(''),
        location: ILocation = {
          begin: { row, column },
          end: { row, column: column + raw.length },
        };
      this.addTextPoint({ row: 0, column: raw.length });
      return new Token(TokenType.int, location, raw);
    }
    // 整数 浮動小数
    if (this.matchChar(/[0-9]/, this.ch)) {
      // 出現したらフラグを立てる。
      let o = false, // -+記号
        e = false, // 指数表記
        f = false, // 最後のF
        dot = false; // 小数点
      while (this.matchChar(/[0-9EeFf\-+.]/, this.ch)) {
        if (f === true) {
          break;
        } // Fが来たのにまだループしている。
        else if (f === false && this.matchChar(/[Ff]/, this.ch)) {
          f = true;
        } else if (e === false && this.matchChar(/[-+]/, this.ch)) {
          break;
        } // 指数表記じゃないのに-と+が出現した。
        else if (e === true && o === true && this.matchChar(/[-+]/, this.ch)) {
          break;
        } // 指数表記で-と+が二回も出現した。
        else if (e === true && o === false && this.matchChar(/[-+]/, this.ch)) {
          o = true;
        } else if (e === true && this.matchChar(/[Ee]/, this.ch)) {
          break;
        } // 二回目の指数表記が出現した。
        else if (e === false && this.matchChar(/[Ee]/, this.ch)) {
          e = true;
        } else if (dot === true && this.ch === '.') {
          break;
        } // 二回目の小数点が出現した。
        else if (dot === false && this.ch === '.') {
          dot = true;
        }
        this.readChar();
      }
      const raw: string = this.chars.slice(position, this.position).join(''),
        location: ILocation = {
          begin: { row, column },
          end: { row, column: column + raw.length },
        };
      let type: TokenType;
      if (dot || e || f) {
        type = TokenType.double;
      } else {
        type = TokenType.int;
      }
      this.addTextPoint({ row: 0, column: raw.length });
      return new Token(type, location, raw);
    }
    return null;
  }

  /**
   * 文字列に関わるtokenを返すかもしれません。
   */
  private readString(): Token | null {
    if (this.ch === 0) {
      return null;
    }
    const position = this.position;
    const { row, column } = this.textPoint;

    const isCH0 = (): boolean => this.ch === 0;

    if (this.ch === '"') {
      this.readChar(); // このままループ入ると終わってしまうので、一文字進める。
      for (;;) {
        if (this.matchChar(/\\|¥/, this.ch)) {
          this.readChar();
          this.readChar();
        }
        if (this.ch === '"' || this.ch === 0) {
          break;
        }
        this.readChar();
      }
      this.readChar();
      const raw: string = this.chars.slice(position, this.position).join('');
      const location: ILocation = {
        begin: { row, column },
        end: { row, column: column + raw.length },
      };
      this.addTextPoint({ row: 0, column: raw.length });
      return new Token(TokenType.string, location, raw);
    } else if (this.ch === '{' && this.peekChar() === '"') {
      this.readChar();
      this.readChar();
      for (;;) {
        if (this.matchChar(/\\|¥/, this.ch)) {
          this.readChar();
          this.readChar();
        }
        if (this.matchChar(/"}/, this.prevChar() + this.ch) || isCH0()) {
          this.readChar();
          break;
        }
        this.readChar();
      }
      const raw: string = this.chars.slice(position, this.position).join('');
      const lines = raw.split(/\n|\r\n/);
      const cntRow = lines.length - 1;
      let newColumn = 0;
      if (lines.length >= 2) newColumn = lines[lines.length - 1].length;
      else newColumn = column + raw.length;
      const location: ILocation = {
        begin: { row, column },
        end: { row: row + cntRow, column: newColumn },
      };
      this.textPoint = { row: row + cntRow, column: newColumn };
      return new Token(TokenType.string, location, raw);
    }
    return null;
  }

  private isLiteral(): boolean {
    if (this.ch === 0) {
      return false;
    } else {
      // 記号と数字以外だから識別子になれる。
      return !/[[\]<>{}()\-+/*\\¥&#$%^!?.,:;~=|"'\s0-9]/g.test(this.ch);
    }
  }

  private isLiteral2(): boolean {
    if (this.ch === 0) {
      return false;
    } else {
      return !/[[\]<>{}()\-+/*\\¥&#$%^!?.,;:~=|"'\s]/g.test(this.ch);
    }
  }

  /**
   * 文字に関わるtokenを返すかもしれません。
   */
  private readLiteral(): Token | null {
    if (this.isLiteral()) {
      const { row, column } = this.textPoint,
        position = this.position;

      while (this.isLiteral2()) {
        this.readChar();
      }
      const raw = this.chars.slice(position, this.position).join(''),
        location: ILocation = {
          begin: { row, column },
          end: { row, column: column + raw.length },
        };

      this.textPoint = { row, column: column + raw.length };
      return new Token(TokenType.literal, location, raw);
    }
    return null;
  }
}

export function tokenizer(text: string): Token[] {
  const result: Token[] = [];
  const lexer = new Lexer(text);
  for (;;) {
    const token = lexer.nextToken();
    result.push(token);
    if (token.type === TokenType.eol) {
      break;
    }
  }
  return result;
}
