import vscode from "vscode";

export function activate(context: vscode.ExtensionContext): void {
  vscode.window.showErrorMessage("activate web-mode vscode-language-hsp3");
  console.log("activate web-mode vscode-language-hsp3");

  let curLineCommentChar = ";";

  const onDidChangeConfiguration = () => {
    const cfg = vscode.workspace.getConfiguration("vscode-language-hsp3");
    const lineCommentChar = cfg.get<string>("line-comment");
    if (lineCommentChar !== curLineCommentChar) {
      curLineCommentChar = lineCommentChar ?? ";";
    }
  };
}

export function deactivate(): void {
  console.log("deactivate web-mode language-hsp3");
}
