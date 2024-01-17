import * as vscode from "vscode";
import { exec } from "child_process";
import Config from "./config";
import opener = require("opener");

function editorGetWord(textEditor: vscode.TextEditor): string {
	const selection = textEditor.selection;
	const seltext = textEditor.document.getText(
		new vscode.Range(selection.active, selection.anchor),
	);
	if (seltext !== "") {
		return seltext;
	} else {
		const position = textEditor.selection.start;
		const wordRange = textEditor.document.getWordRangeAtPosition(
			position,
			RegExp(
				"(-?\\d*\\.\\d\\w*)|([^\\`\\~\\!\\%\\^\\&\\*\\(\\)\\-\\=\\+\\[\\{\\]\\}\\\\\\|\\;\\:\\'\\\"\\,\\.\\<\\>\\/\\?\\s]+)",
			),
		);
		return textEditor.document.getText(wordRange);
	}
}

export function helpmanCall(textEditor: vscode.TextEditor): void {
	let word = editorGetWord(textEditor);
	if (word.length >= 60) {
		word = word.substr(60); // 日本語を未選択で選択すると全文取得するので、60文字制限をかけます。
	}
	const config = new Config(textEditor.document.uri);
	const mode = config.get("helpman.enable");
	if (mode === "disable") {
		return;
	}
	if (mode === "local") {
		const cmd = `"${config.helpman()}" ${word}`;
		exec(cmd, (err) => {
			if (err) {
				vscode.window.showErrorMessage("The Helpman call failed.");
				console.log(err);
			}
		});
	}
	if (mode === "online") {
		const url = config.get("helpman.path.online") as string;
		opener(url.replace("%s", encodeURIComponent(word)));
	}
}
