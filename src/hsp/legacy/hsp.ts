const emojiRegex: () => RegExp = require("emoji-regex");

export interface IPoint {
	row: number;
	column: number;
}

export interface ILocation {
	begin: IPoint;
	end: IPoint;
}

export declare enum TokenType {
	eol, // End Of Line
	space,
	newline,
	comment,
	operant,
	bracket,
	int,
	string,
	double,
	directive,
	sharp,
	identifier,
	literal,
	illegal,
	others,
}

export class Token {
	public raw: string;
	public type: TokenType;
	public location: ILocation;

	constructor(type: TokenType, location: ILocation, raw: string) {
		this.type = type;
		this.location = location;
		this.raw = raw;
	}
}

/**
 * Lexerクラスは、documentをHSPのプログラムとして字句解析します。
 */
class Lexer {
	public fullText: string;
	private chars: string[];
	private textPoint: IPoint;
	private position = 0;
	private readPosition = 0;
	private ch: string | 0 = 0;

	constructor(text: string) {
		this.fullText = text;
		this.chars = Array.from(this.fullText);
		this.textPoint = { row: 0, column: 0 };
		this.readChar();
		return;
	}

	/**
	 * charの文字をregexp.test()で評価します。chraが0なら必ずfalseを返します。
	 * @param regexp 評価に使う正規表現
	 * @param char 評価されたい文字
	 */
	private matchChar(regexp: RegExp, char: string | 0): boolean {
		if (char === 0) return false;
		return regexp.test(char);
	}

	/**
	 * 現在位置からpoint分を足します。
	 * @param point 足すpoint
	 */
	private addTextPoint(point: IPoint): void {
		const { row, column } = this.textPoint;
		this.textPoint = {
			row: row + point.row,
			column: column + point.column,
		};
	}

	/**
	 * 文字を一文字読み進めます。
	 * position, readPosition, chプロパティが**変更**されます。
	 */
	private readChar(): void {
		if (this.readPosition >= this.chars.length) {
			this.ch = 0;
		} else {
			this.ch = this.chars[this.readPosition];
		}
		this.position = this.readPosition;
		this.readPosition += 1;
		return;
	}

	/**
	 * 現在位置から一文字先の一文字を読みます。readChar()と違い読み進めません。
	 * number型の0を返した場合、文字の終末(End Of Line)まで来たことを意味します。
	 */
	private peekChar(): string | 0 {
		if (this.readPosition >= this.chars.length) return 0;
		return this.chars[this.readPosition];
	}

	/**
	 * 現在位置から一文字前の一文字を読みます。readChar()と違い読み進めません。
	 * number型の0を返した場合、これ以上前の文字はありません。
	 */
	private prevChar(): string | 0 {
		if (this.position < 0) {
			return 0;
		}
		return this.chars[this.position - 1];
	}

	/**
	 * 現在位置の文字を読んでTokenを返して、次の読み取り位置へ進めます。
	 * 必ずしも、一文字だけ進むとは限らない。
	 * Token.TokenType.eol が格納された場合、テキストの終末に着いたことを意味します。
	 */
	public nextToken(): Token {
		let result: Token;
		let location: ILocation;
		const { row, column } = this.textPoint;
		switch (this.ch) {
			case "\n": {
				location = { begin: { row, column }, end: { row, column: column + 1 } };
				this.textPoint = { row: row + 1, column: 0 };
				result = new Token(TokenType.newline, location, "\n");
				break;
			}
			case "\r": {
				if (this.peekChar() === "\n") {
					this.readChar();
					location = {
						begin: { row, column },
						end: { row, column: column + 2 },
					};
					result = new Token(TokenType.newline, location, "\r\n");
				} else {
					location = {
						begin: { row, column },
						end: { row, column: column + 1 },
					};
					result = new Token(TokenType.newline, location, "\r");
				}
				this.textPoint = { row: row + 1, column: 0 };
				break;
			}
			case "#": {
				location = { begin: { row, column }, end: { row, column: column + 1 } };
				this.addTextPoint({ row: 0, column: 1 });
				result = new Token(TokenType.sharp, location, "#");
				break;
			}
			default: {
				location = { begin: { row, column }, end: { row, column: column + 1 } };
				if (this.ch === 0) {
					// End Of Line
					this.addTextPoint({ row: 0, column: 1 });
					result = new Token(TokenType.eol, location, "");
				} else {
					let token: Token | null = null;

					token = this.readComment();
					if (token) {
						return token;
					}

					token = this.readSpace();
					if (token) {
						return token;
					}

					token = this.readString();
					if (token) {
						return token;
					}

					token = this.readNumber();
					if (token) {
						return token;
					}

					token = this.readOperant();
					if (token) {
						return token;
					}

					token = this.readBracket();
					if (token) {
						return token;
					}

					token = this.readLiteral();
					if (token) {
						return token;
					}

					// others
					this.addTextPoint({ row: 0, column: this.ch.length });
					result = new Token(TokenType.others, location, this.ch);
				}
				break;
			}
		}
		this.readChar();
		return result;
	}

	/**
	 * 同じ空白文字をまとめて読んでtokenを返すかもしれません。
	 */
	private readSpace(): Token | null {
		if (this.ch === 0) {
			return null;
		}
		const position = this.position;
		const { row, column } = this.textPoint;
		let regexp: RegExp;
		if (this.ch === " ") {
			regexp = / /;
		} else if (this.ch === "\t") {
			regexp = /\t/;
		} else if (this.ch === "　") {
			// eslint-disable-next-line no-irregular-whitespace
			regexp = /　/;
		} else {
			return null;
		}
		while (this.matchChar(regexp, this.ch)) {
			this.readChar();
		}
		const raw: string = this.chars.slice(position, this.position).join("");
		const location: ILocation = {
			begin: { row, column },
			end: { row, column: column + raw.length },
		};
		this.addTextPoint({ row: 0, column: raw.length });
		return new Token(TokenType.space, location, raw);
	}

	/**
	 * TokenType.commentなTokenを返すかもしれません。
	 * *dev* 改行とEOLはコメントに入れないこと。
	 */
	private readComment(): Token | null {
		const beginComment = (): ";" | "//" | "/*" | null => {
			if (this.ch === 0) return null;
			if (this.ch === ";") return ";";
			if (this.ch === "/" && this.peekChar() === "/") return "//";
			if (this.ch === "/" && this.peekChar() === "*") return "/*";
			return null;
		};
		const begin = beginComment();
		if (begin === null) {
			return null;
		}

		const position = this.position;
		const { row, column } = this.textPoint;
		let raw: string;
		let cntRow = 0;
		let newColumn = 0;

		if (begin === ";" || begin === "//") {
			for (let i = 0; i < begin.length; i++) {
				this.readChar();
			} // コメント文字文読み進める。
			const notCommentEnd = (): boolean => {
				if (this.ch === 0) {
					return false;
				}
				return !/\r|\n/.test(this.ch);
			};
			while (notCommentEnd()) {
				this.readChar();
			}
			raw = this.chars.slice(position, this.position).join("");
			newColumn = column + raw.length;
		} else if (begin === "/*") {
			this.readChar();
			this.readChar(); // コメント文字文読み進める。
			const notCommentEnd = (): boolean => {
				if (this.ch === 0) {
					return false;
				}
				return !(this.prevChar() === "*" && this.ch === "/");
			};
			while (notCommentEnd()) {
				this.readChar();
			}
			this.readChar();
			raw = this.chars.slice(position, this.position).join("");
			const lines = raw.split(/\n|\r\n|\r/);
			const lastText = lines[lines.length - 1];
			cntRow = lines.length - 1;
			if (lines.length === 1) {
				newColumn = column + raw.length;
			} else {
				newColumn = lastText.length;
			}
		} else {
			throw new Error("予期せぬエラー");
		}

		const location: ILocation = {
			begin: { row, column },
			end: { row: row + cntRow, column: newColumn },
		};
		this.textPoint = { row: row + cntRow, column: newColumn };
		return new Token(TokenType.comment, location, raw);
	}

	/**
	 * 演算子に関わるtokenを返すかもしれません。
	 */
	private readOperant(): Token | null {
		if (this.ch === 0) {
			return null;
		}
		let location: ILocation;
		const { row, column } = this.textPoint;
		const position = this.position;
		let raw: string;

		if (/[=!+\-*/\\<>&|^]/.test(this.ch)) {
			const literal = this.ch + this.peekChar();
			if (
				/==|!=|\+\+|\+=|--|-=|\*=|\/=|\\=|<<|<=|>>|>=|&=|\|=|\^=/.test(literal)
			) {
				this.readChar();
				this.readChar();
				raw = this.chars.slice(position, this.position).join("");
				location = {
					begin: { row, column },
					end: { row, column: column + raw.length },
				};
			} else {
				this.readChar();
				raw = this.chars.slice(position, this.position).join("");
				location = {
					begin: { row, column },
					end: { row, column: column + raw.length },
				};
			}
			this.addTextPoint({ row: 0, column: raw.length });
			return new Token(TokenType.operant, location, raw);
		}
		return null;
	}

	/**
	 * 括弧に関わるtokenを返すかもしれません。
	 */
	private readBracket(): Token | null {
		if (this.ch === 0) {
			return null;
		}
		if (/[[\]{}()]/.test(this.ch)) {
			const { row, column } = this.textPoint;
			const raw: string = this.ch;
			const location: ILocation = {
				begin: { row, column },
				end: { row, column: column + raw.length },
			};
			this.addTextPoint({ row: 0, column: raw.length });
			this.readChar();
			return new Token(TokenType.bracket, location, raw);
		}
		return null;
	}

	/**
	 * 数字に関わるtokenを返すかもしれません。
	 */
	private readNumber(): Token | null {
		if (this.ch === 0) {
			return null;
		}
		const { row, column } = this.textPoint;
		const position = this.position;

		// 'x'
		if (this.ch === "'") {
			this.readChar();
			while (
				this.matchChar(/\\'/, this.prevChar() + this.ch) ||
				this.matchChar(/[^']/, this.ch)
			) {
				this.readChar();
			}
			this.readChar();
			const raw: string = this.chars.slice(position, this.position).join("");
			const location: ILocation = {
				begin: { row, column },
				end: { row, column: column + raw.length },
			};
			this.addTextPoint({ row: 0, column: raw.length });
			return new Token(TokenType.int, location, raw);
		}
		// $ 0x
		if (
			this.ch === "$" ||
			(this.ch === "0" && this.matchChar(/[Xx]/, this.peekChar()))
		) {
			if (this.ch === "0") {
				this.readChar();
				this.readChar();
			} else {
				this.readChar();
			}
			while (this.matchChar(/[0-9a-fA-F]/, this.ch)) {
				this.readChar();
			}
			const raw: string = this.chars.slice(position, this.position).join("");
			const location: ILocation = {
				begin: { row, column },
				end: { row, column: column + raw.length },
			};
			this.addTextPoint({ row: 0, column: raw.length });
			return new Token(TokenType.int, location, raw);
		}
		// % 0b
		if (
			this.ch === "%" ||
			(this.ch === "0" && this.matchChar(/[Bb]/, this.peekChar()))
		) {
			if (this.ch === "0") {
				this.readChar();
				this.readChar();
			} else {
				this.readChar();
			}
			while (this.matchChar(/[01]/, this.ch)) {
				this.readChar();
			}
			const raw: string = this.chars.slice(position, this.position).join("");
			const location: ILocation = {
				begin: { row, column },
				end: { row, column: column + raw.length },
			};
			this.addTextPoint({ row: 0, column: raw.length });
			return new Token(TokenType.int, location, raw);
		}
		// 整数 浮動小数
		if (this.matchChar(/[0-9]/, this.ch)) {
			// 出現したらフラグを立てる。
			let o = false; // -+記号
			let e = false; // 指数表記
			let f = false; // 最後のF
			let dot = false; // 小数点
			while (this.matchChar(/[0-9EeFf\-+.]/, this.ch)) {
				if (f === true) {
					break;
				} // Fが来たのにまだループしている。
				else if (f === false && this.matchChar(/[Ff]/, this.ch)) {
					f = true;
				} else if (e === false && this.matchChar(/[-+]/, this.ch)) {
					break;
				} // 指数表記じゃないのに-と+が出現した。
				else if (e === true && o === true && this.matchChar(/[-+]/, this.ch)) {
					break;
				} // 指数表記で-と+が二回も出現した。
				else if (e === true && o === false && this.matchChar(/[-+]/, this.ch)) {
					o = true;
				} else if (e === true && this.matchChar(/[Ee]/, this.ch)) {
					break;
				} // 二回目の指数表記が出現した。
				else if (e === false && this.matchChar(/[Ee]/, this.ch)) {
					e = true;
				} else if (dot === true && this.ch === ".") {
					break;
				} // 二回目の小数点が出現した。
				else if (dot === false && this.ch === ".") {
					dot = true;
				}
				this.readChar();
			}
			const raw: string = this.chars.slice(position, this.position).join("");
			const location: ILocation = {
				begin: { row, column },
				end: { row, column: column + raw.length },
			};
			let type: TokenType;
			if (dot || e || f) {
				type = TokenType.double;
			} else {
				type = TokenType.int;
			}
			this.addTextPoint({ row: 0, column: raw.length });
			return new Token(type, location, raw);
		}
		return null;
	}

	/**
	 * 文字列に関わるtokenを返すかもしれません。
	 */
	private readString(): Token | null {
		if (this.ch === 0) {
			return null;
		}
		const position = this.position;
		const { row, column } = this.textPoint;

		const isCH0 = (): boolean => this.ch === 0;

		if (this.ch === '"') {
			this.readChar(); // このままループ入ると終わってしまうので、一文字進める。
			for (;;) {
				if (this.matchChar(/\\|¥/, this.ch)) {
					this.readChar();
					this.readChar();
				}
				if (this.ch === '"' || this.ch === 0) {
					break;
				}
				this.readChar();
			}
			this.readChar();
			const raw: string = this.chars.slice(position, this.position).join("");
			const location: ILocation = {
				begin: { row, column },
				end: { row, column: column + raw.length },
			};
			this.addTextPoint({ row: 0, column: raw.length });
			return new Token(TokenType.string, location, raw);
		} else if (this.ch === "{" && this.peekChar() === '"') {
			this.readChar();
			this.readChar();
			for (;;) {
				if (this.matchChar(/\\|¥/, this.ch)) {
					this.readChar();
					this.readChar();
				}
				if (this.matchChar(/"}/, this.prevChar() + this.ch) || isCH0()) {
					this.readChar();
					break;
				}
				this.readChar();
			}
			const raw: string = this.chars.slice(position, this.position).join("");
			const lines = raw.split(/\n|\r\n/);
			const cntRow = lines.length - 1;
			let newColumn = 0;
			if (lines.length >= 2) newColumn = lines[lines.length - 1].length;
			else newColumn = column + raw.length;
			const location: ILocation = {
				begin: { row, column },
				end: { row: row + cntRow, column: newColumn },
			};
			this.textPoint = { row: row + cntRow, column: newColumn };
			return new Token(TokenType.string, location, raw);
		}
		return null;
	}

	private isLiteral(): boolean {
		if (this.ch === 0) {
			return false;
		} else {
			// grammarのように/[\w\p{Cn}`＠@]{1,59})([\w\p{Cn}`＠@]*/が使えたら楽だった…
			// と思っていたらES2018から使えるみたいです！ ( https://qiita.com/BlueSilverCat/items/dcea3121c7af83148f29#unicode-property-escapes )
			// 今のところのコンパイル先はES6なので、emoji-regexを使います。
			if (emojiRegex().test(this.ch)) {
				return true;
			} // emojiは識別子になれる。
			return !/[[\]<>{}()\-+/*\\¥&#$%^!?.,:;~=|"'\s0-9]/g.test(this.ch); // 記号と数字以外だから識別子になれる。
			// HSPの`は文字として扱う。@は名前空間名。
		}
	}

	private isLiteral2(): boolean {
		if (this.ch === 0) {
			return false;
		} else {
			if (emojiRegex().test(this.ch)) {
				return true;
			} // emojiは識別子になれる。
			return !/[[\]<>{}()\-+/*\\¥&#$%^!?.,;:~=|"'\s]/g.test(this.ch); // 記号と数字以外だから識別子になれる。
		}
	}

	/**
	 * 文字に関わるtokenを返すかもしれません。
	 */
	private readLiteral(): Token | null {
		if (this.isLiteral()) {
			const { row, column } = this.textPoint;
			const position = this.position;

			while (this.isLiteral2()) {
				this.readChar();
			}
			const raw = this.chars.slice(position, this.position).join("");
			const location: ILocation = {
				begin: { row, column },
				end: { row, column: column + raw.length },
			};

			this.textPoint = { row, column: column + raw.length };
			return new Token(TokenType.literal, location, raw);
		}
		return null;
	}
}

export function tokenizer(text: string): Token[] {
	const result: Token[] = [];
	const lexer = new Lexer(text);
	for (;;) {
		const token = lexer.nextToken();
		result.push(token);
		if (token.type === TokenType.eol) {
			break;
		}
	}
	return result;
}

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
			t.type === tok && t.raw === raw ? { symbol: t.raw } : undefined,
		);
	let dash = symbol(TokenType.operant, "-");
	let plus = symbol(TokenType.operant, "+");
	let asterisk = symbol(TokenType.operant, "*");
	let slash = symbol(TokenType.operant, "/");
	let backslash = satisfy((t) =>
		t.type === TokenType.operant && /¥|\\/.test(t.raw)
			? { symbol: t.raw }
			: undefined,
	);
	let right_angle = symbol(TokenType.operant, ">");
	let comma = symbol(TokenType.others, ",");
	let left_paren = symbol(TokenType.bracket, "(");
	let right_paren = symbol(TokenType.bracket, ")");
	let left_curly_brace = symbol(TokenType.bracket, "{");
	let right_curly_brace = symbol(TokenType.bracket, "}");
	let colon = satisfy((t) =>
		t.type === TokenType.others && t.raw === ":" ? ":" : undefined,
	);
	let sharp = type(TokenType.sharp);
	let newline = type(TokenType.newline);
	let eol = type(TokenType.eol);

	let literal = satisfy((t) =>
		t.type === TokenType.literal ? t.raw : undefined,
	);
	let keyword = (literal: string) =>
		satisfy((t) =>
			t.type === TokenType.literal && RegExp(literal, "i").test(t.raw)
				? t.raw.toLowerCase()
				: undefined,
		);
	let regKeyword = (literal: RegExp) =>
		satisfy((t) =>
			t.type === TokenType.literal && literal.test(t.raw)
				? t.raw.toLowerCase()
				: undefined,
		);

	let skip = map(
		many(choice(type(TokenType.space), type(TokenType.comment))),
		() => "skip",
	);

	let separator = map(
		seq(skip, choice(eol, newline, colon, left_curly_brace, right_curly_brace)),
		() => "separator",
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
			separator,
		),
		(r) => r.result[1],
	);

	let defined_label = choice(map(seq(skip, label), (r) => r.result[1]));

	let dire_space = filter(
		many(
			choice(
				type(TokenType.space),
				type(TokenType.comment),
				seq(backslash, newline),
			),
		),
		(r) => {
			for (let element of r.result) {
				if (element.type === TokenType.space) {
					return true;
				}
			}
			return false;
		},
	);

	let dire_skip = many(
		choice(
			type(TokenType.space),
			type(TokenType.comment),
			seq(backslash, newline),
		),
	);

	let dire_separator = map(
		seq(skip, choice(eol, newline)),
		() => "dire_separator",
	);

	let dire_define = map(
		seq(
			sharp,
			keyword("define"),
			dire_space,
			seq(
				option(seq(keyword("global"), dire_space)),
				option(seq(keyword("ctype"), dire_space)),
				map(literal, (r) => ({ location: r.location, literal: r.result })),
			),
			option(
				// マクロ引数
				seq(
					left_paren,
					many(choice(right_paren, any()), (r) => r.result === null), // anyだったら続く
					right_paren,
				),
			),
			many(
				// マクロ内容
				choice(dire_separator, seq(dire_skip, any())),
				(r) => r.result !== "dire_separator",
			),
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
		},
	);

	let dire_const = map(
		seq(
			sharp,
			keyword("const"),
			dire_space,
			seq(
				option(seq(keyword("global"), dire_space)),
				option(seq(keyword("double"), dire_space)),
				map(literal, (r) => ({ location: r.location, literal: r.result })),
			),
			many(
				choice(dire_separator, seq(dire_skip, any())),
				(r) => r.result !== "dire_separator",
			),
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
		},
	);

	let dire_enum = map(
		seq(
			sharp,
			keyword("enum"),
			dire_space,
			seq(
				option(seq(keyword("global"), dire_space)),
				map(literal, (r) => ({ location: r.location, literal: r.result })),
			),
			many(
				choice(dire_separator, seq(dire_skip, any())),
				(r) => r.result !== "dire_separator",
			),
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
		},
	);

	let dire_module_variable = map(
		many(choice(seq(literal, dire_skip, comma), literal, dire_separator)),
		() => null,
	);

	let literal_for_module_string_type = satisfy((t) =>
		t.type === TokenType.string ? t.raw : undefined,
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
					option(seq(dire_space, dire_module_variable)),
				),
				seq(
					// #module"name"
					dire_skip,
					map(literal_for_module_string_type, (r) => ({
						location: r.location,
						literal: r.result,
					})),
					option(seq(dire_skip, dire_module_variable)),
				),
			),
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
		},
	);

	let dire_global = map(
		seq(
			map(seq(sharp, keyword("global")), (r) => ({ location: r.location })),
			dire_skip,
			dire_separator,
		),
		(r) =>
			<IOutlineElement>{
				kind: kinds.global,
				literal: "global",
				position: {
					literal: [r.result[0].location[1], r.result[0].location[2]],
					entire: [r.location[1], r.location[2]],
				},
			},
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
				(r) => r.result !== "dire_separator",
			),
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
		},
	);

	let dire_modinit = map(
		seq(
			map(seq(sharp, keyword("modinit")), (r) => ({ location: r.location })),
			many(
				choice(dire_separator, seq(dire_skip, any())),
				(r) => r.result !== "dire_separator",
			),
		),
		(r) =>
			<IOutlineElement>{
				kind: kinds.modinit,
				literal: "modinit",
				position: {
					literal: [r.result[0].location[1], r.result[0].location[2]],
					entire: [r.location[1], r.location[2]],
				},
			},
	);

	let dire_modterm = map(
		seq(
			map(seq(sharp, keyword("modterm")), (r) => ({ location: r.location })),
			many(
				choice(dire_separator, seq(dire_skip, any())),
				(r) => r.result !== "dire_separator",
			),
		),
		(r) =>
			<IOutlineElement>{
				kind: kinds.modterm,
				literal: "modterm",
				position: {
					literal: [r.result[0].location[1], r.result[0].location[2]],
					entire: [r.location[1], r.location[2]],
				},
			},
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
				(r) => r.result !== "dire_separator",
			),
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
		},
	);

	let dire_cmd = map(
		seq(
			sharp,
			keyword("cmd"),
			dire_space,
			map(literal, (r) => ({ location: r.location, literal: r.result })),
			many(
				choice(dire_separator, seq(dire_skip, any())),
				(r) => r.result !== "dire_separator",
			),
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
		},
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
			seq(skip, dire_cmd),
		),
		(r) => (r.success ? r.result[1] : undefined),
	);

	let any_statement = map(
		seq(
			many(choice(separator, any()), (r) => r.result === null),
			separator,
		),
		() => null,
	);

	let statement = map(
		many(choice(directive, defined_label, any_statement)),
		(r) => r.result.filter((o: any) => o),
	);

	return statement(tokens, 0);
}
