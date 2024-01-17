import { ExecutorBody } from "./config";

const is = {
	string: (v: any): boolean =>
		Object.prototype.toString.call(v) === "[object String]",
	number: (v: any): boolean =>
		Object.prototype.toString.call(v) === "[object Number]",
	boolean: (v: any): boolean =>
		Object.prototype.toString.call(v) === "[object Boolean]",
	null: (v: any): boolean =>
		Object.prototype.toString.call(v) === "[object Null]",
	symbol: (v: any): boolean =>
		Object.prototype.toString.call(v) === "[object Symbol]",
	undefined: (v: any): boolean =>
		Object.prototype.toString.call(v) === "[object Undefined]",
	object: (v: any): boolean =>
		Object.prototype.toString.call(v) === "[object Object]",
	array: (v: any): boolean => Array.isArray(v),
};

/**
 * この関数は設定を精査します。不具合を見つけると例外を投げます。
 * @param config
 */
export default function validate(executor: ExecutorBody): void {
	if (!("enable" in executor)) {
		throw new Error("language-hsp3.executor.enable property is required.");
	}
	if (!is.boolean(executor.enable)) {
		throw new Error(
			"language-hsp3.executor.enable property must be of type boolean.",
		);
	}

	if (!("index" in executor)) {
		throw new Error("language-hsp3.executor.index property is required.");
	}
	if (!is.string(executor.index)) {
		throw new Error(
			"language-hsp3.executor.index property must be of type boolean.",
		);
	}

	if (!("paths" in executor)) {
		throw new Error("language-hsp3.executor.paths property is required.");
	}
	if (!is.object(executor.paths)) {
		throw new Error(
			"language-hsp3.executor.paths property requires a structure.",
		);
	}

	for (let name in executor.paths) {
		const struct = executor.paths[name];

		name = `"${name}"`;

		if ("hide" in struct) {
			if (!is.boolean(struct.hide)) {
				throw new Error(
					`language-hsp3.executor.paths.${name}.hide property must be of type boolean.`,
				);
			} else {
				if (struct.hide) {
					continue;
				} // 隠してるなら精査しない。
			}
		}

		if (!("path" in struct)) {
			throw new Error(
				`language-hsp3.executor.paths.${name}.path property is required.`,
			);
		}
		if (!is.string(struct.path)) {
			throw new Error(
				`language-hsp3.executor.paths.${name}.path mast be of type string.`,
			);
		}

		if (!("encoding" in struct)) {
			throw new Error(
				`language-hsp3.executor.paths.${name}.encoding property is required.`,
			);
		}
		if (!is.string(struct.encoding)) {
			throw new Error(
				`language-hsp3.executor.paths.${name}.encoding mast be of type string.`,
			);
		}

		if (!("buffer" in struct)) {
			throw new Error(
				`language-hsp3.executor.paths.${name}.buffer property is required.`,
			);
		}
		if (!is.number(struct.buffer)) {
			throw new Error(
				`language-hsp3.executor.paths.${name}.buffer mast be of type number.`,
			);
		}

		if (!("commands" in struct)) {
			throw new Error(
				`language-hsp3.executor.paths.${name}.commands property is required.`,
			);
		}
		if (!is.object(struct.commands)) {
			throw new Error(
				`language-hsp3.executor.paths.${name}.commands mast be of type object.`,
			);
		}

		if (!("helpman" in struct)) {
			throw new Error(
				`language-hsp3.executor.paths.${name}.helpman property is required.`,
			);
		}
		if (!is.string(struct.helpman)) {
			throw new Error(
				`language-hsp3.executor.paths.${name}.helpman mast be of type string.`,
			);
		}

		if (!("run" in struct.commands)) {
			throw new Error(
				`language-hsp3.executor.paths.${name}.commands.run property is required.`,
			);
		}
		if (!("make" in struct.commands)) {
			throw new Error(
				`language-hsp3.executor.paths.${name}.commands.make property is required.`,
			);
		}

		for (let cmdname in struct.commands) {
			const command = struct.commands[cmdname];
			cmdname = `"${cmdname}"`;
			if (!is.array(command)) {
				throw new Error(
					`language-hsp3.executor.paths.${name}.commands.${cmdname} mast be of type string[].`,
				);
			}
			for (const value of command) {
				if (!is.string(value)) {
					throw new Error(
						`language-hsp3.executor.paths.${name}.commands.${cmdname} mast be of type string.`,
					);
				}
			}
		}
	}

	return;
}
