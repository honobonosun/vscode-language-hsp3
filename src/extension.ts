import * as vscode from "vscode";
import Legacy from "./legacy";

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
    this.outcha = vscode.window.createOutputChannel("HSP", "hsp3");
    this.cfg = vscode.workspace.getConfiguration("language-hsp3");

    // config
    vscode.workspace.onDidChangeConfiguration(
      (e) => {
        if (e.affectsConfiguration("language-hsp3"))
          this.cfg = vscode.workspace.getConfiguration("language-hsp3");
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
    this.subscription.forEach((el) => el.dispose());
    this.outcha.dispose();
    return;
  }
}
