import * as vscode from "vscode";
import path from "path";
import type { ExecutorInstance } from "../executor";
// terminalManager は executor 内で利用されます
import type { ToolsetInstance } from "../toolset";
import { parseArgs } from "../utils/argParser";

export function createRunWithArgsCommand(
  executor: ExecutorInstance,
  toolset: ToolsetInstance
): (editor: vscode.TextEditor) => void {
  return async (editor) => {
    const doc = editor.document;
    if (doc.isDirty) return; // todo: 未保存を通知

    const filePath = doc.fileName;
    // 入力ボックスのデフォルト引数を取得
    const defaultOpts = toolset.getExecutionParams("run", filePath);
    if (!defaultOpts) return; // todo: 未選択をユーザーへ通知

    const input =
      (await vscode.window.showInputBox({
        prompt: "実行時の引数を入力してください",
        value: defaultOpts.args.join(" "),
      })) ?? "";

    const parts = parseArgs(input);
    // カスタム引数で実行オプションを生成
    const execOpts = toolset.getExecutionParams("run", filePath, parts);
    if (!execOpts) return; // todo: 未選択をユーザーへ通知
  };
}
