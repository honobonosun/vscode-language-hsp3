// 位置情報
import {
  satisfy,
  any,
  raw,
  type,
  regexp,
  log,
  desc,
  choice,
  seq,
  option,
  many,
  filter,
  lazy,
  IResult,
  IParser,
} from "./potage";
import { map } from "./potage";
import { Token, TokenType } from "./token";

export enum kinds {
  label = "label",
  module = "module",
  global = "global",
  define = "define",
  const = "const",
  enum = "enum",
  deffunc = "deffunc",
  defcfunc = "defcfunc",
  modfunc = "modfunc",
  modcfunc = "modcfunc",
  modinit = "modinit",
  modterm = "modterm",
  func = "func",
  cfunc = "cfunc",
  cmd = "cmd",
}

export interface IOutlineElement {
  kind: kinds;
  literal: string;
  position: {
    literal: [number, number];
    entire: [number, number];
  };
}

export function parse(tokens: Token[]) {
  // パーサを作る
  /**
   * 一回以上繰り返されることを渡されたパーサ関数に期待します。
   *
   * 一度も成功しなかった場合、失敗を返すパーサ関数を返します。
   * @param parser 一回以上繰り返されるパーサ関数
   */
  const doMany = (parser: IParser) =>
    filter(many(parser), (r) => r.result.length > 0);

  // シンボル
  const symbol = (tok: TokenType, raw: string) =>
    satisfy((t) =>
      t.type === tok && t.raw === raw ? { symbol: t.raw } : undefined
    );
  let dash = symbol(TokenType.operant, "-");
  let plus = symbol(TokenType.operant, "+");
  let asterisk = symbol(TokenType.operant, "*");
  let slash = symbol(TokenType.operant, "/");
  let backslash = satisfy((t) =>
    t.type === TokenType.operant && /¥|\\/.test(t.raw)
      ? { symbol: t.raw }
      : undefined
  );
  let right_angle = symbol(TokenType.operant, ">");
  let comma = symbol(TokenType.others, ",");
  let left_paren = symbol(TokenType.bracket, "(");
  let right_paren = symbol(TokenType.bracket, ")");
  let left_curly_brace = symbol(TokenType.bracket, "{");
  let right_curly_brace = symbol(TokenType.bracket, "}");
  let colon = satisfy((t) =>
    t.type === TokenType.others && t.raw === ":" ? ":" : undefined
  );
  let sharp = type(TokenType.sharp);
  let newline = type(TokenType.newline);
  let eol = type(TokenType.eol);

  let literal = satisfy((t) =>
    t.type === TokenType.literal ? t.raw : undefined
  );
  let keyword = (literal: string) =>
    satisfy((t) =>
      t.type === TokenType.literal && RegExp(literal, "i").test(t.raw)
        ? t.raw.toLowerCase()
        : undefined
    );
  let regKeyword = (literal: RegExp) =>
    satisfy((t) =>
      t.type === TokenType.literal && literal.test(t.raw)
        ? t.raw.toLowerCase()
        : undefined
    );

  let skip = map(
    many(choice(type(TokenType.space), type(TokenType.comment))),
    () => "skip"
  );

  let separator = map(
    seq(skip, choice(eol, newline, colon, left_curly_brace, right_curly_brace)),
    () => "separator"
  );

  let label = map(
    seq(
      skip,
      map(seq(asterisk, literal), (r) => {
        return {
          kind: kinds.label,
          literal: `*${r.result[1]}`,
          position: {
            literal: [r.location[1], r.location[2]],
            entire: [r.location[1], r.location[2]],
          },
        };
      }),
      separator
    ),
    (r) => r.result[1]
  );

  let defined_label = choice(map(seq(skip, label), (r) => r.result[1]));

  let dire_space = filter(
    many(
      choice(
        type(TokenType.space),
        type(TokenType.comment),
        seq(backslash, newline)
      )
    ),
    (r) => {
      for (let element of r.result) {
        if (element.type === TokenType.space) {
          return true;
        }
      }
      return false;
    }
  );

  let dire_skip = many(
    choice(
      type(TokenType.space),
      type(TokenType.comment),
      seq(backslash, newline)
    )
  );

  let dire_separator = map(
    seq(skip, choice(eol, newline)),
    () => "dire_separator"
  );

  let dire_define = map(
    seq(
      sharp,
      keyword("define"),
      dire_space,
      seq(
        option(seq(keyword("global"), dire_space)),
        option(seq(keyword("ctype"), dire_space)),
        map(literal, (r) => ({ location: r.location, literal: r.result }))
      ),
      option(
        // マクロ引数
        seq(
          left_paren,
          many(choice(right_paren, any()), (r) => r.result === null), // anyだったら続く
          right_paren
        )
      ),
      many(
        // マクロ内容
        choice(dire_separator, seq(dire_skip, any())),
        (r) => r.result !== "dire_separator"
      )
    ),
    (r) => {
      const { location, literal } = r.result[3][2];
      return <IOutlineElement>{
        kind: kinds.define,
        literal: `${literal}`,
        position: {
          literal: [location[1], location[1]],
          entire: [r.location[1], r.location[2]],
        },
      };
    }
  );

  let dire_const = map(
    seq(
      sharp,
      keyword("const"),
      dire_space,
      seq(
        option(seq(keyword("global"), dire_space)),
        option(seq(keyword("double"), dire_space)),
        map(literal, (r) => ({ location: r.location, literal: r.result }))
      ),
      many(
        choice(dire_separator, seq(dire_skip, any())),
        (r) => r.result !== "dire_separator"
      )
    ),
    (r) => {
      const { location, literal } = r.result[3][2];
      return <IOutlineElement>{
        kind: kinds.const,
        literal: `${literal}`,
        position: {
          literal: [location[1], location[1]],
          entire: [r.location[1], r.location[2]],
        },
      };
    }
  );

  let dire_enum = map(
    seq(
      sharp,
      keyword("enum"),
      dire_space,
      seq(
        option(seq(keyword("global"), dire_space)),
        map(literal, (r) => ({ location: r.location, literal: r.result }))
      ),
      many(
        choice(dire_separator, seq(dire_skip, any())),
        (r) => r.result !== "dire_separator"
      )
    ),
    (r) => {
      const { location, literal } = r.result[3][1];
      return <IOutlineElement>{
        kind: kinds.enum,
        literal: `${literal}`,
        position: {
          literal: [location[1], location[1]],
          entire: [r.location[1], r.location[2]],
        },
      };
    }
  );

  let dire_module_variable = map(
    many(choice(seq(literal, dire_skip, comma), literal, dire_separator)),
    () => null
  );

  let literal_for_module_string_type = satisfy((t) =>
    t.type === TokenType.string ? t.raw : undefined
  );

  // 本当は、#globalまで囲いたい…
  let dire_module = map(
    seq(
      sharp,
      keyword("module"),
      choice(
        seq(
          // #module name
          dire_space,
          map(literal, (r) => ({ location: r.location, literal: r.result })),
          option(seq(dire_space, dire_module_variable))
        ),
        seq(
          // #module"name"
          dire_skip,
          map(literal_for_module_string_type, (r) => ({
            location: r.location,
            literal: r.result,
          })),
          option(seq(dire_skip, dire_module_variable))
        )
      )
    ),
    (r) => {
      const { location } = r.result[2][1];
      return <IOutlineElement>{
        kind: kinds.module,
        literal: r.result[2][1].literal,
        position: {
          literal: [location[1], location[1]],
          entire: [r.location[1], r.location[2]],
        },
      };
    }
  );

  let dire_global = map(
    seq(
      map(seq(sharp, keyword("global")), (r) => ({ location: r.location })),
      dire_skip,
      dire_separator
    ),
    (r) =>
      <IOutlineElement>{
        kind: kinds.global,
        literal: "global",
        position: {
          literal: [r.result[0].location[1], r.result[0].location[2]],
          entire: [r.location[1], r.location[2]],
        },
      }
  );

  let dire_deffunc = map(
    seq(
      sharp,
      regKeyword(/(def|mod)c?func/i),
      dire_space,
      option(seq(keyword("local"), dire_space)),
      map(literal, (r) => ({ location: r.location, literal: r.result })),
      many(
        choice(dire_separator, seq(dire_skip, any())),
        (r) => r.result !== "dire_separator"
      )
    ),
    (r) => {
      const { location, literal } = r.result[4];
      return {
        kind: r.result[1],
        literal: `${literal}`,
        position: {
          literal: [location[0], location[1]],
          entire: [r.location[1], r.location[2]],
        },
      };
    }
  );

  let dire_modinit = map(
    seq(
      map(seq(sharp, keyword("modinit")), (r) => ({ location: r.location })),
      many(
        choice(dire_separator, seq(dire_skip, any())),
        (r) => r.result !== "dire_separator"
      )
    ),
    (r) =>
      <IOutlineElement>{
        kind: kinds.modinit,
        literal: "modinit",
        position: {
          literal: [r.result[0].location[1], r.result[0].location[2]],
          entire: [r.location[1], r.location[2]],
        },
      }
  );

  let dire_modterm = map(
    seq(
      map(seq(sharp, keyword("modterm")), (r) => ({ location: r.location })),
      many(
        choice(dire_separator, seq(dire_skip, any())),
        (r) => r.result !== "dire_separator"
      )
    ),
    (r) =>
      <IOutlineElement>{
        kind: kinds.modterm,
        literal: "modterm",
        position: {
          literal: [r.result[0].location[1], r.result[0].location[2]],
          entire: [r.location[1], r.location[2]],
        },
      }
  );

  let dire_func = map(
    seq(
      sharp,
      regKeyword(/c?func/i),
      dire_space,
      option(seq(keyword("global"), dire_space)),
      map(literal, (r) => ({ location: r.location, literal: r.result })),
      many(
        choice(dire_separator, seq(dire_skip, any())),
        (r) => r.result !== "dire_separator"
      )
    ),
    (r) => {
      const { location, literal } = r.result[4];
      return {
        kind: r.result[1],
        literal: `${literal}`,
        position: {
          literal: [location[0], location[1]],
          entire: [r.location[1], r.location[2]],
        },
      };
    }
  );

  let dire_cmd = map(
    seq(
      sharp,
      keyword("cmd"),
      dire_space,
      map(literal, (r) => ({ location: r.location, literal: r.result })),
      many(
        choice(dire_separator, seq(dire_skip, any())),
        (r) => r.result !== "dire_separator"
      )
    ),
    (r) => {
      const { location, literal } = r.result[3];
      return {
        kind: r.result[1],
        literal: `${literal}`,
        position: {
          literal: [location[0], location[1]],
          entire: [r.location[1], r.location[2]],
        },
      };
    }
  );

  let directive = map(
    choice(
      seq(skip, dire_module),
      seq(skip, dire_global),
      seq(skip, dire_deffunc),
      seq(skip, dire_modinit),
      seq(skip, dire_modterm),
      seq(skip, dire_define),
      seq(skip, dire_const),
      seq(skip, dire_enum),
      seq(skip, dire_func),
      seq(skip, dire_cmd)
    ),
    (r) => (r.success ? r.result[1] : undefined)
  );

  let any_statement = map(
    seq(
      many(choice(separator, any()), (r) => r.result === null),
      separator
    ),
    () => null
  );

  let statement = map(
    many(choice(directive, defined_label, any_statement)),
    (r) => r.result.filter((o: any) => o)
  );

  return statement(tokens, 0);
}
