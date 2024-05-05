import { Lexer, Token, TokenType } from "../src/hsp/hsp";

describe("token", () => {
  test("new", () => {
    const text = "// neko";
    const type = TokenType.comment;
    const token = new Token(type, text);
    expect(token.has(TokenType.comment)).toBe(true);
    expect(token.has(TokenType.comment, text)).toBe(true);
    expect(token.has(TokenType.comment, ";hoge")).toBe(false);
    expect(token.has(TokenType.other)).toBe(false);
    expect(token.length).toBe([...text].length);
    expect(token.type).toBe(type);
    expect(token.raw).toBe(text);
  });
});

describe("lexer", () => {
  test("hasLiteral", () => {
    const neko = new Lexer("neko");
    expect(neko.hasLiteral("n")).toBe(true);
    expect(neko.hasLiteral("neko")).toBe(true);
  });
  test("comments", () => {
    const txt = "; neko";
    const tok = new Token(TokenType.comment, txt);
    const come = new Lexer(txt);
    expect(come.readComment()).toEqual(tok);
  });
});
