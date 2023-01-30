"use strict";

import * as vscode from "vscode";
import { execution } from "./executor";
import { decode } from "./decode";
import Outline from "./outline";
import Statusbar from "./statusbar";
import Config from "./config";
import { helpmanCall } from "./helpman";

/**
 * 指定されたoutputにコンパイラの標準出力をconfigに基づいてデコードして表示します。
 * @param variable execution関数の返り値
 * @param output vscode.OutputChannelのインスタンス変数
 * @param config vscode.WorkspaceConfigurationのインスタンス変数
 */
function outputWrite(
  variable: any,
  output: vscode.OutputChannel,
  config: Config
): void {
  output.clear();
  if (variable.name === "Error") {
    output.appendLine("# Execution command failed.");
    vscode.window.showErrorMessage("Failed");
  } else {
    vscode.window.showInformationMessage("Success");
  }
  let stdout;
  let stderr;
  try {
    if (variable.stdout !== undefined) {
      stdout = decode(variable.stdout, config.encoding());
      if (stdout !== "") {
        output.appendLine(stdout);
      }
    }
    if (variable.stderr !== undefined) {
      stderr = decode(variable.stderr, config.encoding());
      if (stderr !== "") {
        output.appendLine(stderr);
      }
    }
  } catch (e) {
    output.appendLine("Failed, 'encoding' is not set config.");
  } finally {
    output.show();
  }
}

function buildingMessage(config: Config): vscode.Disposable {
  if (config.useExecutor()) {
    return vscode.window.setStatusBarMessage(
      `$(zap)Running ${config.getCommandName()}`
    );
  } else {
    return vscode.window.setStatusBarMessage("$(zap)Building...");
  }
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
      `Changes to the editor have not been saved to the [${editor.document.uri.fsPath}] file.`
    );
  }
  return editor.document.uri;
}

export function activate(context: vscode.ExtensionContext): void {
  const config = new Config(null);

  const output = vscode.window.createOutputChannel("HSP");

  const run = vscode.commands.registerCommand(
    "language-hsp3.run",
    (fileUri: vscode.Uri) => {
      let uri: vscode.Uri;
      try {
        uri = safeUri(fileUri);
      } catch (e) {
        console.log(e);
        output.appendLine((e as Error).message);
        return;
      }
      config.refresh(uri);
      const mes = buildingMessage(config);
      execution(uri.fsPath, "run", config)
        .then(result => {
          outputWrite(result, output, config);
          mes.dispose();
        })
        .catch(err => {
          outputWrite(err, output, config);
          mes.dispose();
        });
    }
  );

  const make = vscode.commands.registerCommand(
    "language-hsp3.make",
    (fileUri: vscode.Uri) => {
      let uri: vscode.Uri;
      try {
        uri = safeUri(fileUri);
      } catch (e) {
        console.log(e);
        output.appendLine((e as Error).message);
        return;
      }
      config.refresh(uri);
      const mes = buildingMessage(config);
      execution(uri.fsPath, "make", config)
        .then(result => {
          outputWrite(result, output, config);
          mes.dispose();
        })
        .catch(err => {
          outputWrite(err, output, config);
          mes.dispose();
        });
    }
  );

  context.subscriptions.push(run);
  context.subscriptions.push(make);
  context.subscriptions.push(output);

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "language-hsp3.RunWithArgs",
      (fileUri: vscode.Uri) => {
        vscode.window.showInputBox({ password: false, value: "" }).then(v => {
          let uri: vscode.Uri;
          try {
            uri = safeUri(fileUri);
          } catch (e) {
            console.log(e);
            output.appendLine((e as Error).message);
            return;
          }
          config.refresh(uri);
          const mes = buildingMessage(config);
          execution(uri.fsPath, "run", config, v)
            .then(result => {
              outputWrite(result, output, config);
              mes.dispose();
            })
            .catch(err => {
              outputWrite(err, output, config);
              mes.dispose();
            });
        });
      }
    )
  );

  const outline = new Outline(config);
  context.subscriptions.push(outline);

  const statusbar = new Statusbar();
  statusbar.update(config);
  context.subscriptions.push(statusbar);
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(() => statusbar.update(config))
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("language-hsp3.changeOfExecutor", () =>
      statusbar.showQuickPick(config)
    )
  );

  /*
  let viewColumn: vscode.ViewColumn = vscode.window.activeTextEditor
    ? vscode.window.activeTextEditor.viewColumn
      ? vscode.window.activeTextEditor.viewColumn
      : 1
    : 1;
  const panel = vscode.window.createWebviewPanel(
    "helpman",
    "untitled",
    viewColumn,
    {
      enableScripts: true,
      retainContextWhenHidden: true
    }
  );
  panel.webview.html = "hello";
  */

  context.subscriptions.push(
    vscode.commands.registerCommand("language-hsp3.helpman.search", () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;
      helpmanCall(editor);
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(() => {
      statusbar.update(config);
      outline.update(config);
    })
  );
}

// this method is called when your extension is deactivated
export function deactivate(): void {
  console.log("language-hsp3 deactivate.");
}
