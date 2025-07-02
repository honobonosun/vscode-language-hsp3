import {
  satisfy,
  success,
  failure,
  seq,
  choice,
  many,
  map,
} from "../../common/miyamai/miyamai";

type VarNode =
  | { type: "escCurly"; name: string }
  | { type: "escPercent"; name: string }
  | { type: "varCurly"; name: string }
  | { type: "varPercent"; name: string }
  | { type: "text"; value: string };

// 単一文字マッチャー
const char = (c: string) =>
  satisfy(`char_${c}`, (input: string[]) => {
    if (input.length === 0)
      return failure(`Expected '${c}', but input is empty.`);
    const [cur, ...rest] = input;
    if (cur === c) return success(rest, cur);
    return failure(`Expected '${c}', but got '${cur}'.`);
  });

// 変数名の一文字
const nameChar = satisfy("varNameChar", (input: string[]) => {
  if (input.length === 0)
    return failure("Expected a name char, but input is empty.");
  const [cur, ...rest] = input;
  if (/^[A-Za-z0-9_]$/.test(cur)) return success(rest, cur);
  return failure(`Expected a word char, but got '${cur}'.`);
});

// 変数名全体
const varName = map(
  "varName",
  many("manyNameChars", nameChar, 1),
  (chars: string[]) => chars.join("")
);

// \${VAR}
const escCurly = map(
  "escCurly",
  seq("escCurlySeq", [char("\\"), char("$"), char("{"), varName, char("}")]),
  ([, , , name]) => ({ type: "escCurly", name })
);

// \%VAR%
const escPercent = map(
  "escPercent",
  seq("escPercentSeq", [char("\\"), char("%"), varName, char("%")]),
  ([, , name]) => ({ type: "escPercent", name })
);

// ${VAR}
const varCurly = map(
  "varCurly",
  seq("varCurlySeq", [char("$"), char("{"), varName, char("}")]),
  ([, , name]) => ({ type: "varCurly", name })
);

// %VAR%
const varPercent = map(
  "varPercent",
  seq("varPercentSeq", [char("%"), varName, char("%")]),
  ([, name]) => ({ type: "varPercent", name })
);

// テキストチャンク（エスケープ開始文字/展開開始文字以外）
const textChunk = map(
  "text",
  many(
    "manyTextChars",
    satisfy("textChar", (input: string[]) => {
      if (input.length === 0) return failure("EOF");
      const [cur, ...rest] = input;
      if (cur !== "\\" && cur !== "$" && cur !== "%") return success(rest, cur);
      return failure("Not a text char.");
    }),
    1
  ),
  (chars: string[]) => ({ type: "text", value: chars.join("") })
);

/** 全パーサーを順序付きで適用 */
export const varParser = many(
  "varParser",
  choice("varChoice", [escCurly, escPercent, varCurly, varPercent, textChunk])
);

/** 文字列内の環境変数を評価して展開する */
export function evalVars(input: string, vars: Record<string, string>): string {
  const chars = Array.from(input);
  const result = varParser.parse(chars);
  if (!result.success) return input;
  // result.value は VarNode[] のはずなのでキャストして扱う
  const nodes = result.value as VarNode[];
  return nodes
    .map((node) => {
      switch (node.type) {
        case "escCurly":
          return `\${` + node.name + `}`;
        case "escPercent":
          return `%${node.name}%`;
        case "varCurly":
          return vars[node.name] ?? `\${` + node.name + `}`;
        case "varPercent":
          return vars[node.name] ?? `%${node.name}%`;
        case "text":
          return node.value;
      }
    })
    .join("");
}
