import { evalVars, varParser } from "./varParser";

type AnyResult<T> = { success: any; value?: T; error?: any };
function assertSuccess<T>(
  result: AnyResult<T>
): asserts result is { success: true; value: T } {
  if (!result.success) {
    throw new Error(`Expected parser success but got failure: ${result.error}`);
  }
}

describe("varParser.parse", () => {
  test("テキストチャンクのみ", () => {
    const input = "hello";
    const result = varParser.parse(Array.from(input));
    assertSuccess(result);
    expect(result.value).toEqual([{ type: "text", value: "hello" }]);
  });

  test("${VAR} をパース", () => {
    const input = "${FOO}";
    const result = varParser.parse(Array.from(input));
    assertSuccess(result);
    expect(result.value).toEqual([{ type: "varCurly", name: "FOO" }]);
  });

  test("%VAR% をパース", () => {
    const input = "%BAR%";
    const result = varParser.parse(Array.from(input));
    assertSuccess(result);
    expect(result.value).toEqual([{ type: "varPercent", name: "BAR" }]);
  });

  test("\\${VAR} をエスケープ", () => {
    const input = "\\${ESC}";
    const result = varParser.parse(Array.from(input));
    assertSuccess(result);
    expect(result.value).toEqual([{ type: "escCurly", name: "ESC" }]);
  });

  test("\\%VAR% をエスケープ", () => {
    const input = "\\%ESC%";
    const result = varParser.parse(Array.from(input));
    assertSuccess(result);
    expect(result.value).toEqual([{ type: "escPercent", name: "ESC" }]);
  });

  test("複合文字列をパース", () => {
    const input = "a${X}b%Y%c";
    const result = varParser.parse(Array.from(input));
    assertSuccess(result);
    expect(result.value).toEqual([
      { type: "text", value: "a" },
      { type: "varCurly", name: "X" },
      { type: "text", value: "b" },
      { type: "varPercent", name: "Y" },
      { type: "text", value: "c" },
    ]);
  });
});

describe("evalVars", () => {
  test("環境変数を展開する", () => {
    const input = "Hello ${A}, your code is %B%";
    const vars = { A: "Alice", B: "Beta" };
    expect(evalVars(input, vars)).toBe("Hello Alice, your code is Beta");
  });

  test("未定義の変数は元の文字列のまま", () => {
    const input = "${X}%Y%";
    expect(evalVars(input, {})).toBe("${X}%Y%");
  });

  test("エスケープされた変数は展開されずエスケープ文字が削除される", () => {
    const input = "\\${ESC}\\%ESC%";
    const vars = { ESC: "ignored" };
    expect(evalVars(input, vars)).toBe("${ESC}%ESC%");
  });

  test("複合ケースで正しく展開・保持する", () => {
    const input = "a\\${E}b${V}c%P%d";
    const vars = { V: "v", P: "p" };
    expect(evalVars(input, vars)).toBe("a${E}bvcpd");
  });
});
