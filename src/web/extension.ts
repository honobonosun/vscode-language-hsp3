import vscode from "vscode";
import { LANG_ID } from "../common/constant";

let resource: vscode.Disposable | undefined = undefined;

export function activate(context: vscode.ExtensionContext): void {
  vscode.window.showErrorMessage("activate web-mode vscode-language-hsp3");
  console.log("activate web-mode vscode-language-hsp3");

  let currentLineComment = ";";

  const onDidChangeConfiguration = () => {
    const config = vscode.workspace.getConfiguration("vscode-language-hsp3");
    const lineComment = config.get<string>("line-comment");
    if (lineComment !== currentLineComment) {
      currentLineComment = lineComment ?? ";";
      if (resource) resource.dispose();
      resource = vscode.languages.setLanguageConfiguration(LANG_ID, {
        comments: { lineComment },
      });
    }
  };

  onDidChangeConfiguration();
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      onDidChangeConfiguration();
    })
  );
}

export function deactivate(): void {
  console.log("deactivate web-mode language-hsp3");
  if (resource) resource.dispose();
}
