import * as vscode from "vscode";
import type { ExecutorInstance } from "../executor";
import type { ToolsetInstance } from "../toolset";
import { LoggerInstance } from "../../common/logger";

export function createRunCommand(
  executor: ExecutorInstance,
  toolset: ToolsetInstance,
  logger: LoggerInstance
): (editor: vscode.TextEditor) => void {
  return async (editor) => {
    const log = logger.section("run-command");

    try {
      // エディターからファイルパスを取得
      const filePath = editor.document.uri.fsPath;
      log.debug(`Executing run command for file: ${filePath}`);

      // ファイルが保存されていない場合は保存を促す
      if (editor.document.isDirty) {
        const save = await vscode.window.showInformationMessage(
          "ファイルが保存されていません。保存してから実行しますか？",
          "保存して実行",
          "キャンセル"
        );
        if (save === "保存して実行") {
          await editor.document.save();
        } else {
          return;
        }
      }

      // executorでrun実行
      const terminalId = await executor.executeRun({ filePath });

      if (terminalId) {
        log.info(
          `Run command executed successfully. Terminal ID: ${terminalId}`
        );
        vscode.window.showInformationMessage(
          `HSP3プログラムの実行を開始しました (${terminalId})`
        );
      } else {
        vscode.window.showErrorMessage("HSP3プログラムの実行に失敗しました");
      }
    } catch (error) {
      log.error(`Run command failed: ${error}`);
      vscode.window.showErrorMessage(
        `HSP3プログラムの実行に失敗しました: ${error}`
      );
    }
  };
}
