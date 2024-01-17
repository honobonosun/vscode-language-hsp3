export interface IPoint {
	row: number;
	column: number;
}

export interface ILocation {
	begin: IPoint;
	end: IPoint;
}

export enum TokenType {
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
