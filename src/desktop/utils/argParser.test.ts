import { parseArgs } from "./argParser";

describe("parseArgs", () => {
  test("空文字列", () => {
    expect(parseArgs("")).toEqual([]);
  });

  test("単純な分割", () => {
    expect(parseArgs("a b c")).toEqual(["a", "b", "c"]);
  });

  test("複数スペースと先頭末尾スペース", () => {
    expect(parseArgs("  a   b  ")).toEqual(["a", "b"]);
  });

  test("ダブルクォートを含む引数", () => {
    expect(parseArgs('a "b c" d')).toEqual(["a", "b c", "d"]);
  });

  test("複数のクォート引数", () => {
    expect(parseArgs('"foo bar" "baz qux"')).toEqual(["foo bar", "baz qux"]);
  });

  test("エスケープされたスペース", () => {
    expect(parseArgs("foo\\ bar baz")).toEqual(["foo bar", "baz"]);
  });

  test("クォート内でのエスケープ", () => {
    expect(parseArgs('"foo\\"bar" quux')).toEqual(['foo"bar', "quux"]);
  });

  test("未閉じクォート", () => {
    expect(parseArgs('"foo bar')).toEqual([]);
  });
});
