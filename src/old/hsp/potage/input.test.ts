import { input } from "./input";

describe("input", () => {
  test("single char", () => {
    const r = input("a");
    expect(r).toStrictEqual([
      {
        char: "a",
        point: 0,
        line: 0,
        column: 0,
      },
    ]);
  });

  test("newline", () => {
    const r = input("\n");
    expect(r).toStrictEqual([
      {
        char: "\n",
        point: 0,
        line: 0,
        column: 0,
      },
    ]);
  });

  test("newline + double char", () => {
    const r = input("\nab");
    expect(r).toStrictEqual([
      {
        char: "\n",
        point: 0,
        line: 0,
        column: 0,
      },
      {
        char: "a",
        point: 1,
        line: 1,
        column: 0,
      },
      {
        char: "b",
        point: 2,
        line: 1,
        column: 1,
      },
    ]);
  });

  test("\\r\\n", () => {
    const r = input("\r\n");
    expect(r).toStrictEqual([
      {
        char: "\r",
        point: 0,
        line: 0,
        column: 0,
      },
      {
        char: "\n",
        point: 1,
        line: 0,
        column: 1,
      },
    ]);
  });

  test("empty input data", () => {
    const r = input("");
    expect(r).toStrictEqual([]);
  });
});
