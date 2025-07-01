import * as vscode from "vscode";
import type { ConfigInstance } from "../../common/config";
import type { ExecutorInstance } from "../executor";

export function createRunCommand(
  config: ConfigInstance,
  executor: ExecutorInstance
): (editor: vscode.TextEditor) => void {
  return (editor) => {
    // ここに「language-hsp3.run」の実行ロジックを書く
  };
}
