import {
  choice,
  many,
  not,
  option,
  satisfy,
  seq,
  success,
  failure,
  override,
} from "./miyamai";

// Test for `satisfy`
describe("satisfy", () => {
  it("should return success when the callback succeeds", () => {
    const parser = satisfy("testParser", (input: number[]) => {
      if (input[0] > 0) {
        return { success: true, value: input[0], rest: input.slice(1) };
      }
      return { success: false, msg: "Value is not greater than 0" };
    });

    const result = parser.parse([5, 10]);
    expect(result).toEqual({
      name: "testParser",
      success: true,
      value: 5,
      rest: [10],
    });
  });

  it("should return failure when the callback fails", () => {
    const parser = satisfy("testParser", (input: number[]) => {
      if (input[0] > 0) {
        return { success: true, value: input[0], rest: input.slice(1) };
      }
      return { success: false, msg: "Value is not greater than 0" };
    });

    const result = parser.parse([-1, 10]);
    expect(result).toEqual({
      name: "testParser",
      success: false,
      msg: "Value is not greater than 0",
    });
  });

  it("should return failure when input is empty", () => {
    const parser = satisfy("testParser", (input: number[]) => {
      return { success: true, value: input[0], rest: input.slice(1) };
    });

    const result = parser.parse([]);
    expect(result).toEqual({
      name: "testParser",
      success: false,
      msg: "input is empty.",
    });
  });

  it("should return failure when the callback throws an exception", () => {
    const parser = satisfy("testParser", () => {
      throw new Error("Callback error");
    });

    const result = parser.parse([5, 10]);
    expect(result).toEqual({
      name: "testParser",
      success: false,
      msg: "throw callback.",
      other: new Error("Callback error"),
    });
  });
});

// Test for `seq`
describe("seq", () => {
  it("should return success when all parsers succeed", () => {
    const parser1 = satisfy("parser1", (input: number[]) => ({
      success: true,
      value: input[0],
      rest: input.slice(1),
    }));
    const parser2 = satisfy("parser2", (input: number[]) => ({
      success: true,
      value: input[0] * 2,
      rest: input.slice(1),
    }));

    const sequence = seq("sequenceParser", [parser1, parser2]);
    const result = sequence.parse([5, 10]);

    expect(result).toEqual({
      success: true,
      name: "sequenceParser",
      rest: [],
      value: [5, 20],
      context: [
        { success: true, name: "parser1", rest: [10], value: 5 },
        { success: true, name: "parser2", rest: [], value: 20 },
      ],
    });
  });

  it("should return failure when one of the parsers fails", () => {
    const parser1 = satisfy("parser1", (input: number[]) => ({
      success: true,
      value: input[0],
      rest: input.slice(1),
    }));
    const parser2 = satisfy("parser2", (input: number[]) => ({
      success: false,
      msg: "Parser2 failed",
    }));

    const sequence = seq("sequenceParser", [parser1, parser2]);
    const result = sequence.parse([5, 10]);
    expect(result).toEqual({
      success: false,
      name: "sequenceParser",
      msg: 'failure "parser2" parser as step (1)',
      context: [
        { success: true, name: "parser1", rest: [10], value: 5 },
        { success: false, name: "parser2", msg: "Parser2 failed" },
      ],
    });
  });
});

// Test for `choice`
describe("choice", () => {
  it("should return success when the first parser succeeds", () => {
    const parser1 = satisfy("parser1", (input: number[]) => ({
      success: true,
      value: input[0],
      rest: input.slice(1),
    }));
    const parser2 = satisfy("parser2", (input: number[]) => ({
      success: false,
      msg: "Parser2 failed",
    }));

    const choiceParser = choice("choiceParser", [parser1, parser2]);
    const result = choiceParser.parse([5, 10]);

    expect(result).toEqual({
      name: "choiceParser",
      success: true,
      value: 5,
      rest: [10],
      context: [
        {
          name: "parser1",
          success: true,
          value: 5,
          rest: [10],
        },
      ],
    });
  });

  it("should return success when the second parser succeeds", () => {
    const parser1 = satisfy("parser1", (input: number[]) => ({
      success: false,
      msg: "Parser1 failed",
    }));
    const parser2 = satisfy("parser2", (input: number[]) => ({
      success: true,
      value: input[0] * 2,
      rest: input.slice(1),
    }));

    const choiceParser = choice("choiceParser", [parser1, parser2]);
    const result = choiceParser.parse([5, 10]);

    expect(result).toEqual({
      name: "choiceParser",
      success: true,
      value: 10,
      rest: [10],
      context: [
        {
          name: "parser1",
          success: false,
          msg: "Parser1 failed",
        },
        {
          name: "parser2",
          success: true,
          value: 10,
          rest: [10],
        },
      ],
    });
  });

  it("should return failure when all parsers fail", () => {
    const parser1 = satisfy("parser1", (input: number[]) => ({
      success: false,
      msg: "Parser1 failed",
    }));
    const parser2 = satisfy("parser2", (input: number[]) => ({
      success: false,
      msg: "Parser2 failed",
    }));

    const choiceParser = choice("choiceParser", [parser1, parser2]);
    const result = choiceParser.parse([5, 10]);

    expect(result).toEqual({
      name: "choiceParser",
      success: false,
      msg: "All parse is failed.",
      context: [
        {
          name: "parser1",
          success: false,
          msg: "Parser1 failed",
        },
        {
          name: "parser2",
          success: false,
          msg: "Parser2 failed",
        },
      ],
    });
  });
});

// Test for `option`
describe("option", () => {
  it("should return success with value when the parser succeeds", () => {
    const parser = satisfy("testParser", (input: number[]) => ({
      success: true,
      value: input[0],
      rest: input.slice(1),
    }));

    const optionParser = option("optionParser", parser);
    const result = optionParser.parse([5, 10]);

    expect(result).toEqual({
      name: "optionParser",
      success: true,
      value: 5,
      rest: [10],
      context: [
        {
          name: "testParser",
          success: true,
          value: 5,
          rest: [10],
        },
      ],
    });
  });

  it("should return success with null when the parser fails", () => {
    const parser = satisfy("testParser", (input: number[]) => ({
      success: false,
      msg: "Parser failed",
    }));

    const optionParser = option("optionParser", parser);
    const result = optionParser.parse([5, 10]);

    expect(result).toEqual({
      name: "optionParser",
      success: true,
      value: null,
      rest: [5, 10],
      context: [
        {
          name: "testParser",
          success: false,
          msg: "Parser failed",
        },
      ],
    });
  });

  it("should return success with null when input is empty", () => {
    const parser = satisfy("testParser", (input: number[]) => ({
      success: false,
      msg: "Parser failed",
    }));

    const optionParser = option("optionParser", parser);
    const result = optionParser.parse([]);

    expect(result).toEqual({
      name: "optionParser",
      success: true,
      value: null,
      rest: [],
      context: [
        {
          name: "testParser",
          success: false,
          msg: "input is empty.",
        },
      ],
    });
  });
});

// Test for `not`
describe("not", () => {
  it("should return success when the parser fails", () => {
    const parser = satisfy("testParser", (input: number[]) => ({
      success: false,
      msg: "Parser failed",
    }));

    const notParser = not("notParser", parser);
    const result = notParser.parse([5, 10]);

    expect(result).toEqual({
      name: "notParser",
      success: true,
      value: null,
      rest: [5, 10],
      context: [
        {
          name: "testParser",
          success: false,
          msg: "Parser failed",
        },
      ],
    });
  });

  it("should return failure when the parser succeeds", () => {
    const parser = satisfy("testParser", (input: number[]) => ({
      success: true,
      value: input[0],
      rest: input.slice(1),
    }));

    const notParser = not("notParser", parser);
    const result = notParser.parse([5, 10]);

    expect(result).toEqual({
      name: "notParser",
      success: false,
      msg: 'success in "testParser" parser.',
      context: [
        {
          name: "testParser",
          success: true,
          value: 5,
          rest: [10],
        },
      ],
    });
  });

  it("should return failure when input is empty", () => {
    const parser = satisfy("testParser", (input: number[]) => ({
      success: false,
      msg: "Parser failed",
    }));

    const notParser = not("notParser", parser);
    const result = notParser.parse([]);

    expect(result).toEqual({
      name: "notParser",
      success: false,
      msg: "input is empty.",
    });
  });
});

// Test for `many`
describe("many", () => {
  it("should return success when the parser succeeds multiple times", () => {
    const parser = satisfy("testParser", (input: number[]) => ({
      success: true,
      value: input[0],
      rest: input.slice(1),
    }));

    const manyParser = many("manyParser", parser);
    const result = manyParser.parse([5, 10, 15]);

    expect(result).toEqual({
      name: "manyParser",
      success: true,
      value: [5, 10, 15],
      rest: [],
      context: [
        { name: "testParser", success: true, value: 5, rest: [10, 15] },
        { name: "testParser", success: true, value: 10, rest: [15] },
        { name: "testParser", success: true, value: 15, rest: [] },
      ],
    });
  });

  it("should return success when the parser succeeds at least the minimum number of times", () => {
    const parser = satisfy("testParser", (input: number[]) => ({
      success: true,
      value: input[0],
      rest: input.slice(1),
    }));

    const manyParser = many("manyParser", parser, 2);
    const result = manyParser.parse([5, 10]);

    expect(result).toEqual({
      name: "manyParser",
      success: true,
      value: [5, 10],
      rest: [],
      context: [
        { name: "testParser", success: true, value: 5, rest: [10] },
        { name: "testParser", success: true, value: 10, rest: [] },
      ],
    });
  });

  it("should return failure when the parser does not meet the minimum repetitions", () => {
    const parser = satisfy("testParser", (input: number[]) => ({
      success: true,
      value: input[0],
      rest: input.slice(1),
    }));

    const manyParser = many("manyParser", parser, 3);
    const result = manyParser.parse([5, 10]);

    expect(result).toEqual({
      name: "manyParser",
      success: false,
      msg: "failed to meet minimum repetitions",
      context: [
        { name: "testParser", success: true, value: 5, rest: [10] },
        { name: "testParser", success: true, value: 10, rest: [] },
      ],
    });
  });

  it("should return success when the parser stops after reaching the maximum repetitions", () => {
    const parser = satisfy("testParser", (input: number[]) => ({
      success: true,
      value: input[0],
      rest: input.slice(1),
    }));

    const manyParser = many("manyParser", parser, 0, 2);
    const result = manyParser.parse([5, 10, 15]);

    expect(result).toEqual({
      name: "manyParser",
      success: true,
      value: [5, 10],
      rest: [15],
      context: [
        { name: "testParser", success: true, value: 5, rest: [10, 15] },
        { name: "testParser", success: true, value: 10, rest: [15] },
      ],
    });
  });

  it("should return success with an empty value when input is empty and minimum is 0", () => {
    const parser = satisfy("testParser", (input: number[]) => ({
      success: true,
      value: input[0],
      rest: input.slice(1),
    }));

    const manyParser = many("manyParser", parser, 0);
    const result = manyParser.parse([]);

    expect(result).toEqual({
      name: "manyParser",
      success: true,
      value: [],
      rest: [],
      context: [],
    });
  });

  it("should return failure when input is empty and minimum is greater than 0", () => {
    const parser = satisfy("testParser", (input: number[]) => ({
      success: true,
      value: input[0],
      rest: input.slice(1),
    }));

    const manyParser = many("manyParser", parser, 1);
    const result = manyParser.parse([]);

    expect(result).toEqual({
      name: "manyParser",
      success: false,
      msg: "failed to meet minimum repetitions",
      context: [],
    });
  });

  it("should stop parsing when the parser fails", () => {
    const parser = satisfy("testParser", (input: number[]) => {
      if (input[0] > 0) {
        return { success: true, value: input[0], rest: input.slice(1) };
      }
      return { success: false, msg: "Value is not greater than 0" };
    });

    const manyParser = many("manyParser", parser);
    const result = manyParser.parse([5, 10, -1, 15]);

    expect(result).toEqual({
      name: "manyParser",
      success: true,
      value: [5, 10],
      rest: [-1, 15],
      context: [
        { name: "testParser", success: true, value: 5, rest: [10, -1, 15] },
        { name: "testParser", success: true, value: 10, rest: [-1, 15] },
        {
          name: "testParser",
          success: false,
          msg: "Value is not greater than 0",
        },
      ],
    });
  });
});

// Test for `override`
describe("override", () => {
  it("should override the parser's name and return the new name", () => {
    const parser = satisfy("originalParser", (input: number[]) => ({
      success: true,
      value: input[0],
      rest: input.slice(1),
    }));

    const overriddenParser = override("newParser", parser, (result) => result);
    const result = overriddenParser.parse([5, 10]);

    expect(result).toEqual({
      name: "newParser",
      success: true,
      value: 5,
      rest: [10],
    });
  });

  it("should return failure when the override callback throws an exception", () => {
    const parser = satisfy("originalParser", (input: number[]) => ({
      success: true,
      value: input[0],
      rest: input.slice(1),
    }));

    const overriddenParser = override("newParser", parser, () => {
      throw new Error("Override callback error");
    });

    const result = overriddenParser.parse([5, 10]);

    expect(result).toEqual({
      name: "newParser",
      success: false,
      msg: "throw callback.",
      other: new Error("Override callback error"),
    });
  });
});

describe("型の混合", () => {
  const char = (c: string) =>
    satisfy(`char_${c}`, (input: string[]) => {
      const [cur, ...rest] = input;
      if (cur === c) return success(rest, cur);
      return failure(`Expected '${c}', but got '${cur}' or input is empty.`);
    });

  const chars = (text: string) =>
    override(
      "map_chars",
      seq(
        `chars_${text}`,
        Array.from(text).map((v) => char(v))
      ),
      (result) => {
        if (result.success)
          return success(result.rest, result.value.join(""), result.context);
        else return result;
      }
    );

  const number = satisfy("numbers", (input: string[]) => {
    const [cur, ...rest] = input;
    if (!isNaN(Number(cur))) return success(rest, Number(cur));
    return failure(`Expected a number, but got '${cur}' or input is empty.`);
  });

  const neko = chars("neko");
  const r1 = neko.parse([..."neko"]);
  if (r1.success) {
    expect(r1).toMatchObject({
      success: true,
      name: "map_chars",
      rest: [],
      value: "neko",
    });
  }

  const neko_numbers = seq("neko_numbers", [neko, number]);
  const r2 = neko_numbers.parse([..."neko123"]);
  expect(r2).toMatchObject({
    success: true,
    name: "neko_numbers",
    rest: ["2", "3"],
    value: ["neko", 1],
    context: [
      {
        name: "map_chars",
        success: true,
        value: "neko",
        rest: ["1", "2", "3"],
      },
      {
        name: "numbers",
        success: true,
        value: 1,
        rest: ["2", "3"],
      },
    ],
  });
});
