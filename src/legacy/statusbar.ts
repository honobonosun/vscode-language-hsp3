import * as vscode from "vscode";
import Config from "./config";

export default class Statusbar {
  public statusbar: vscode.StatusBarItem;

  constructor() {
    this.statusbar = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      0,
    );
    this.statusbar.command = "language-hsp3.changeOfExecutor";
    return;
  }

  public dispose(): void {
    this.statusbar.dispose();
  }

  public showQuickPick(config: Config): void {
    const option: vscode.QuickPickOptions = {
      matchOnDescription: true,
    };
    vscode.window
      .showQuickPick(config.getCompilerItems(), option)
      .then((value) => {
        if (!value) {
          return;
        }
        config.update("executor.index", value.label).then(() => {
          setTimeout(() => {
            this.update(config);
          }, 10); // なぜかコールバックさせないと画面に反映されない。
        });
      });
  }

  private check(config: Config): boolean {
    if (!config.hasExecutorIndex(config.getCommandName())) {
      vscode.window
        .showWarningMessage(
          `Due to a configuration change, the "${config.getCommandName()}" compiler does not exist. Please reconfigure the compiler you want to use.`,
          "Reconfigure",
        )
        .then((result) => {
          if (result === "Reconfigure") {
            this.showQuickPick(config);
          }
        });
      return true;
    } else {
      return false;
    }
  }

  public update(config: Config): void {
    config.refresh();
    if (config.useExecutor()) {
      const editor = vscode.window.activeTextEditor;
      if (editor && editor.document.languageId === "hsp3") {
        config.refresh(editor.document.uri);
        if (this.check(config)) {
          return;
        }
        this.statusbar.text = config.getCommandName();
        this.statusbar.tooltip = config.getCompilerPath();
        this.statusbar.show();
        return;
      }
    }
    this.statusbar.hide();
  }
}
