export declare enum TokenType {
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

export type Token = {
  raw: string;
  length: number;
  type: TokenType;
};

export function makeToken(raw: string, type: TokenType): Token {
  return { raw, length: [...raw].length, type };
}

export function hasToken(token: Token, type: TokenType, raw?: string) {
  if (raw) return token.type === type && token.raw === raw;
  return token.type === type;
}

export class Chars {
  chars: string[];
  constructor(raw: string) {
    this.chars = Array.from(raw);
  }
  get length() {
    return this.chars.length;
  }
}

const regexp = {
  number: /[0-9]/,
  symbol: /[!@#$%^&*()\-_=+{}\[\]<>,.\\\/;:'"]/,
  numberAndSymbol: /[0-9!@#$%^&*()\-_=+{}\[\]<>,.\\\/;:'"]/,
};

export class Lexer {
  chars: string[];
  offset: number;
  constructor(raw: string) {
    this.chars = Array.from(raw);
    this.offset = 0;
  }
  readToken() {}
}
