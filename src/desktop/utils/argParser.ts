import {
  satisfy,
  seq,
  choice,
  many,
  map,
  success,
  failure,
} from "../../common/miyamai/miyamai";

// 特定の文字にマッチするパーサ
const char = (c: string) =>
  satisfy(`char_${c}`, (input: string[]) => {
    if (input.length === 0)
      return failure(`Expected '${c}', but input is empty.`);
    const [cur, ...rest] = input;
    if (cur === c) return success(rest, cur);
    return failure(`Expected '${c}', but got '${cur}'.`);
  });

// エスケープシーケンス: \\x → x
const escapedChar = map(
  "escapedChar",
  seq("escapedCharSeq", [
    char("\\"),
    satisfy("anyChar", (input: string[]) => {
      if (input.length === 0)
        return failure("Expected any char, but input is empty.");
      const [cur, ...rest] = input;
      return success(rest, cur);
    }),
  ]),
  ([, c]) => c
);

// クォートなしの文字（空白、"、\\を除く）
const unquotedChar = satisfy("unquotedChar", (input: string[]) => {
  if (input.length === 0)
    return failure("Expected unquoted char, but input is empty.");
  const [cur, ...rest] = input;
  if (!/\s/.test(cur) && cur !== '"' && cur !== "\\") return success(rest, cur);
  return failure(`Not a valid unquoted char: '${cur}'.`);
});

// エスケープまたはクォートなし文字の連続 → 1つ以上
const unquoted = map(
  "unquoted",
  many(
    "unquotedMany",
    choice("unquotedChoice", [escapedChar, unquotedChar]),
    1
  ),
  (chars: string[]) => chars.join("")
);

// クォート内文字: エスケープまたは"以外の文字
const innerChar = choice("innerCharChoice", [
  escapedChar,
  satisfy("quotedChar", (input: string[]) => {
    if (input.length === 0)
      return failure("Expected quoted char, but input is empty.");
    const [cur, ...rest] = input;
    if (cur !== '"' && cur !== "\\") return success(rest, cur);
    return failure(`Not a valid quoted char: '${cur}'.`);
  }),
]);

// ダブルクォーテーションで囲まれた文字列
const quoted = map(
  "quoted",
  seq("quotedSeq", [char('"'), many("innerMany", innerChar, 0), char('"')]),
  ([, chars]) => chars.join("")
);

// 引数要素: クォート文字列またはクォートなし文字列
const element = choice("elementChoice", [quoted, unquoted]);

/**
 * 入力文字列をコマンドライン引数に分割する
 * ダブルクォーテーションとエスケープに対応
 */
export function parseArgs(input: string): string[] {
  const chars = Array.from(input);
  const results: string[] = [];
  let rest = chars;
  while (rest.length > 0) {
    // 先頭の空白をスキップ
    if (/\s/.test(rest[0])) {
      rest = rest.slice(1);
      continue;
    }
    const r = element.parse(rest);
    if (!r.success) {
      // パースできない場合は終了
      break;
    }
    results.push(r.value as string);
    rest = r.rest;
  }
  return results;
}
