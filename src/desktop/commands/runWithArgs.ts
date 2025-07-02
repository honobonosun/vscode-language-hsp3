import * as vscode from "vscode";
import path from "path";
import type { ExecutorInstance } from "../executor";
// terminalManager は executor 内で利用されます
import type { ToolsetInstance } from "../toolset";

export function createRunWithArgsCommand(
  executor: ExecutorInstance,
  toolset: ToolsetInstance
): (editor: vscode.TextEditor) => void {
  return async (editor) => {
    const doc = editor.document;
    if (doc.isDirty) {
      const saved = await doc.save();
      if (!saved) {
        return;
      }
    }
    const filePath = doc.fileName;
    // 入力ボックスのデフォルト引数を取得
    const defaultOpts = toolset.getExecutionOptions("run", filePath);
    if (!defaultOpts) return;
    const input = await vscode.window.showInputBox({
      prompt: "実行時の引数を入力してください",
      value: defaultOpts.args.join(" "),
    });
    if (!input) {
      return;
    }
    const parts = input.split(/\s+/).filter((s) => s.length > 0);
    // カスタム引数で実行オプションを生成
    const execOpts = toolset.getExecutionOptions("run", filePath, parts);
    if (!execOpts) return;
    const { command, args, cwd, env, encoding, mode, shellPath, shellArgs } =
      execOpts;
    const termName = `RunWithArgs: ${path.basename(filePath)}`;
    executor.execute({
      name: termName,
      command,
      args,
      cwd,
      env,
      encoding,
      mode,
      shellPath,
      shellArgs,
    });
  };
}
