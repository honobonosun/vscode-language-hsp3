import * as vscode from "vscode";
import Legacy from "./legacy";
import { HSP3_LANG_ID, MY_CONFIG_SECTION, OUTCHA_NAME_MAIN } from "./constants";

export function activate(context: vscode.ExtensionContext): void {
	const extension = new Extension();
	context.subscriptions.push(extension);
	return;
}

export function deactivate(): void {
	console.log("language-hsp3 deactivate.");
}

class Extension implements vscode.Disposable {
	subscription: vscode.Disposable[] = [];
	outcha: vscode.OutputChannel; // is created first and closed last.
	cfg: vscode.WorkspaceConfiguration;
	legacy: Legacy;

	constructor() {
		this.outcha = vscode.window.createOutputChannel(
			OUTCHA_NAME_MAIN,
			HSP3_LANG_ID,
		);
		this.cfg = vscode.workspace.getConfiguration(MY_CONFIG_SECTION);

		// config
		vscode.workspace.onDidChangeConfiguration(
			(e) => {
				if (e.affectsConfiguration(MY_CONFIG_SECTION))
					this.cfg = vscode.workspace.getConfiguration(MY_CONFIG_SECTION);
			},
			this,
			this.subscription,
		);

		// Legacy module
		this.legacy = new Legacy();

		// commands
		this.subscription.push(
			vscode.commands.registerCommand(
				"language-hsp3.run",
				() => {
					this.legacy.execution.run();
				},
				this,
			),
			vscode.commands.registerCommand(
				"language-hsp3.make",
				() => {
					this.legacy.execution.make();
				},
				this,
			),
			vscode.commands.registerCommand(
				"language-hsp3.helpman.search",
				() => {
					this.legacy.execution.helpman();
				},
				this,
			),
		);
	}

	dispose() {
		this.legacy.dispose();
		for (const elm of this.subscription) elm.dispose();
		this.outcha.dispose();
		return;
	}
}
