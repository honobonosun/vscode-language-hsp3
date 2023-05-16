import { Position, Range } from "vscode";

const keywords = `
parse, parsed, parser

result, success, succeed, fail, failed

input, output, next, prev, read, peek, current, raw, length, position

satisfy, any, many, lazy, map, filter, seq, opstion, choice

前作、potage.tsのリカバリ挙動として、エラーを投げて回収するのは重かった。
今回、エラーは自作のObjectで表現して、自前でエラーを表現する。

読む https://blog.livewing.net/typescript-parser-combinator
`;

export enum TokenType {
  eol,
  space,
  newline,
  comment,
  literal,
  string,
  symbol,
  value,
  other,
}

export class Token {
  length: number;
  constructor(public type: TokenType, public raw: string) {
    this.length = [...raw].length;
  }

  has(type: TokenType, raw?: string) {
    if (type !== this.type) return false;
    if (raw && raw !== this.raw) return false;
    return true;
  }
}

// !@#$%^&*()-_=+{}[]<>,./\;:'"
const RegExpSymbols = /[!@#$%^&*()\-_=+{}\[\]<>,.\\\/;:'"]/;
// 0123456789
const RegExpNumbers = /[0-9]/;

export class Lexer {
  public chars: string[];
  public cur: number;

  constructor(public source: string) {
    this.chars = Array.from(source);
    this.cur = 0;
  }

  hasNext() {
    if (this.cur >= this.chars.length) return false;
    return true;
  }

  isEOL() {
    if (this.cur === this.chars.length) return true;
    else false;
  }

  countPosition(start: number, end: number) {}
  //updatePosition(range) {}

  countup(length: number) {
    this.cur += length;
  }

  peekToken() {
    if (this.isEOL()) {
      this.cur++;
      return null;
    }
    if (!this.hasNext()) return undefined;

    const readfuncs = [this.readComment, this.readLiteral];
    for (const fn of readfuncs) {
      const token = fn();
      if (token) return token;
    }
    return undefined; // readfuncsのメソッド全て失敗した場合の返り値
  }

  readToken() {
    const token = this.peekToken();
    if (token) this.countup(token.length);
    return token;
  }

  *consume() {
    const token = this.readToken();
    if (token) yield token;
    else return token;
  }

  hasLiteral(str: string, offset: number = 0) {
    const index = this.cur + offset;
    if (index <= -1 || index >= this.chars.length)
      throw new Error('func arg "offset" is over value.');

    const length = [...str].length;
    if (length === 1) return this.chars[index] === str;
    else return this.chars.slice(index, index + length).join("") === str;
  }

  // strの位置を探す。
  find(str: string, offset: number = 0) {
    const index = this.cur + offset;
    if (index <= -1 || index >= this.chars.length)
      throw new Error('func arg "offset" is over value.');

    const target = [...str];
    const length = target.length;
    let hitcnt = 0;
    for (let i = index; i < this.chars.length; i++) {
      if (this.chars[i] === target[hitcnt]) {
        hitcnt++;
        if (hitcnt >= length) return i; // this.charsから見た位置を返す。
      } else {
        hitcnt = 0;
      }
    }
    return -1; // 見つからなかった。
  }

  // read~は文字をトークンにするメソッド達
  // 成功すればTokenが返り、失敗すればundefinedを返す。

  readComment() {
    console.log(this.hasLiteral(";"));
    
    if (this.hasLiteral(";") || this.hasLiteral("//")) {
      const i = this.find("\n");
      if (i === -1) return undefined;
      return new Token(
        TokenType.comment,
        this.chars.slice(this.cur, i).join(""),
      );
    } else if (this.hasLiteral("/*")) {
      const i = this.find("*/");
      if (i === -1) return undefined;
      return new Token(
        TokenType.comment,
        this.chars.slice(this.cur, i).join(""),
      );
    }
  }

  readLiteral() {
    const char1 = this.chars[this.cur];
    if (RegExpNumbers.test(char1) || RegExpSymbols.test(char1))
      return undefined;
    let count = 0;
    for (let i = this.cur; i < this.chars.length; i++) {
      if (this.chars[i].search(RegExpSymbols) === 0) {
        count = i;
        break;
      }
    }

    const raw = this.chars.slice(this.cur, count).join("");
    return new Token(TokenType.literal, raw);
  }
}

export class Parser {}
