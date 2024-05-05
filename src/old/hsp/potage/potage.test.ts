import { Parser, choice, not, option, repeat, satisfy, seq } from "./potage";
describe("potage", () => {
  let any: Parser<string>;
  describe("Primitive Parser", () => {
    // anyパーサーを定義する。
    any = satisfy((input, name) => {
      expect(name).toBe("any"); // コールバック関数のnameパラメータは、satisfyのname引き数と同じになる。
      const [data, ...rest] = input; // input配列引き数にパースする情報がある。
      return {
        result: "success", // パースの成否を入れる。
        data, // パースに成功した結果を入れる。
        rest, // 消費しきれなかったinputを入れる。
      };
    }, "any");
    expect(any.name).toBe("any");

    test("any success", () => {
      const input = [..."neko"];
      const r = any(input);
      expect(r).toStrictEqual({
        result: "success",
        data: "n",
        rest: ["e", "k", "o"],
      });
    });

    test("any fail (empty input)", () => {
      const r = any([]);
      expect(r).toStrictEqual({
        result: "fail",
        reason: expect.any(String),
      });
    });
  });

  // テストに必要なパーサーを用意する。
  // inputを一つ取り、一文字にマッチするパーサー
  const char = (str: string) =>
    satisfy<string>((input, name) => {
      const [char, ...rest] = input;
      if (char === str) return { result: "success", data: char, rest };
      return {
        result: "fail",
        reason: `${name}: "${str}"を期待していたが"${char}"だった。`,
      };
    }, `char_${str}`);
  expect(char.name).toBe("char");
  // 文字列の数だけinputを取り、その文字列にマッチするパーサー
  const chars = (word: string) =>
    seq(
      [...word].map((val) => char(val)),
      "chars",
    );
  expect(chars.name).toBe("chars");

  describe("Combinator", () => {
    describe("not", () => {
      const notAny = not(any, "notAny");
      expect(notAny.name).toEqual("notAny");

      test("success to fail", () => {
        const out = notAny(["a"]);
        expect(out).toStrictEqual({
          result: "fail",
          reason: expect.any(String),
        });
      });

      test("fail to success", () => {
        const out = notAny([]);
        expect(out).toStrictEqual({ result: "success", data: null, rest: [] });
      });
    });

    describe("option", () => {
      test("success", () => {
        const out = option(any)(["a"]);
        expect(out).toStrictEqual({
          result: "success",
          data: "a",
          rest: [], // パースに成功すると、inputは消費される。
        });
      });
      test("fail, Always successful", () => {
        const opt = option(not(any));
        const out = opt(["a"]);
        expect(out).toStrictEqual({
          result: "success",
          data: null,
          rest: ["a"], // 失敗なら、inputは消費されない。
        });
      });
    });

    describe("seq", () => {
      const print = chars("print");
      test("success", () => {
        const out = print([..."print"]);
        expect(out).toStrictEqual({
          result: "success",
          data: [..."print"],
          rest: [],
        });
      });
      test("fail", () => {
        const out = print([..."hoge"]);
        expect(out).toStrictEqual({
          result: "fail",
          reason: expect.any(String),
        });
      });
    });

    describe("choice", () => {
      const prints = choice([chars("print"), chars("mes")], "prints");
      test("success", () => {
        const out = prints([..."mes"]);
        expect(out).toStrictEqual({
          result: "success",
          data: [..."mes"],
          rest: [],
        });
      });
      test("fail", () => {
        const out = prints([..."hoge"]);
        expect(out).toStrictEqual({
          result: "fail",
          reason: expect.any(String),
        });
      });
    });

    describe("repeat", () => {
      const many = (p: Parser<string>, name = "many") =>
        repeat(p, 0, Number.POSITIVE_INFINITY, name);
      test("success", () => {
        const out = many(char("a"))([..."aaa"]);
        expect(out).toStrictEqual({
          result: "success",
          data: ["a", "a", "a"],
          rest: [],
        });
      });
    });
    describe("map", () => {});
    describe("filter", () => {});
    describe("lazy", () => {});
    describe("hold", () => {});
  });
});
