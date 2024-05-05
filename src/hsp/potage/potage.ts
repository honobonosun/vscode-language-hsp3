// potage.ts 入れ子で作る、分かり易いパーサーコンビネーター。

interface ParseSuccess<T> {
  result: "success";
  data: unknown;
  rest: T[];
}

interface ParseFail {
  result: "fail";
  reason: string;
}

type ParserOutput<T> = ParseSuccess<T> | ParseFail;

export type Parser<T> = { (input: T[]): ParserOutput<T>; name: string };

/**
 * [INSIDE ONLY] パーサーに名前を付けます。パーサーはnameプロパティに改変を受けます。
 * @param parser 名を授けたいパーサー
 * @param name 授ける名前
 */
const setname = <T>(parser: Parser<T>, name: string) => {
  Object.defineProperty(parser, "name", {
    value: name,
    enumerable: true,
  });
};

const fail = (msg: string, column?: string): ParseFail => ({
  result: "fail",
  reason: column ? `${msg}\n${column}` : msg,
});

/**
 * コールバック関数から、パーサーを作ります。
 * @param cb パース処理を行うコールバック関数
 * @param name パーサーの名前
 * @returns 出来上がったパーサー
 */
export function satisfy<T>(
  cb: (input: T[], name: string) => ParserOutput<T>,
  name: string,
): Parser<T> {
  const parser = (input: T[]): ParserOutput<T> => {
    if (input.length > 0) return cb(input, name);
    return fail(`${name}: inputは空です。`);
  };
  setname(parser, name);
  return parser;
}

/**
 * パーサーの成否を反転させます。
 * @param p 成否はそのままなパーサー
 * @param name 成否が反転したパーサーの名前
 * @returns 成否が反転したパーサー
 */
export function not<T>(p: Parser<T>, name = "not"): Parser<T> {
  const parser: Parser<T> = (input) => {
    const output = p(input);
    if (output.result === "success")
      return fail(`${name}: 成否は反転しました。`);
    return { result: "success", data: null, rest: input };
  };
  setname(parser, name);
  return parser;
}

/**
 * 失敗してもよいパーサーにします。
 * パーサーの成否にかかわらず、必ず成功します。
 * @param p 失敗するかもしれないパーサー
 * @param name 失敗が許されたパーサーの名前
 * @returns 失敗しても成功扱いになったパーサー
 */
export function option<T>(p: Parser<T>, name = "option"): Parser<T> {
  const parser: Parser<T> = (input) => {
    const output = p(input);
    return {
      result: "success",
      data: output.result === "success" ? output.data : null,
      rest: output.result === "success" ? output.rest : input,
    };
  };
  setname(parser, name);
  return parser;
}

/**
 * 配列に入ったパーサー達を順番にパースして、全て成功することを望むパーサー。
 * 途中でどれか失敗すると、パースは失敗します。
 * 成功すれば、dataプロパティへ配列で順番にパース結果が格納されます。
 * @param ps 配列に入った、0番目から順番に成功することを期待されたパーサー達
 * @param name 全てのパーサーが成功することを期待したパーサーの名前
 * @returns 連続成功を求むパーサー
 */
export function seq<T>(ps: Parser<T>[], name = "seq"): Parser<T> {
  const parser: Parser<T> = (input) => {
    let cnt = 0;
    let i = input;
    const datas: unknown[] = [];
    for (cnt = 0; cnt < ps.length; cnt++) {
      const output = ps[cnt](i);
      if (output.result === "success") {
        i = output.rest;
        datas.push(output.data);
      }
      if (output.result === "fail")
        return {
          result: "fail",
          reason: `${name}: [${cnt}]番目の"${ps[cnt].name}"パーサーが失敗しました。\n${output.reason}`,
        };
    }
    return {
      result: "success",
      data: datas,
      rest: i,
    };
  };
  setname(parser, name);
  return parser;
}

/**
 * 配列に入ったパーサーを順番に試行して、最初に成功した結果を返します。
 * 全て失敗した場合、失敗を返します。
 * @param ps 配列に入った、順番にパースを試みるパーサー達
 * @param name 最初に成功した結果を返すパーサーの名前
 * @returns 最初に成功した結果を返すパーサー
 */
export function choice<T>(ps: Parser<T>[], name = "choice"): Parser<T> {
  const parser: Parser<T> = (input) => {
    for (let cnt = 0; cnt < ps.length; cnt++) {
      const output = ps[cnt](input);
      if (output.result === "success") return output;
    }
    return { result: "fail", reason: `${name}: 成功がありませんでした。` };
  };
  setname(parser, name);
  return parser;
}

/**
 * 繰り返すパーサーにします。
 * min以上繰り返せなかったら、パースに失敗します。
 * 繰返し回数がmaxに到達したら、パースは成功して繰り返し処理を切り上げます。
 * @param p 繰り返されるパーサー
 * @param min 最小限繰り返す回数
 * @param max 最大で繰り返す回数
 * @param name 繰り返すようになったパーサーの名前
 * @returns 繰り返すようになったパーサー
 */
export function repeat<T>(
  p: Parser<T>,
  min = 0,
  max = Number.POSITIVE_INFINITY,
  name = "repeat",
): Parser<T> {
  const parser: Parser<T> = (input) => {
    let i = input;
    const datas: unknown[] = [];
    let cnt = 0;
    // 最大回数以上は、続けられそうでも繰り返さない。
    for (; cnt < max; cnt++) {
      const output = p(i);
      if (output.result === "fail") break;

      i = output.rest;
      datas.push(output.data);
    }
    // 最小限繰り返す回数を下回ったら、エラーにする。
    if (min > cnt)
      return {
        result: "fail",
        reason: `${name}: 最低(${min})回以上繰り返すところ、(${cnt})回しか繰り返しませんでした。`,
      };
    return { result: "success", data: datas, rest: i };
  };
  setname(parser, name);
  return parser;
}

/**
 * パーサーの成功結果をコールバック関数で編集します。
 * 編集前のパーサーが失敗した場合、そのまま返します。
 * コールバック関数の例外は配慮していません。
 * @param p 成功結果が編集されるパーサー
 * @param f 成功結果を編集するコールバック関数
 * @param name 編集されるパーサーの名前
 * @returns 編集された結果を返すパーサー
 */
export function map<T>(
  p: Parser<T>,
  f: (data: unknown) => unknown,
  name: "map",
): Parser<T> {
  const parser: Parser<T> = (input) => {
    const output = p(input);
    if (output.result === "success")
      return {
        result: "success",
        data: f(output.data),
        rest: output.rest,
      };
    return output;
  };
  setname(parser, name);
  return parser;
}

/**
 * コールバック関数でパーサーの成否を決定します。
 * パーサーが成功したなら、コールバック関数で更に成否を決定します。
 * コールバック関数により失敗判定になったら、返り値はこのパーサーの失敗を返します。
 * パーサーが失敗した場合、そのまま返します。
 * @param p 成功しても成否がコールバック関数に委ねられてしまうパーサー
 * @param f 成否を判断するコールバック関数。戻り値はtrueで成功、falseで失敗とする。
 * @param name 成否がコールバック関数に委ねられたパーサーの名前
 * @returns 成功後にコールバック関数へ成否を委ねたパーサー
 */
export function filter<T>(
  p: Parser<T>,
  f: (data: unknown) => boolean,
  name = "filter",
): Parser<T> {
  const parser: Parser<T> = (input) => {
    const output = p(input);
    if (output.result === "success") {
      if (f(output.data)) return output;
      return {
        result: "fail",
        reason: `${name}: ${p.name}の結果は、フィルター関数により失敗とする。`,
      };
    }
    return output;
  };
  setname(parser, name);
  return parser;
}

export function lazy<T>(cb: () => Parser<T>, name: string) {
  let p: Parser<T> | undefined;
  if (!p) p = cb();
  setname(p, name);
  return p;
}

/**
 * inputを消費しないパーサーにします。
 * @param p inputを消費してしまうパーサー
 * @param name inputを消費しなくなったパーサーの名前
 * @returns inputを消費しなくなったパーサー
 */
export function hold<T>(p: Parser<T>, name = "hold"): Parser<T> {
  const parser: Parser<T> = (input) => {
    const i = input;
    const output = p(input);
    if (output.result === "success")
      return { result: "success", data: output.data, rest: i };
    return output;
  };
  setname(parser, name);
  return parser;
}
