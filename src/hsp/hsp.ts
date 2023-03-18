import { Position } from "vscode";

var keywords = `
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
  symbol,
  value,
}

export class Token {
  constructor(
    public type: TokenType,
    public raw: string,
    public position: Position,
  ) {}

  has(type: TokenType, raw?: string) {
    if (type !== this.type) return false;
    if (raw && raw !== this.raw) return false;
    return true;
  }
}

export class Lexer {}
export class Parser {}
