import * as vscode from "vscode";
import path from "path";
import type { ExecutorInstance } from "../executor";
// terminalManager は executor 内で利用されます
import type { ToolsetInstance } from "../toolset";

export function createMakeCommand(
  executor: ExecutorInstance,
  toolset: ToolsetInstance
): (editor: vscode.TextEditor) => void {
  return async (editor) => {
    const doc = editor.document;
    if (doc.isDirty) return; // todo: 未保存を通知

    const filePath = doc.fileName;
    // 共通化したツールセットから実行オプションを取得
    const execOpts = toolset.getExecutionParams("make", filePath);
    if (!execOpts) return; // todo: 未選択をユーザーへ通知
  };
}
