import * as vscode from "vscode";
import path from "path";
import type { ExecutorInstance } from "../executor";
// terminalManager は executor 内で利用されます
import type { ToolsetInstance } from "../toolset";

export function createRunCommand(
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
    // 共通化したツールセットから実行オプションを取得
    const execOpts = toolset.getExecutionOptions("run", filePath);
    if (!execOpts) return;
    const { command, args, cwd, env, encoding, mode, shellPath, shellArgs } =
      execOpts;
    const termName = `Run: ${path.basename(filePath)}`;
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
