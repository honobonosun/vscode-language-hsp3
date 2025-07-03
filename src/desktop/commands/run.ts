import * as vscode from "vscode";
import path from "path";
import type { ExecutorInstance } from "../executor";
// terminalManager は executor 内で利用されます
import type { ToolsetInstance } from "../toolset";
import { PseudoTerminal } from "../terminal/PseudoTerminal";
import { LoggerInstance } from "../../common/logger";

export function createRunCommand(
  executor: ExecutorInstance,
  toolset: ToolsetInstance,
  logger: LoggerInstance
): (editor: vscode.TextEditor) => void {
  return async (editor) => {
    const doc = editor.document;
    if (doc.isDirty) return; // todo: 未保存を通知

    const filePath = doc.fileName;
    // 共通化したツールセットから実行オプションを取得
    const execOpts = toolset.getExecutionParams("run", filePath);
    if (!execOpts) return; // todo: 未選択をユーザーへ通知

    // PseudoTerminal でコマンドを実行
    if (execOpts.mode === "direct") {
      new PseudoTerminal(
        logger,
        execOpts.command,
        execOpts.args,
        execOpts.cwd,
        execOpts.env
      );
    } else {
      const { shellPath, shellArgs, cwd, env, command, args } = execOpts;
      if (!shellPath || !shellArgs) {
        return;
      }
      const pt = new PseudoTerminal(logger, shellPath, shellArgs, cwd, env);
      pt.sendText([command, ...args].join(" "), true);
    }
  };
}
