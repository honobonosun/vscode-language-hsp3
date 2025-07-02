/* eslint-disable @typescript-eslint/no-explicit-any */

// tsc : v5.8.2
// MIT LICENSE - Honobono
// 自分宛：このモジュールを書くときは、モジュール内の型安全は忘れること。
// 入力と出力の型が実際の挙動で合致していれば良い。

type Success<Name extends string, InputType extends unknown[], ValueType> = {
  name: Name;
  success: true;
  rest: InputType;
  value: ValueType;
  context?: AnyResultList;
};
type Failure<Name extends string> = {
  name: Name;
  success: false;
  msg: string;
  context?: AnyResultList;
  other?: unknown;
};

type Result<Name extends string, InputType extends unknown[], ValueType> =
  | Success<Name, InputType, ValueType>
  | Failure<Name>;

type AnyResultList = (
  | Failure<string>
  | Success<string, any, any>
  | undefined
)[];

type SatisfyCallback<
  Name extends string,
  InputType extends unknown[],
  ValueType,
> = (
  input: InputType
) =>
  | Omit<Success<Name, InputType, ValueType>, "name">
  | Omit<Failure<Name>, "name">;

type Parser<Name extends string, InputType extends unknown[], ValueType> = {
  name: Name;
  parse(input: InputType): Result<Name, InputType, ValueType>;
};

type AnyParser = Parser<string, any, any>;
type AnyParserList = AnyParser[];

type ExtInputType<P extends AnyParser> =
  P extends Parser<string, infer I, any> ? I : never;
type ExtInputUnionType<P extends AnyParserList> = ExtInputType<P[number]>;
type ExtInputTupleType<P extends AnyParserList> = {
  [N in keyof P]: ExtInputType<P[N]>;
};

type ExtValueType<P extends AnyParser> =
  P extends Parser<string, any, infer V> ? V : never;
type ExtValueUnionType<P extends AnyParserList> = ExtValueType<P[number]>;
type ExtValueTupleType<P extends AnyParserList> = {
  [N in keyof P]: ExtValueType<P[N]>;
};

export function satisfy<
  Name extends string,
  InputType extends unknown[],
  ValueType,
>(name: Name, fn: SatisfyCallback<Name, InputType, ValueType>) {
  return {
    name,
    parse(input: InputType): Result<Name, InputType, ValueType> {
      try {
        if (input.length > 0) return { name, ...fn(input) };
        else return { success: false as const, name, msg: "input is empty." };
      } catch (error) {
        return {
          success: false as const,
          name,
          msg: "throw callback.",
          other: error,
        };
      }
    },
  };
}

export function success<InputType extends unknown[], ValueType>(
  rest: InputType,
  value: ValueType,
  context?: AnyResultList
): Omit<Success<string, InputType, ValueType>, "name"> {
  return {
    success: true,
    rest,
    value,
    context,
  };
}

export function failure(
  msg: string,
  context?: AnyResultList,
  other?: any
): Omit<Failure<string>, "name"> {
  return { success: false, msg, context, other };
}

export function seq<
  Name extends string,
  P extends AnyParserList,
  InputType extends ExtInputUnionType<P>,
  ValueType extends ExtValueTupleType<P>,
>(name: Name, parsers: P) {
  return {
    name,
    parse(input: InputType): Result<Name, InputType, ValueType> {
      let rest = input;
      const result: any[] = [];
      const context: AnyResultList = [];
      for (const key in parsers) {
        const r = parsers[key].parse(rest);
        context.push(r);
        if (r.success) {
          rest = r.rest;
          result.push(r.value);
        } else
          return {
            success: false as const,
            name,
            msg: `failure "${parsers[key].name}" parser as step (${key})`,
            context,
          };
      }
      return {
        success: true as const,
        name,
        rest,
        value: result as ValueType,
        context,
      };
    },
  };
}

export function choice<
  Name extends string,
  P extends AnyParserList,
  InputType extends ExtInputUnionType<P>,
  ValueType extends ExtValueUnionType<P>,
>(name: Name, parsers: P) {
  return {
    name,
    parse(input: InputType): Result<Name, InputType, ValueType> {
      const context: AnyResultList = [];
      for (const key in parsers) {
        const r = parsers[key].parse(input);
        context.push(r);
        if (r.success)
          return {
            success: true as const,
            name,
            rest: r.rest,
            value: r.value as ValueType,
            context,
          };
      }
      return {
        success: false as const,
        name,
        msg: "All parse is failed.",
        context,
      };
    },
  };
}

export function option<
  Name extends string,
  P extends AnyParser,
  InputType extends ExtInputType<P>,
  ValueType extends ExtValueType<P>,
>(name: Name, parser: P) {
  return {
    name,
    parse(input: InputType): Result<Name, InputType, ValueType | null> {
      const r = parser.parse(input);
      if (r.success)
        return {
          success: true as const,
          name,
          rest: r.rest,
          value: r.value,
          context: [r],
        };
      else
        return {
          success: true as const,
          name,
          rest: input,
          value: null,
          context: [r],
        };
    },
  };
}

export function not<
  Name extends string,
  P extends AnyParser,
  InputType extends ExtInputType<P>,
  ValueType extends ExtValueType<P>,
>(name: Name, parser: P) {
  return {
    name,
    parse(input: InputType): Result<Name, InputType, ValueType | null> {
      // 入力が空ならnot処理を阻止
      if (input.length === 0)
        return {
          success: false,
          name,
          msg: "input is empty.",
        };

      const r = parser.parse(input);
      if (r.success)
        return {
          success: false,
          name,
          msg: `success in "${parser.name}" parser.`,
          context: [r],
        };
      else
        return {
          success: true,
          name,
          rest: input,
          value: null,
          context: [r],
        };
    },
  };
}

export function many<
  Name extends string,
  P extends AnyParser,
  InputType extends ExtInputType<P>,
  ValueType extends ExtValueType<P>[],
>(
  name: Name,
  parser: P,
  min: number = 0,
  max: number = Number.POSITIVE_INFINITY
) {
  return {
    name,
    parse(input: InputType): Result<Name, InputType, ValueType> {
      let rest = input;
      const result: any[] = [];
      const context: AnyResultList = [];

      while (result.length < max) {
        if (rest.length === 0) break;

        const r = parser.parse(rest);
        context.push(r);

        if (r.success === false) break;

        // todo: restが更新されていなければfailureにする。

        result.push(r.value);
        rest = r.rest;
      }

      if (result.length < min)
        return {
          success: false,
          name,
          msg: "failed to meet minimum repetitions",
          context,
        };

      return {
        success: true,
        name,
        rest,
        value: result as ValueType,
        context,
      };
    },
  };
}

type MapResult<Name extends string, InputType extends unknown[], ValueType> =
  | Omit<Success<Name, InputType, ValueType>, "name">
  | Omit<Failure<Name>, "name">;

export function override<
  Name extends string,
  P extends AnyParser,
  InputType extends ExtInputType<P>,
  ValueType,
>(
  name: Name,
  parser: P,
  fn: (result: ReturnType<P["parse"]>) => MapResult<Name, InputType, ValueType>
) {
  return {
    name,
    parse(input: InputType): Result<Name, InputType, ValueType> {
      const r = parser.parse(input) as ReturnType<P["parse"]>;
      try {
        return { ...fn(r), name };
      } catch (error) {
        return {
          success: false as const,
          name,
          msg: "throw callback.",
          other: error,
        };
      }
    },
  };
}

export function map<
  Name extends string,
  P extends AnyParser,
  InputType extends ExtInputType<P>,
  ValueType,
>(name: Name, parser: P, fn: (value: ExtValueType<P>) => ValueType) {
  return {
    name,
    parse(input: InputType): Result<Name, InputType, ValueType> {
      const r = parser.parse(input);
      try {
        if (r.success) return { ...r, name, value: fn(r.value) };
        else return { ...r, name };
      } catch (error) {
        return {
          success: false as const,
          name,
          msg: "throw callback.",
          other: error,
        };
      }
    },
  };
}

export function lookahead<
  Name extends string,
  P extends AnyParser,
  InputType extends ExtInputType<P>,
>(name: Name, parser: P) {
  return {
    name,
    parse(input: InputType): Result<Name, InputType, null> {
      const r = parser.parse(input);
      if (r.success) {
        return {
          success: true as const,
          name,
          rest: input,
          value: null,
          context: [r],
        };
      } else {
        return {
          success: false as const,
          name,
          msg: `Lookahead failed for parser "${parser.name}".`,
          context: [r],
        };
      }
    },
  };
}
