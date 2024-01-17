import { Token, TokenType } from "./token";

/**
 * potage.tsは、hsp用パーサコンビネータです。
 * lexer.tsのtokensをパースして、任意のデータを抽出するのに便利です。
 */

/**
 * @property success パースの成否
 * @property location [position, begin, end?]
 * - *position* 次にパースする token index
 * - *begin* パースし始めた token index
 * - *end* パースし終えた token index
 * @property result パースした結果が格納される
 * @property log パース中にロギングした結果が格納される
 */
export interface IResult {
	success: boolean;
	location: number[];
	result: any;
	log: string[];
}

export interface IParser {
	(target: Token[], position: number): IResult;
}

/**
 * トークンを一つ読み進めて結果を返すパーサ関数を返します。
 *
 * 作られるパーサ関数は、コールバック関数でパースの成否を決定します。
 *
 * コールバック関数の返り値がundefined以外なら、その値をresultプロパティに格納します。成功判定です。
 * 逆にundefinedなら、失敗判定です。
 *
 * コールバック関数を省略した場合、返されるパーサ関数は必ず成功を返します。resultプロパティには、nullが格納されます。
 *
 * @param fn 成否と結果を返すコールバック関数
 */
export function satisfy(fn?: (token: Token) => any): IParser {
	return function (target, position) {
		if (position >= target.length) {
			return {
				success: false,
				location: [position, -1],
				result: undefined,
				log: [],
			};
		}
		let result: any = undefined;
		if (fn) {
			result = fn(target[position]);
		} else {
			result = null;
		}
		const success: boolean = result !== undefined;
		const location = [position + (success ? 1 : 0), position];
		return { success, location, result, log: [] };
	};
}

export function any() {
	return satisfy();
}

export function raw(str: string) {
	return satisfy((t) => (t.raw === str ? { raw: t.raw } : undefined));
}

export function type(type: TokenType) {
	return satisfy((t) => (t.type === type ? { type: t.type } : undefined));
}

export function regexp(regexp: RegExp) {
	return satisfy((t) => (regexp.test(t.raw) ? { raw: t.raw } : undefined));
}

/**
 * パースした結果のlogプロパティに、コールバック関数の返り値をpushします。
 *
 * コールバック関数は、string型か、undefinedを返す必要があります。
 *
 * コールバック関数がundefinedを返した場合、logプロパティにpushしません。
 *
 * @param parser
 * @param fn
 */
export function log(
	parser: IParser,
	fn: (parsed: IResult) => string | undefined,
): IParser {
	return function (target, position) {
		const parsed = parser(target, position);
		const text = fn(parsed);
		if (text !== undefined) {
			parsed.log.push(text);
		}
		return parsed;
	};
}

/**
 * parserが失敗したら、logにtextを追加するパーサ関数を返します。
 */
export function desc(
	parser: IParser,
	fn: (parsed: IResult) => string,
): IParser {
	return log(parser, (r) => (r.success ? undefined : fn(r)));
}

export function choice(...parsers: IParser[]): IParser {
	return function (target, position) {
		let success = false;
		let location = [position, position];
		let result: any = undefined;
		let log: string[] = [];
		for (let i = 0; i < parsers.length; i++) {
			const parsed = parsers[i](target, position);
			log = log.concat(parsed.log);
			if (parsed.success) {
				success = true;
				location = parsed.location;
				result = parsed.result;
				break;
			}
		}
		return { success, location, result, log };
	};
}

/**
 * 渡したパーサ関数たち全てが成功したら、成功を返すパーサ関数を返します。
 * @param  parsers 成功しなくてはならないパーサ関数たち
 */
export function seq(...parsers: IParser[]): IParser {
	return function (target, position) {
		const readPosition = position;
		let success = true;
		let result: Array<IResult | undefined> = [];
		let log: string[] = [];
		for (let i = 0; i < parsers.length; i++) {
			const parsed = parsers[i](target, position);
			log = log.concat(parsed.log);
			if (parsed.success) {
				result.push(parsed.result);
				position = parsed.location[0];
			} else {
				success = false;
				break;
			}
		}
		const location = [position, readPosition, position - 1];
		return { success, location, result, log };
	};
}

/**
 * 渡されたパーサ関数を失敗しても成功を必ず返すように加工します。
 * @param parser 失敗してもいいパーサ関数
 */
export function option(parser: IParser): IParser {
	return function (target, position) {
		const { location, result, log } = parser(target, position);
		return { success: true, location, result, log };
	};
}

/**
 * 失敗するまで渡されたパーサ関数を繰り返すパーサ関数を返します。
 *
 * 最初から失敗した場合、resultプロパティに[]を格納して、成功を返します。
 * @param parser 失敗するまで何度も繰り返すパーサ関数
 * @param fn 成功した後も繰り返すか判定するコールバック関数
 */
export function many(
	parser: IParser,
	fn?: (parsed: IResult) => boolean,
): IParser {
	return function (target, position) {
		const readPosition = position;
		let result: any[] = [];
		let parsed: IResult;
		let log: string[] = [];
		for (;;) {
			parsed = parser(target, position);
			log = log.concat(parsed.log);
			if (
				fn === undefined ? parsed.success : parsed.success ? fn(parsed) : false
			) {
				result.push(parsed.result);
				position = parsed.location[0];
			} else {
				break;
			}
		}
		const location = [position, readPosition, position - 1];
		return { success: true, location, result, log };
	};
}

/**
 * 渡されたパーサ関数の成否をコールバック関数の返り値で決定するパーサ関数を返します。
 *
 * @param parser 成否を託すパーサ関数
 * @param fn 成否を託されるコールバック関数
 */
export function filter(
	parser: IParser,
	fn: (parsed: IResult) => boolean,
): IParser {
	return function (target, position) {
		let parsed = parser(target, position);
		if (parsed.success) {
			parsed.success = fn(parsed);
		}
		return parsed;
	};
}

/**
 * parserのresultをコールバック関数の返り値に変更するパーサ関数を返します。
 * @param parser 加工されるパーサ関数
 * @param fn resultプロパティに格納する値を返すコールバック関数
 */
export function map(parser: IParser, fn: (parsed: IResult) => any): IParser {
	return function (target, position) {
		const parsed = parser(target, position);
		if (parsed.success) {
			return {
				success: parsed.success,
				location: parsed.location,
				result: fn(parsed),
				log: parsed.log,
			};
		} else {
			return parsed;
		}
	};
}

/**
 * コールバック関数で返ってきたパーサ関数を必要になった時点で計算する、遅延評価を行います。
 * @param fn パーサ関数を返すコールバック関数
 */
export function lazy(fn: () => IParser): IParser {
	let parser: IParser;
	return function (target, position) {
		if (!parser) {
			parser = fn();
		}
		return parser(target, position);
	};
}
