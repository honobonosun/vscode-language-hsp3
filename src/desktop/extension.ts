"use strict";

import * as vscode from "vscode";
import createConfig from "../common/config";
import { createLanguageConfigurationManager } from "../common/langCfg";
import { EXTENSION_ID, LANGUAGE_ID, OUTPUT_NAME } from "../common/constant";
import createLogger, { LogLevel } from "../common/log";
import { terminalManager } from "./terminal";
import createExecutor from "./executor";
import * as path from "path";
import * as fs from "fs";

function buildingMessage(): vscode.Disposable {
  return vscode.window.setStatusBarMessage(`$(zap)Running"}`);
}

/**
 * 安全に現在開いているエディタのuriを取得します。
 */
function safeUri(fileUri: vscode.Uri): vscode.Uri {
  if (fileUri) {
    return fileUri;
  }
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    throw new Error("No active editor exists.");
  }
  if (editor.document.isUntitled) {
    throw new Error("Editor content not saved in file.");
  }
  // 未保存の場合、通知する。
  if (editor.document.isDirty) {
    vscode.window.showInformationMessage(
      "Changes to the editor have not been saved to the [" +
        editor.document.uri.fsPath +
        "] file."
    );
  }
  return editor.document.uri;
}

export function activate(context: vscode.ExtensionContext): void {
  if (context.extensionMode === vscode.ExtensionMode.Development)
    console.log("activate vscode-language-hsp3");

  const logger = createLogger(OUTPUT_NAME);
  const config = createConfig(EXTENSION_ID);
  context.subscriptions.push(logger, config);

  const { log } = logger.section("launcher");
  const executor = createExecutor();

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "language-hsp3.run",
      async (fileUri: vscode.Uri) => {
        try {
          const targetUri = safeUri(fileUri);
          const filePath = targetUri.fsPath;
          const fileName = path.basename(filePath, path.extname(filePath));
          const workDir = path.dirname(filePath);

          // HSP3コンパイラの設定を取得
          const hspConfig = "-R";
          const hspcPath = "hspc.exe";

          log(LogLevel.Info, `Running HSP3 compilation: ${filePath}`);

          // ターミナル名を生成
          const terminalName = `HSP: ${fileName}`;

          // 既存のターミナルがあれば再利用、なければ新規作成
          let terminal, stream;
          if (terminalManager.hasTerminal(terminalName)) {
            ({ terminal, stream } = terminalManager.getTerminal(terminalName));
            stream.cancelKeyWait();
          } else {
            ({ terminal, stream } = terminalManager.createTerminal({
              name: terminalName,
              iconPath: new vscode.ThemeIcon("play"),
              showOnCreate: true,
            }));
          }

          // hspcコマンドを実行
          const result = await executor.execute(
            stream,
            {
              command: hspcPath,
              args: ["-R", filePath],
              cwd: workDir,
              encoding: "utf8",
            },
            terminalName
          );

          if (result.exitCode === 0) {
            log(LogLevel.Info, "HSP compilation completed successfully");
            stream.writeLine("✅ Compilation completed successfully!");
            // 実行ファイルが生成されているかチェック
            const exePath = path.join(workDir, fileName + ".exe");
            if (fs.existsSync(exePath)) {
              if (fs.existsSync(exePath)) {
                stream.writeLine(`📁 Output: ${exePath}`);
              }
            } else {
              log(
                LogLevel.Error,
                `HSP compilation failed with exit code: ${result.exitCode}`
              );
              stream.writeError("❌ Compilation failed!");
            }
          }
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          log(LogLevel.Error, `Failed to run HSP: ${message}`);
          vscode.window.showErrorMessage(`HSP3実行エラー: ${message}`);
        }
      }
    ),
    vscode.commands.registerCommand(
      "language-hsp3.make",
      (fileUri: vscode.Uri) => {
        log(LogLevel.Warn, "make");
      }
    ),
    vscode.commands.registerCommand(
      "language-hsp3.RunWithArgs",
      (fileUri: vscode.Uri) => {}
    ),
    // Executorのクリーンアップを追加
    {
      dispose: () => {
        executor.dispose();
        terminalManager.dispose();
      },
    }
  );

  //const outline = new Outline(config);
  //context.subscriptions.push(outline);

  // 一行コメント記号の設定変更に追従する。
  const langConfigManager = createLanguageConfigurationManager(
    LANGUAGE_ID,
    EXTENSION_ID
  );
  langConfigManager.updateConfiguration();
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration(EXTENSION_ID))
        langConfigManager.updateConfiguration();
    }),
    langConfigManager
  );
}

// this method is called when your extension is deactivated
export function deactivate(): void {
  console.log("language-hsp3 deactivate.");
}
